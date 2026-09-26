---
id: L02
title: The event loop
section: 1
hours: 2
generated: 2026-09-21
---
# The event loop

## Introduction

Everything slow in Node, from reading a file to waiting on the network, is handed off and finished later, and the event loop is the schedule that decides when "later" is ([The Node.js event loop, timers and process.nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)). After this lesson you will be able to predict the order in which callbacks run.

## Lesson overview

- Why Node hands slow work off instead of waiting.
- The phases of the event loop.
- Where timers and I/O callbacks run.
- What a stream is for.

## Before you start

Answer these from what you already know. Check them in the sidecar after the assignment.

1. If you set a timer for zero milliseconds, does its callback run before or after the rest of the current script?
2. How can one thread serve many connections at once?
3. What would go wrong if you read a large file into memory all at once?

## Core idea

The loop repeats a fixed set of phases, and each phase drains a queue of callbacks before the next begins ([The Node.js event loop, timers and process.nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)). Your script runs to completion first; only then does the loop start handing out callbacks. Streams fit the same picture: data arrives in chunks and each chunk is a callback.

## Assignment

1. **[The Node.js event loop, timers and process.nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)**
   Why: the primary source on the phases and their order.
   How: read up to the section on process.nextTick; skip the comparison with setImmediate on the first pass.
   Do: write a script with a timer, an immediate and a file read, predict the output order, then run it.
2. **[Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)**
   Why: its short section on asynchrony gives the reason the loop exists.
   How: reread only the paragraphs about non-blocking I/O.
   Do: explain to yourself why blocking the loop stops every connection.
3. **[Node.js stream reference](https://nodejs.org/api/stream.html)**
   Why: streams are how large data meets the event loop.
   How: read only the overview and the section on readable streams.
   Do: pipe a large file through a readable stream and count the chunks.

## Retrieval practice

Attempt each from memory, then move on. These return at checkpoints.

1. [Explain in plain English why Node does not wait for a file read to finish](#core-idea)
2. [In what order do the event loop phases run?](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
3. [Why does your script finish before any callback runs?](#core-idea)
4. [What problem do streams solve that reading a whole file does not?](https://nodejs.org/api/stream.html)
