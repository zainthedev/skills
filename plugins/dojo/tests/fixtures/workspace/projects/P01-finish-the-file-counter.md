---
id: P01
title: Finish the file counter
section: 1
hours: 3
kind: completion
reuses: [L01, L02]
generated: 2026-09-23
---
# Project: Finish the file counter

## Introduction

You will finish a command line tool that counts the lines in every file in a directory. It reuses what Node is and how a script runs from What Node is (L01) and the callback order from The event loop (L02).

## Starter

`starter/count.js` parses the directory argument and lists the files. Run it with `node count.js <dir>`. The gaps are the line counting and the total; each is marked with a `TODO(dojo):` comment. The starter runs and prints file names, then fails clearly at the first gap.

## Assignment

1. Given a directory, the tool prints one line per file with the file's name and its line count.
2. After the files, it prints the total number of lines.
3. A directory that does not exist produces a one-line error and a non-zero exit code.

## Extra credit

- Accept several directories at once.

## Rules

- Reconstruct, never copy. If you paste a solution you found, you have skipped the part that changes you.
- Do not look at other people's finished solutions until yours works. Compare afterwards.
- Search engines and official docs are open book. AI is not: `/dojo-coach` will ask you questions and point you at resources, and will not write this for you.

## Done when

- [ ] `node count.js .` prints every file in the directory with a number beside it.
- [ ] The last line is the total and it matches `wc -l`.
- [ ] `node count.js /nope` prints one error line and exits non-zero.
