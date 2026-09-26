---
id: L02
---
# Answers: The event loop

## Before you start
1. After: the current script runs to completion before the loop hands out any timer callback. Source: [The Node.js event loop, timers and process.nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
2. It never waits: each slow operation is handed off and the thread moves on until the result comes back as a callback. Source: [Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
3. Memory use grows with the file and nothing else can happen until it is loaded. Source: [Node.js stream reference](https://nodejs.org/api/stream.html)

## Retrieval practice
1. Waiting would block the single thread, so the read is handed to the system and its result comes back later as a callback. Source: [Core idea](#core-idea)
2. Timers, pending callbacks, idle and prepare, poll, check, close callbacks. Source: [The Node.js event loop, timers and process.nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
3. The loop only starts once the main script has run to completion. Source: [Core idea](#core-idea)
