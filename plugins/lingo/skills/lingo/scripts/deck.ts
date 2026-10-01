#!/usr/bin/env node
// Writes deck.tsv, every generated or done lesson's Words in one file Anki
// imports as notes. Anki does the scheduling; lingo keeps no scheduler.

import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { isMain, parseCli, runCli } from "./lib/cli.ts";
import { plainCell, readLessonWords } from "./lib/words.ts";
import { findItemFile, readProfile, requireWorkspace } from "./lib/workspace.ts";
import { readSyllabus } from "./next-item.ts";

const USAGE = `usage: deck.ts <workspace> [--out <file>]

Writes deck.tsv (or --out): Anki's import header lines, then one note per row
of every generated or done lesson's Words table, with the fields Word,
Reading, Meaning, Example and Lesson and the tags lingo, the language slug,
the lesson ID and its section. In Anki: File, Import, pick the file, map the
fields to a note type with Meaning on the front for recall practice. Prints
the note count.`;

export interface DeckNote {
  word: string;
  reading: string;
  meaning: string;
  example: string;
  lesson: string;
  tags: string[];
}

function field(text: string): string {
  return text.replace(/[\t\r\n]+/g, " ").trim();
}

function tag(text: string): string {
  return text.replace(/\s+/g, "_");
}

export function deckNotes(workspace: string): DeckNote[] {
  const syllabus = readSyllabus(workspace);
  let slug = "";
  try {
    slug = readProfile(workspace).slug;
  } catch {
    slug = "";
  }
  const notes: DeckNote[] = [];
  const seen = new Set<string>();
  for (const item of syllabus.items) {
    if (item.type !== "lesson" || item.status === "planned") continue;
    const file = findItemFile(workspace, item.id, item.type);
    const table = file ? readLessonWords(file) : null;
    for (const row of table?.rows ?? []) {
      const word = plainCell(row.word);
      if (word === "" || seen.has(word.toLowerCase())) continue;
      seen.add(word.toLowerCase());
      const reading = plainCell(row.reading);
      notes.push({
        word,
        reading: reading === "-" ? "" : reading,
        meaning: plainCell(row.meaning),
        example: plainCell(row.example),
        lesson: item.id,
        tags: ["lingo", slug, item.id, `section-${item.section}`].filter((t) => t !== "").map(tag),
      });
    }
  }
  return notes;
}

export function renderDeck(notes: DeckNote[]): string {
  const lines = ["#separator:tab", "#html:false", "#columns:Word\tReading\tMeaning\tExample\tLesson\tTags", "#tags column:6"];
  for (const n of notes) lines.push([n.word, n.reading, n.meaning, n.example, n.lesson, n.tags.join(" ")].map(field).join("\t"));
  return lines.join("\n") + "\n";
}

async function main(): Promise<number> {
  const args = parseCli(process.argv.slice(2), { out: { type: "string" } });
  if (args.values.help) {
    console.log(USAGE);
    return 0;
  }
  if (!args.positionals[0]) throw Object.assign(new Error("expected <workspace>"), { code: 2 });
  const workspace = requireWorkspace(args.positionals[0]);
  const out = typeof args.values.out === "string" ? args.values.out : join(workspace, "deck.tsv");
  const notes = deckNotes(workspace);
  writeFileSync(out, renderDeck(notes));
  console.log(`wrote ${relative(workspace, out) || out}: ${notes.length} notes`);
  return 0;
}

if (isMain(import.meta.url)) {
  await runCli(main);
}
