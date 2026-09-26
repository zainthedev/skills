// Parsing ledger.md and .dojo/fetched.jsonl, and the URL canonicalisation
// every comparison between them goes through.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ID_PATTERN, LEDGER_COLUMNS, LEDGER_TYPES } from "./constants.ts";
import { finding, type Finding } from "./findings.ts";
import { parseFrontmatter, type Frontmatter } from "./frontmatter.ts";
import { isSeparatorRow, isTableRow, splitRow } from "./syllabus.ts";

export interface LedgerRow {
  title: string;
  url: string;
  canonical: string;
  type: string;
  score: number | null;
  scoreRaw: string;
  endorsements: string;
  freshness: string;
  version: string;
  usedIn: string[];
  line: number;
  cells: string[];
}

export interface ExcludedRow {
  title: string;
  url: string;
  reason: string;
  line: number;
}

export interface Ledger {
  data: Frontmatter;
  header: string[] | null;
  headerLine: number;
  rows: LedgerRow[];
  excluded: ExcludedRow[];
  // The bullets under "## Notes", without the bullet marker.
  notes: string[];
  // Canonical URLs of every row in the table.
  urls: Set<string>;
}

const TRACKING = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid)$/i;

// Strip the fragment and tracking params, lowercase the host, drop a
// trailing slash. Unparseable input is returned trimmed.
export function canonicalUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING.test(key)) parsed.searchParams.delete(key);
  }
  let pathname = parsed.pathname.replace(/\/+$/, "");
  const search = parsed.searchParams.toString();
  return `${parsed.protocol}//${parsed.host.toLowerCase()}${pathname}${search ? "?" + search : ""}`;
}

const LINK = /^\[([^\]]*)\]\(([^)\s]+)\)\s*(.*)$/;

export function parseLedger(text: string): Ledger {
  const parsed = parseFrontmatter(text);
  const lines = text.split("\n");
  const rows: LedgerRow[] = [];
  const excluded: ExcludedRow[] = [];
  let header: string[] | null = null;
  let headerLine = 0;
  let inExcluded = false;
  let inNotes = false;
  const notes: string[] = [];
  let inFence = false;

  for (let i = parsed.frontmatterLines; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    const lineNo = i + 1;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      inExcluded = h2[1].trim().toLowerCase() === "excluded";
      inNotes = h2[1].trim().toLowerCase() === "notes";
      continue;
    }
    if (inNotes) {
      const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
      if (bullet) notes.push(bullet[1].trim());
      continue;
    }
    if (inExcluded) {
      const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
      if (bullet) {
        const link = LINK.exec(bullet[1].trim());
        if (link) {
          excluded.push({ title: link[1], url: link[2], reason: link[3].replace(/^:\s*/, ""), line: lineNo });
        } else {
          excluded.push({ title: bullet[1].trim(), url: "", reason: "", line: lineNo });
        }
      }
      continue;
    }
    if (!isTableRow(line)) continue;
    if (header === null) {
      if (i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
        header = splitRow(line);
        headerLine = lineNo;
        i++;
      }
      continue;
    }
    if (isSeparatorRow(line)) continue;
    const cells = splitRow(line);
    if (cells.every((c) => c === "")) continue;
    const link = LINK.exec(cells[0] ?? "");
    const url = link ? link[2] : /^https?:\/\//.test(cells[0] ?? "") ? cells[0] : "";
    const scoreRaw = cells[2] ?? "";
    rows.push({
      title: link ? link[1] : cells[0] ?? "",
      url,
      canonical: url ? canonicalUrl(url) : "",
      type: cells[1] ?? "",
      score: /^\d+$/.test(scoreRaw) ? Number(scoreRaw) : null,
      scoreRaw,
      endorsements: cells[3] ?? "",
      freshness: cells[4] ?? "",
      version: cells[5] ?? "",
      usedIn: (cells[6] ?? "")
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => s !== "" && s !== "-"),
      line: lineNo,
      cells,
    });
  }
  const urls = new Set(rows.filter((r) => r.canonical).map((r) => r.canonical));
  return { data: parsed.data, header, headerLine, rows, excluded, notes, urls };
}

export function ledgerHas(ledger: Ledger, url: string): boolean {
  return ledger.urls.has(canonicalUrl(url));
}

export function findRow(ledger: Ledger, url: string): LedgerRow | null {
  const canonical = canonicalUrl(url);
  return ledger.rows.find((r) => r.canonical === canonical) ?? null;
}

// One JSON object per line: {"url": ..., "fetched_at": ..., "item": ...}.
// Bare URL lines are accepted too. Malformed lines are skipped.
export function parseFetched(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    try {
      const record = JSON.parse(line) as { url?: unknown };
      if (typeof record?.url === "string") out.add(canonicalUrl(record.url));
    } catch {
      if (/^https?:\/\//.test(line)) out.add(canonicalUrl(line));
    }
  }
  return out;
}

export function fetchedPath(workspace: string): string {
  return join(workspace, ".dojo", "fetched.jsonl");
}

// Null when the file is missing.
export function readFetched(workspace: string): Set<string> | null {
  const path = fetchedPath(workspace);
  if (!existsSync(path)) return null;
  return parseFetched(readFileSync(path, "utf8"));
}

export function validateLedger(ledger: Ledger, file: string, knownIds?: Set<string>): Finding[] {
  const out: Finding[] = [];
  const err = (line: number, rule: string, message: string) => out.push(finding("error", file, line, rule, message));
  const warn = (line: number, rule: string, message: string) => out.push(finding("warning", file, line, rule, message));

  if (!("topic" in ledger.data)) warn(1, "ledger/frontmatter", 'missing frontmatter key "topic"');
  if (ledger.header === null) {
    err(1, "ledger/columns", "no resource table found");
  } else if (ledger.header.join(" | ") !== LEDGER_COLUMNS.join(" | ")) {
    err(ledger.headerLine, "ledger/columns", `columns must be exactly "${LEDGER_COLUMNS.join(" | ")}", got "${ledger.header.join(" | ")}"`);
  }
  const seen = new Map<string, number>();
  for (const row of ledger.rows) {
    if (row.cells.length !== LEDGER_COLUMNS.length) {
      err(row.line, "ledger/columns", `row has ${row.cells.length} cells, expected ${LEDGER_COLUMNS.length}`);
    }
    if (!row.url) {
      err(row.line, "ledger/resource", `resource cell must be [Title](url), got "${row.cells[0] ?? ""}"`);
    } else {
      if (/[?&](utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid)=/i.test(row.url) || row.url.includes("#")) {
        warn(row.line, "ledger/resource", `URL carries tracking parameters or a fragment; use ${row.canonical}`);
      }
      if (seen.has(row.canonical)) warn(row.line, "ledger/duplicate-url", `duplicate of the row at line ${seen.get(row.canonical)}`);
      seen.set(row.canonical, row.line);
    }
    if (!LEDGER_TYPES.includes(row.type)) err(row.line, "ledger/type", `type "${row.type}" must be one of ${LEDGER_TYPES.join(", ")}`);
    if (row.score === null || row.score < 0 || row.score > 100) err(row.line, "ledger/score", `score "${row.scoreRaw}" must be an integer from 0 to 100`);
    if (row.endorsements.trim() === "") warn(row.line, "ledger/endorsements", "empty endorsements cell; say where it was recommended");
    if (!/^\d{4}-\d{2}$/.test(row.freshness) && row.freshness !== "unknown") {
      err(row.line, "ledger/freshness", `freshness "${row.freshness}" must be YYYY-MM or unknown`);
    }
    if (row.version.trim() === "") err(row.line, "ledger/version", "empty version cell; use - when not applicable");
    for (const id of row.usedIn) {
      if (!ID_PATTERN.test(id)) err(row.line, "ledger/used-in", `"${id}" is not an item ID`);
      else if (knownIds && !knownIds.has(id)) warn(row.line, "ledger/used-in", `${id} is not in the syllabus`);
    }
  }
  // Fixable: the warning clears once Notes carries a "Thin evidence:" bullet
  // that says what was missing.
  if (ledger.data.thin_evidence === true && !ledger.notes.some((n) => /^thin evidence:\s*(?!none\b|not yet\b)\S/i.test(n))) {
    warn(1, "ledger/thin-evidence", 'thin_evidence is true; add "- Thin evidence: <what the scout could not find>" under Notes');
  }
  return out;
}
