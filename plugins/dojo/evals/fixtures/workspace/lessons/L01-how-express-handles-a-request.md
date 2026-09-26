---
id: L01
title: How Express handles a request
section: 1
hours: 2
generated: 2026-09-25
---
# How Express handles a request

## Introduction

Every Express application is a function that receives a request and must send exactly one response. Everything else in the framework, routing, middleware and error handling, is a way of deciding which code runs between those two events. By the end of this lesson you will be able to start a server, define a route that reads a path parameter, and explain what happens when no route matches ([Express guide: Routing](https://expressjs.com/en/guide/routing.html)).

## Lesson overview

- The request and response objects and where they come from.
- How a route is matched by method and path.
- Path parameters and how to read them.
- What happens when no route matches.
- Why a handler that never responds hangs the client.

## Before you start

Answer these from what you already know. Check them in the sidecar after the assignment.

1. When two routes match the same request, which one runs?
2. What does the client see if a handler throws before responding?

## Core idea

An Express app is a list of handlers. Each incoming request is matched, top to bottom, against the method and path pattern of each handler; the first match runs. A handler takes the request and the response and is expected to call one of the response methods, such as `res.send` or `res.json`, exactly once ([Express guide: Routing](https://expressjs.com/en/guide/routing.html)). If no handler matches, Express sends a 404 with a plain-text body, which is the default final handler ([Express guide: Using middleware](https://expressjs.com/en/guide/using-middleware.html)).

```js
app.get("/todos/:id", (req, res) => {
  res.json({ id: req.params.id });
});
```

The `:id` segment is a path parameter; Express fills `req.params.id` from the matched URL.

## Assignment

1. **[Express: Hello world example](https://expressjs.com/en/starter/hello-world.html)**
   Why: the smallest complete application, so you see every moving part at once.
   How: read it all, then type it out rather than pasting it, and run it.
   Do: change the path to `/todos` and predict, before you reload, what `/` will return.
2. **[Express guide: Routing](https://expressjs.com/en/guide/routing.html)**
   Why: the rules for matching methods, paths and parameters, from the maintainers.
   How: read up to and including "Route parameters"; skip "Route handlers" for now.
   Do: add a route with two parameters and log `req.params` to confirm the shape.
3. **[Full Stack Open, part 3: Programming a server with NodeJS and Express](https://fullstackopen.com/en/part3)**
   Why: builds a real API step by step and explains the choices as it goes.
   How: read section a, "Node.js and Express", and stop before "Deploying app to internet".
   Do: implement the notes API's GET routes in your own file before reading their code.
4. **[Node.js: Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)**
   Why: Express sits on Node's HTTP server; this is what it is wrapping.
   How: skim; ten minutes is enough.
   Do: find the sentence that explains why one process can serve many connections.

## Retrieval practice

Attempt each from memory, then move on. These return at checkpoints.

1. [Explain in plain English what happens between a request arriving and a response leaving.](#core-idea)
2. [Which handler runs when several match, and why?](#core-idea)
3. [Where does `req.params.id` come from?](https://expressjs.com/en/guide/routing.html)
4. [What does the client receive when no route matches?](https://expressjs.com/en/guide/using-middleware.html)
5. [Why does a handler that never calls a response method hang the client?](#core-idea)
