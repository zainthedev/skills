// PreToolUse hook registered by /dojo:coach for the rest of the session (ADR 0002).
// Denies file edits and any shell command outside dojo's read-only scripts, so the
// coach cannot write the learner's code even when asked. Runs on Node 24+ or Bun.
import { basename } from "node:path";

type HookInput = {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
};

const WRITE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const READ_ONLY_SCRIPTS = /^\s*node\s+"?[^"\s]*\/scripts\/(next-item|lint|measure)\.ts"?(\s|$)/;
const REASON =
  "dojo coach guard: this session is read-only for the learner's files. " +
  "The coach asks questions and points at resources; it never writes code. " +
  "Start a new session for /dojo:next or /dojo:build.";

function deny(reason: string): void {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

function decide(input: HookInput): void {
  const tool = input.tool_name ?? "";
  const args = input.tool_input ?? {};
  if (WRITE_TOOLS.has(tool)) {
    const target = String(args["file_path"] ?? args["notebook_path"] ?? "");
    if (basename(target) === "quiz-log.md") return;
    deny(REASON);
  }
  if (tool === "Bash") {
    const command = String(args["command"] ?? "");
    if (READ_ONLY_SCRIPTS.test(command)) return;
    deny(REASON + " Shell commands are limited to dojo's read-only scripts.");
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let input: HookInput = {};
  try {
    input = JSON.parse(raw) as HookInput;
  } catch {
    process.exit(0);
  }
  decide(input);
  process.exit(0);
});
