---
id: P01
title: Todo API
section: 1
hours: 4
kind: independent
reuses: [L01]
generated: 2026-09-25
---
# Project: Todo API

## Introduction

You will build a small JSON API for todo items with Express, using only what L01 covered: routes, path parameters and responses. Persistence is an in-memory array; that is deliberate.

## Assignment

1. `GET /todos` returns every todo as a JSON array.
2. `GET /todos/:id` returns one todo, or a 404 with a JSON body `{ "error": "not found" }`.
3. `POST /todos` creates a todo from a JSON body with a `title` and returns it with a generated `id` and status 201.
4. `DELETE /todos/:id` removes a todo and returns 204.
5. Unknown paths return a 404 JSON body rather than Express's default text.

## Extra credit

- Add `PATCH /todos/:id` that toggles `done`.

## Rules

- Reconstruct, never copy. If you paste a solution you found, you have skipped the part that changes you.
- Do not look at other people's finished solutions until yours works. Compare afterwards.
- Search engines and official docs are open book. AI is not: `/dojo:coach` will ask you questions and point you at resources, and will not write this for you.

## Done when

- [ ] Each of the five requirements works when exercised with curl.
- [ ] A request for a missing id returns the JSON 404 body, not HTML.
- [ ] The server starts with a single command from a clean clone.
