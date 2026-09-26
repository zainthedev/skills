---
id: L01
title: What Node is
section: 1
hours: 2
generated: 2026-09-15
---
# What Node is

## Introduction

Node runs JavaScript outside the browser, which is what lets you write servers and command line tools in the language you already know from the front end ([Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)). The assignment leaves you able to say what Node adds to the language and run a script from the terminal.

## Lesson overview

- What Node is and what it is not.
- How Node runs a script from the terminal.
- Where the built-in modules come from.

## Before you start

Answer these from what you already know. Check them in the sidecar after the assignment.

1. Is Node a programming language, a runtime, or a framework?
2. What can a Node program do that a browser script cannot?

## Core idea

Node is a runtime: the V8 engine from Chrome plus a library of modules for files, networking and processes ([Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)). A script is a file that Node executes top to bottom, and anything it needs beyond the language comes from a built-in module you import by name.

```sh
node hello.js
```

## Assignment

1. **[Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)**
   Why: the official one-page answer to what Node is.
   How: read the whole page; skip the code sample on the first read.
   Do: write the one-line version of what Node is in your own words.
2. **[The Odin Project: Introduction to Node](https://www.theodinproject.com/lessons/nodejs-introduction-what-is-nodejs)**
   Why: the community's standard orientation, with the history that explains the design.
   How: read it end to end.
   Do: run `node --version` and a one-line script from the terminal.
   - Skip the assignment links at the bottom; this lesson covers them.
3. **[Node.js file system reference](https://nodejs.org/api/fs.html)**
   Why: your first look at the shape of the built-in modules.
   How: skim the table of contents only; do not read the functions yet.
   Do: find `readFile` and predict what its callback receives before opening it.

## Retrieval practice

Attempt each from memory, then move on. These return at checkpoints.

1. [Explain in plain English what Node adds to JavaScript](#core-idea)
2. [Why can a Node program read a file when a browser script cannot?](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
3. [What happens when you run node with a file name?](#core-idea)
4. [Where do built-in modules such as fs come from?](https://nodejs.org/api/fs.html)

## Additional resources

- [MDN: Express and Node introduction](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Introduction) if you want the server-side picture early.
