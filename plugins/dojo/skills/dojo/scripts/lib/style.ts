// Mechanical style rules for authored prose: the word and phrase half of
// STYLE.md, which the model cannot be trusted to hold in its head and which a
// regex holds for free. The lists inherit Hardik Pandya's stop-slop (MIT,
// copyright 2025) and add the patterns Wikipedia's AI Cleanup project tracks
// (WP:AISIGNS), plus tells specific to tutorials and coaching. Structural
// judgement (voice, rhythm, false agency) stays in STYLE.md.

import type { Severity } from "./findings.ts";

export interface StyleFinding {
  line: number;
  rule: string;
  severity: Severity;
  message: string;
}

// Matched case-insensitively as whole words, apostrophe variants allowed.
export const PHRASES: readonly string[] = [
  // Throat-clearing openers.
  "here's the thing",
  "here is the thing",
  "here's what",
  "here's why",
  "here's how",
  "the truth is",
  "let me be clear",
  "to be honest",
  "i'll be honest",
  "it turns out",
  "the uncomfortable truth",
  "can we talk about",
  // Emphasis crutches.
  "full stop",
  "let that sink in",
  "this matters because",
  "make no mistake",
  "cannot be overstated",
  "can't be overstated",
  // Filler.
  "at its core",
  "at the end of the day",
  "it's worth noting",
  "it is worth noting",
  "worth noting",
  "when it comes to",
  "in a world where",
  "the reality is",
  "in today's",
  "needless to say",
  "it goes without saying",
  "as you can see",
  "it's important to note",
  "it is important to note",
  "important to note",
  "in the ever-evolving",
  "ever-evolving",
  "rapidly evolving",
  "fast-paced world",
  // Business jargon.
  "deep dive",
  "game-changer",
  "game changer",
  "lean into",
  "double down",
  "circle back",
  "moving forward",
  "on the same page",
  "take a step back",
  "low-hanging fruit",
  // Meta-commentary and tutorial tells.
  "in this lesson, we",
  "in this lesson we",
  "in this section, we",
  "in this section we",
  "in this project, we",
  "in this project we",
  "let's dive in",
  "let's dive into",
  "let's get started",
  "let's explore",
  "we'll explore",
  "we will explore",
  "let me walk you through",
  "as we'll see",
  "as we will see",
  "by the end of this lesson",
  "by the end of this section",
  "by the end of this project",
  "in summary",
  "in conclusion",
  "to sum up",
  "to summarize",
  "to summarise",
  "key takeaways",
  "key takeaway",
  "happy coding",
  "pro tip",
  "congratulations",
  "you've got this",
  "you got this",
  "buckle up",
  "without further ado",
  "learning journey",
  // Vague declaratives and attribution.
  "the reasons are structural",
  "the implications are significant",
  "the stakes are high",
  "the consequences are real",
  "experts argue",
  "experts agree",
  "industry reports",
  "observers have",
  "some critics argue",
  "many developers agree",
  "it is widely believed",
  "it's widely believed",
  "studies show",
  // Canned significance.
  "is a testament to",
  "serves as a",
  "stands as a",
  "plays a crucial role",
  "plays a pivotal role",
  "plays a key role",
  "plays a vital role",
  "underscores the importance",
  "highlights the importance",
  "rich tapestry",
  // Sycophancy and coaching tells.
  "great question",
  "good question",
  "excellent question",
  "you're absolutely right",
  "you are absolutely right",
  "i hope this helps",
  "hope this helps",
  "happy to help",
];

// Whole words, case-insensitive.
export const VOCABULARY: readonly string[] = [
  "delve",
  "delves",
  "delving",
  "tapestry",
  "testament",
  "pivotal",
  "crucial",
  "vibrant",
  "boasts",
  "boasting",
  "meticulous",
  "meticulously",
  "intricate",
  "intricacies",
  "interplay",
  "seamless",
  "seamlessly",
  "leverage",
  "leverages",
  "leveraging",
  "utilize",
  "utilizes",
  "utilizing",
  "utilise",
  "utilises",
  "utilising",
  "garner",
  "bolster",
  "bolsters",
  "showcase",
  "showcases",
  "showcasing",
  "fostering",
  "empower",
  "empowers",
  "empowering",
  "elevate",
  "supercharge",
  "cutting-edge",
  "groundbreaking",
  "game-changing",
  "holistic",
  "synergy",
  "realm",
  "embark",
  "journey",
  "landscape",
  "myriad",
  "plethora",
  "world-class",
  "effortlessly",
];

// Warnings rather than errors: common in natural prose, so a single hit
// should not block an item, but every one is a cut worth making.
export const ADVERBS: readonly string[] = [
  "really",
  "just",
  "literally",
  "genuinely",
  "honestly",
  "simply",
  "actually",
  "truly",
  "fundamentally",
  "inherently",
  "inevitably",
  "interestingly",
  "importantly",
  "notably",
  "basically",
  "essentially",
  "incredibly",
  "extremely",
  "arguably",
  "undoubtedly",
  "certainly",
  "definitely",
  "absolutely",
  "obviously",
  "very",
];

const CONTRASTS: { pattern: RegExp; message: string }[] = [
  { pattern: /\bnot\s+(?:just|only|merely|simply)\s+[^.?!\n]{1,80}?\bbut\b/i, message: '"not only X but Y": state Y' },
  {
    pattern: /\b(?:isn't|is not|aren't|are not|wasn't|weren't)\s+(?:about\s+|just\s+|a\s+|an\s+|the\s+)?[^.?!\n,;:]{1,60}[,;:]\s*(?:it's|it is|they're|they are|that's)\b/i,
    message: '"isn\'t X, it\'s Y": state Y',
  },
  { pattern: /\b(?:it's|it is|this is|that is)\s+not\s+[^.?!\n]{1,60}\.\s+(?:it's|it is|this is|that is)\s/i, message: '"It\'s not X. It\'s Y.": state Y' },
  { pattern: /\bno\s+[^.?!\n,]{1,30},\s*no\s+[^.?!\n,]{1,30},\s*(?:just|only)\b/i, message: '"no X, no Y, just Z": state Z' },
];

const FENCE = /^\s*(```|~~~)/;
const DASHES = /[–—]/;
// Copyright, registered and trademark signs are pictographic in Unicode but
// are not emoji in prose.
const EMOJI = /(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}/u;

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A phrase pattern: whole words, any whitespace between them, straight or
// curly apostrophes.
function phrasePattern(phrase: string): RegExp {
  const body = escape(phrase)
    .replace(/'/g, "['’]")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "iu");
}

const PHRASE_PATTERNS = PHRASES.map((p) => ({ phrase: p, pattern: phrasePattern(p) }));
const VOCABULARY_PATTERN = new RegExp(`(?<![\\p{L}\\p{N}-])(${VOCABULARY.map(escape).join("|")})(?![\\p{L}\\p{N}-])`, "giu");
const ADVERB_PATTERN = new RegExp(`(?<![\\p{L}\\p{N}-])(${ADVERBS.map(escape).join("|")})(?![\\p{L}\\p{N}-])`, "giu");

// Prose only: no fenced code, inline code, link targets or bare URLs, and no
// emphasis markers so a phrase split by bold still matches.
export function proseOf(line: string): string {
  return line
    .replace(/`[^`]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\*\*|__|(?<!\w)[*_](?=\S)|(?<=\S)[*_](?!\w)/g, "");
}

export function checkStyle(lines: string[], startLine: number): StyleFinding[] {
  const out: StyleFinding[] = [];
  let inFence = false;
  lines.forEach((raw, i) => {
    if (FENCE.test(raw)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const line = startLine + i;
    const withCode = raw.replace(/`[^`]*`/g, " ");
    if (DASHES.test(withCode)) out.push({ line, rule: "style/dash", severity: "error", message: "em or en dash; use a comma, a colon or a full stop" });
    if (EMOJI.test(withCode)) out.push({ line, rule: "style/emoji", severity: "error", message: "emoji in authored text" });
    const bold = (withCode.match(/\*\*[^*]+\*\*/g) ?? []).length;
    if (bold > 2) out.push({ line, rule: "style/bold", severity: "warning", message: `${bold} bold spans on one line; bold is for the assignment link and fixed labels` });
    const prose = proseOf(raw);
    if (prose.trim() === "") return;
    const hits = PHRASE_PATTERNS.filter(({ pattern }) => pattern.test(prose)).map(({ phrase }) => phrase);
    for (const phrase of hits) {
      // "worth noting" inside "it's worth noting" is one finding, not two.
      if (hits.some((other) => other !== phrase && other.includes(phrase))) continue;
      out.push({ line, rule: "style/phrase", severity: "error", message: `"${phrase}": cut it and state the point` });
    }
    for (const m of prose.matchAll(VOCABULARY_PATTERN)) {
      out.push({ line, rule: "style/vocabulary", severity: "error", message: `"${m[1]}": AI vocabulary; use a plain word or name the specific thing` });
    }
    for (const m of prose.matchAll(ADVERB_PATTERN)) {
      out.push({ line, rule: "style/adverb", severity: "warning", message: `"${m[1]}": cut the adverb` });
    }
    for (const { pattern, message } of CONTRASTS) {
      if (pattern.test(prose)) out.push({ line, rule: "style/contrast", severity: "error", message });
    }
  });
  return out;
}
