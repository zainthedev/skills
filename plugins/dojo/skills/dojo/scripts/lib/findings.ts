// The finding shape every validator returns and lint prints.

import { relative } from "node:path";

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  // Absolute path of the file the finding is about.
  file: string;
  // 1-based line number, 0 when the finding is about the whole file.
  line: number;
  rule: string;
  message: string;
}

export function finding(severity: Severity, file: string, line: number, rule: string, message: string): Finding {
  return { severity, file, line, rule, message };
}

// `error|warning <file>:<line> <rule>: <message>`, with the file shown
// relative to base when one is given.
export function formatFinding(f: Finding, base?: string): string {
  const file = base ? relative(base, f.file) || "." : f.file;
  return `${f.severity} ${file}:${f.line} ${f.rule}: ${f.message}`;
}

export function hasErrors(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === "error");
}
