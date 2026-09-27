// Parse and serialize the YAML subset the dojo formats use: string, number,
// boolean and date-like scalars, quoted strings, inline lists [a, b] and
// block lists (- item). Nothing nested beyond one list level. The body after
// the closing fence is returned untouched so round-trips preserve it byte
// for byte.

export type Scalar = string | number | boolean | null;
export type FrontmatterValue = Scalar | Scalar[];
export type Frontmatter = Record<string, FrontmatterValue>;

export interface ParsedDocument {
  data: Frontmatter;
  body: string;
  // True when the text opened with a frontmatter fence.
  hasFrontmatter: boolean;
  // Number of lines the frontmatter block occupies, fences included, so
  // callers can convert body line numbers to file line numbers.
  frontmatterLines: number;
}

const FENCE = /^---\s*$/;

export function parseFrontmatter(text: string): ParsedDocument {
  const lines = text.split("\n");
  if (lines.length === 0 || !FENCE.test(lines[0].replace(/\r$/, ""))) {
    return { data: {}, body: text, hasFrontmatter: false, frontmatterLines: 0 };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (FENCE.test(lines[i].replace(/\r$/, ""))) {
      end = i;
      break;
    }
  }
  if (end < 0) {
    return { data: {}, body: text, hasFrontmatter: false, frontmatterLines: 0 };
  }
  const data = parseYamlSubset(lines.slice(1, end).map((l) => l.replace(/\r$/, "")));
  const body = lines.slice(end + 1).join("\n");
  return { data, body, hasFrontmatter: true, frontmatterLines: end + 1 };
}

function parseYamlSubset(lines: string[]): Frontmatter {
  const data: Frontmatter = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    i++;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const match = /^([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(line);
    if (!match) {
      throw new Error(`frontmatter line ${i}: expected "key: value", got "${line}"`);
    }
    const key = match[1];
    const rest = (match[2] ?? "").trim();
    if (rest === "") {
      // Either an empty value or the start of a block list.
      const items: Scalar[] = [];
      let sawList = false;
      while (i < lines.length) {
        const next = lines[i];
        const item = /^\s*-\s+(.*)$/.exec(next);
        if (item) {
          items.push(parseScalar(item[1].trim()));
          sawList = true;
          i++;
        } else if (next.trim() === "" && sawList) {
          i++;
        } else {
          break;
        }
      }
      data[key] = sawList ? items : "";
    } else if (rest.startsWith("[")) {
      if (!rest.endsWith("]")) throw new Error(`frontmatter key ${key}: unterminated inline list`);
      data[key] = splitInlineList(rest.slice(1, -1)).map((s) => parseScalar(s.trim()));
    } else {
      data[key] = parseScalar(rest);
    }
  }
  return data;
}

function splitInlineList(inner: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"' && i + 1 < inner.length) {
        current += inner[++i];
      } else if (ch === quote) {
        quote = null;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "" || parts.length > 0) parts.push(current);
  return parts.filter((p, idx) => !(idx === parts.length - 1 && p.trim() === ""));
}

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

export function parseScalar(raw: string): Scalar {
  if (raw === "") return "";
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return raw
      .slice(1, -1)
      .replace(/\\(["\\/bfnrt])/g, (_, c: string) => ({ '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" })[c] ?? c);
  }
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null" || raw === "~") return null;
  if (DATE_LIKE.test(raw)) return raw;
  if (NUMBER.test(raw)) return Number(raw);
  return raw;
}

const SIMPLE_ITEM = /^[A-Za-z0-9_.-]{1,24}$/;

function needsQuotes(s: string): boolean {
  if (s === "") return true;
  if (s !== s.trim()) return true;
  if (/^[[\]{}#&*!|>'"%@`]/.test(s)) return true;
  if (/^[-?]\s/.test(s) || s === "-") return true;
  if (s.includes(": ") || s.endsWith(":") || s.includes(" #") || s.includes("\n")) return true;
  if (s === "true" || s === "false" || s === "null" || s === "~") return true;
  if (NUMBER.test(s)) return true;
  return false;
}

export function serializeScalar(value: Scalar): string {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!needsQuotes(value)) return value;
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"';
}

export function stringifyFrontmatter(data: Frontmatter): string {
  const out: string[] = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      const inline = value.every((v) => typeof v !== "string" || SIMPLE_ITEM.test(v));
      if (value.length === 0) {
        out.push(`${key}: []`);
      } else if (inline) {
        out.push(`${key}: [${value.map(serializeScalar).join(", ")}]`);
      } else {
        out.push(`${key}:`);
        for (const item of value) out.push(`  - ${serializeScalar(item)}`);
      }
    } else {
      out.push(`${key}: ${serializeScalar(value)}`);
    }
  }
  out.push("---");
  return out.join("\n") + "\n";
}

// Builds a document from data and body. The body is used verbatim.
export function withFrontmatter(data: Frontmatter, body: string): string {
  return stringifyFrontmatter(data) + body;
}

// Replaces or merges frontmatter keys, leaving the body untouched.
export function updateFrontmatter(text: string, changes: Frontmatter): string {
  const parsed = parseFrontmatter(text);
  return withFrontmatter({ ...parsed.data, ...changes }, parsed.body);
}

export function asString(value: FrontmatterValue | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((v) => (v === null ? "" : String(v))).join(", ");
  return String(value);
}

export function asNumber(value: FrontmatterValue | undefined): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && NUMBER.test(value.trim())) return Number(value);
  return null;
}

export function asList(value: FrontmatterValue | undefined): string[] {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map((v) => (v === null ? "" : String(v)));
  return [String(value)];
}
