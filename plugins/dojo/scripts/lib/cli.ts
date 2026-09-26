// Small helpers shared by every command line entry point: argument parsing,
// usage and failure output, and the "is this file the entry point" check.

import { parseArgs } from "node:util";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface OptionSpec {
  type: "string" | "boolean";
  short?: string;
  default?: string | boolean;
}

export interface ParsedArgs {
  values: Record<string, string | boolean | undefined>;
  positionals: string[];
}

// Parses argv against a spec. Always accepts --help and --json. Throws a
// plain Error with a one-line message on unknown or malformed options.
export function parseCli(argv: string[], options: Record<string, OptionSpec>): ParsedArgs {
  const spec: Record<string, OptionSpec> = {
    help: { type: "boolean", short: "h" },
    json: { type: "boolean" },
    ...options,
  };
  const parsed = parseArgs({ args: argv, options: spec, allowPositionals: true, strict: true });
  return { values: parsed.values as ParsedArgs["values"], positionals: parsed.positionals };
}

// Runs a command's main function, turning thrown errors into a one-line
// stderr message and a non-zero exit. `code` in the thrown error wins.
export async function runCli(main: () => Promise<number | void> | number | void): Promise<void> {
  try {
    const code = await main();
    process.exitCode = typeof code === "number" ? code : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`error: ${message.split("\n")[0]}\n`);
    const code = (error as { code?: unknown })?.code;
    process.exitCode = typeof code === "number" ? code : 1;
  }
}

export class CliError extends Error {
  code: number;
  constructor(message: string, code = 1) {
    super(message);
    this.code = code;
  }
}

export function fail(message: string, code = 1): never {
  throw new CliError(message, code);
}

// Values given as @path are read from that file; anything else is literal.
export function textOrFile(value: string, cwd = process.cwd()): string {
  if (value.startsWith("@")) {
    return readFileSync(resolve(cwd, value.slice(1)), "utf8").trim();
  }
  return value;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// True when the module at importMetaUrl is the script node or bun was
// started with, so a file can both export functions and act as a CLI.
export function isMain(importMetaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(resolve(entry)) === realpathSync(fileURLToPath(importMetaUrl));
  } catch {
    return false;
  }
}

export function requireString(values: ParsedArgs["values"], name: string): string {
  const value = values[name];
  if (typeof value !== "string" || value.length === 0) fail(`--${name} is required`, 2);
  return value;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
