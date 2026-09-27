#!/usr/bin/env bash
# A dojo course workspace: profile.md with a dojo: key marks it.
set -euo pipefail
printf -- '---\ndojo: 0.1.0\n---\n# Profile\n' > profile.md
mkdir -p projects/todo-api
printf 'export const add = (todos, t) => todos.push(t);\n' > projects/todo-api/app.js
