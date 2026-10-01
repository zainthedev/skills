// PreToolUse hook registered on Claude Code for the rest of the session by dojo's coach, by
// mentor's reviewer and coach, and by lingo's coach, talk and reviewer (dojo ADRs 0002 and 0018,
// mentor ADRs 0001 and 0002, lingo ADR 0003). Every tool call passes through it.
// A short list of read-only tools is allowed; a shell command is allowed only when it is one plain
// call to a script on the guard's list, inside the skill folder that owns it, which reads the
// workspace or repository, or appends to or updates a record; a file tool is allowed only on a
// Markdown file inside a reviews directory, where a reviewer writes its review, or inside a lingo
// workspace's talk directory, where a talk session writes its record; everything else, MCP tools
// included, is denied. Any error, including unreadable input, exits 2, which Claude Code treats
// as a block, so a broken guard fails closed. Runs on Node 24+ or Bun.
//
// Vendored: dojo's skills/dojo/scripts/guard.ts, mentor's skills/mentor-review/scripts/guard.ts
// and skills/mentor/scripts/guard.ts, and lingo's skills/lingo/scripts/guard.ts are
// byte-identical, which mentor's and lingo's tests check, so each skill works while another's
// guard is active in the same session. Edit one, then copy it to the others.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parseFrontmatter } from "./lib/frontmatter.ts";
import { isDojoWorkspace } from "./lib/review.ts";

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
// The scripts each skill folder may run, keyed by the folder holding their scripts/ directory.
// quiz-log.ts writes one row to quiz-log.md, so a /dojo-quiz later in a guarded session can
// record its result; context.ts prints the quiz. review-scope.ts runs git and gh for the
// reviewer and creates the reviews directory; review-mark.ts updates one flag's row. lingo's
// quiz-log.ts also marks mistakes cleared, and talk-log.ts files a talk record's corrections.
export const GUARD_SCRIPTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["dojo", new Set(["next-item.ts", "lint.ts", "measure.ts", "context.ts", "quiz-log.ts"])],
  ["mentor-review", new Set(["review-scope.ts", "review-mark.ts", "review-lint.ts"])],
  ["lingo", new Set(["next-item.ts", "lint.ts", "measure.ts", "context.ts", "quiz-log.ts", "talk-log.ts"])],
]);
// File tools that may write a review, and only a review.
export const FILE_TOOLS: ReadonlySet<string> = new Set(["Write", "Edit", "MultiEdit"]);
// Anything that could chain, redirect, substitute or continue a command.
const SHELL_OPERATORS = /[;&|<>`$(){}\n\r\\]/;
const REASON =
  "Guard: this session is read-only for the learner's files. " +
  "The coach and the reviewer ask questions and point at resources; they never edit code. " +
  "Start a new session to edit files.";

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
  if (SHELL_OPERATORS.test(command)) return deny(`${REASON} Shell operators are not allowed; run one script per call.`);
  const parts = tokens(command);
  if (!parts || parts.length < 2) return deny(`${REASON} Shell commands are limited to the guard's scripts.`);
  const [runtime, script] = parts;
  if (runtime !== "node" && runtime !== "bun") return deny(`${REASON} Shell commands are limited to node or bun running one of the guard's scripts.`);
  if (script.startsWith("-")) return deny(`${REASON} Runtime flags are not allowed.`);
  let real: string;
  try {
    real = realpathSync(resolve(cwd, script));
  } catch {
    return deny(`${REASON} ${script} is not an existing script.`);
  }
  const name = basename(real);
  const owners = [...GUARD_SCRIPTS].filter(([, scripts]) => scripts.has(name)).map(([owner]) => owner);
  if (owners.length === 0) return deny(`${REASON} ${name} is not one of the guard's scripts (${[...new Set([...GUARD_SCRIPTS.values()].flatMap((s) => [...s]))].join(", ")}).`);
  const folder = basename(dirname(dirname(real)));
  if (basename(dirname(real)) !== "scripts" || !owners.includes(folder)) {
    return deny(`${REASON} ${real} is not inside the scripts directory of ${owners.map((o) => `the ${o} skill`).join(" or ")}.`);
  }
  return { allow: true };
}

// A lingo workspace is a directory whose profile.md has a lingo key in its frontmatter.
export function isLingoWorkspace(dir: string): boolean {
  const profile = join(dir, "profile.md");
  if (!existsSync(profile)) return false;
  try {
    const parsed = parseFrontmatter(readFileSync(profile, "utf8"));
    return parsed.hasFrontmatter && Object.prototype.hasOwnProperty.call(parsed.data, "lingo");
  } catch {
    return false;
  }
}

// A review is a .md file directly inside .mentor/reviews/, or inside reviews/ at a dojo or
// lingo workspace's root; a talk record is a .md file directly inside talk/ at a lingo
// workspace's root. The directory must exist, which review-scope.ts and lingo's init see to,
// and is resolved through symlinks, so a directory linked elsewhere is refused.
export function decideFile(filePath: string, cwd: string): Decision {
  if (filePath === "") return deny(`${REASON} The file tool named no file.`);
  if (!filePath.endsWith(".md")) return deny(`${REASON} File tools may only write a review or a talk record, a .md file in a reviews or talk directory.`);
  let dir: string;
  try {
    dir = realpathSync(dirname(resolve(cwd, filePath)));
  } catch {
    return deny(`${REASON} ${dirname(filePath)} does not exist; run review-scope.ts first, which creates the reviews directory.`);
  }
  const parent = dirname(dir);
  if (basename(dir) === "reviews" && (basename(parent) === ".mentor" || isDojoWorkspace(parent) || isLingoWorkspace(parent))) return { allow: true };
  if (basename(dir) === "talk" && isLingoWorkspace(parent)) return { allow: true };
  return deny(`${REASON} File tools may only write a review, in .mentor/reviews/ or a workspace's reviews/, or a talk record in a lingo workspace's talk/.`);
}

export function decide(input: HookInput): Decision {
  const tool = typeof input.tool_name === "string" ? input.tool_name : "";
  if (tool === "") return deny(`${REASON} The hook input named no tool.`);
  const args = input.tool_input && typeof input.tool_input === "object" ? (input.tool_input as Record<string, unknown>) : {};
  if (ALLOWED_TOOLS.has(tool)) return { allow: true };
  const cwd = typeof input.cwd === "string" && input.cwd !== "" ? input.cwd : process.cwd();
  if (tool === "Bash") return decideBash(String(args["command"] ?? ""), cwd);
  if (FILE_TOOLS.has(tool)) return decideFile(String(args["file_path"] ?? ""), cwd);
  return deny(`${REASON} ${tool} is not on the guard's allowed list.`);
}

function main(raw: string): number {
  let input: HookInput;
  try {
    input = JSON.parse(raw) as HookInput;
  } catch {
    process.stderr.write("guard: hook input is not JSON, so the call is blocked\n");
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
      process.stderr.write(`guard: ${(error as Error).message}; the call is blocked\n`);
      process.exitCode = 2;
    }
  });
}
