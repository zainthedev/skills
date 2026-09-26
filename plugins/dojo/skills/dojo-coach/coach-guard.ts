// PreToolUse hook registered by dojo-coach on Claude Code for the rest of the session (ADR 0002).
// Every tool call passes through it. A short list of read-only tools is allowed; a shell command
// is allowed only when it is one plain call to a dojo script on the coach's list, which read
// the workspace or, for quiz-log.ts, append one row to the quiz log; everything else, file
// edits and MCP tools included, is denied. Any error, including unreadable input, exits 2, which Claude Code
// treats as a block, so a broken guard fails closed. Runs on Node 24+ or Bun.
import { realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

type HookInput = {
  tool_name?: unknown;
  tool_input?: unknown;
  cwd?: unknown;
};

export const ALLOWED_TOOLS: ReadonlySet<string> = new Set([
  "Read",
  "Grep",
  "Glob",
  "LS",
  "WebFetch",
  "WebSearch",
  "Skill",
  "TodoWrite",
  "AskUserQuestion",
  "ListMcpResourcesTool",
  "ReadMcpResourceTool",
]);
// quiz-log.ts writes one row to quiz-log.md and nothing else, so a /dojo-quiz later in a
// coach session can record its result; context.ts prints the quiz.
export const COACH_SCRIPTS: ReadonlySet<string> = new Set(["next-item.ts", "lint.ts", "measure.ts", "context.ts", "quiz-log.ts"]);
// Anything that could chain, redirect, substitute or continue a command.
const SHELL_OPERATORS = /[;&|<>`$(){}\n\r\\]/;
const REASON =
  "dojo coach guard: this session is read-only for the learner's files. " +
  "The coach asks questions and points at resources; it never writes code. " +
  "Start a new session for /dojo-next or /dojo-build.";

export type Decision = { allow: true } | { allow: false; reason: string };

function deny(reason: string): Decision {
  return { allow: false, reason };
}

// The tokens of a command that uses no shell syntax: whitespace-separated,
// with double or single quotes around a single token allowed.
function tokens(command: string): string[] | null {
  const out: string[] = [];
  for (const m of command.trim().matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) {
    const token = m[1] ?? m[2] ?? m[3];
    if (/["']/.test(token)) return null;
    out.push(token);
  }
  return out;
}

export function decideBash(command: string, cwd: string): Decision {
  if (SHELL_OPERATORS.test(command)) return deny(`${REASON} Shell operators are not allowed; run one dojo script per call.`);
  const parts = tokens(command);
  if (!parts || parts.length < 2) return deny(`${REASON} Shell commands are limited to the coach's dojo scripts.`);
  const [runtime, script] = parts;
  if (runtime !== "node" && runtime !== "bun") return deny(`${REASON} Shell commands are limited to node or bun running a dojo script.`);
  if (script.startsWith("-")) return deny(`${REASON} Runtime flags are not allowed.`);
  let real: string;
  try {
    real = realpathSync(resolve(cwd, script));
  } catch {
    return deny(`${REASON} ${script} is not an existing dojo script.`);
  }
  if (!COACH_SCRIPTS.has(basename(real))) return deny(`${REASON} ${basename(real)} is not one of the coach's scripts (${[...COACH_SCRIPTS].join(", ")}).`);
  if (basename(dirname(real)) !== "scripts" || basename(dirname(dirname(real))) !== "dojo") {
    return deny(`${REASON} ${real} is not inside the dojo skill's scripts directory.`);
  }
  return { allow: true };
}

export function decide(input: HookInput): Decision {
  const tool = typeof input.tool_name === "string" ? input.tool_name : "";
  if (tool === "") return deny(`${REASON} The hook input named no tool.`);
  const args = input.tool_input && typeof input.tool_input === "object" ? (input.tool_input as Record<string, unknown>) : {};
  if (ALLOWED_TOOLS.has(tool)) return { allow: true };
  if (tool === "Bash") return decideBash(String(args["command"] ?? ""), typeof input.cwd === "string" && input.cwd !== "" ? input.cwd : process.cwd());
  return deny(`${REASON} ${tool} is not on the coach's allowed list.`);
}

function main(raw: string): number {
  let input: HookInput;
  try {
    input = JSON.parse(raw) as HookInput;
  } catch {
    process.stderr.write("dojo coach guard: hook input is not JSON, so the call is blocked\n");
    return 2;
  }
  const decision = decide(input);
  if (decision.allow) return 0;
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: decision.reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
  return 0;
}

const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(resolve(entry)) === realpathSync(new URL(import.meta.url).pathname);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    try {
      process.exitCode = main(raw);
    } catch (error) {
      process.stderr.write(`dojo coach guard: ${(error as Error).message}; the call is blocked\n`);
      process.exitCode = 2;
    }
  });
}
