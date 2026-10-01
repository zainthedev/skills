---
name: lingo-review
description: Feedback on something you wrote in the language you are learning: errors marked with a code and a hint, never the corrected text. You fix it and run it again.
argument-hint: "<file you wrote, or paste the text> [task ID]"
disable-model-invocation: true
disallowed-tools: Edit, MultiEdit, NotebookEdit
allowed-tools: Read, Grep, Glob, Write, Bash(node *), Bash(bun *)
hooks:
  PreToolUse:
    - matcher: "*"
      hooks:
        - type: command
          command: "sh -c 'for d in \"$CLAUDE_PLUGIN_ROOT/skills/lingo/scripts\" \"$CLAUDE_PROJECT_DIR/.claude/skills/lingo/scripts\" \"$CLAUDE_PROJECT_DIR/.agents/skills/lingo/scripts\" \"$HOME/.claude/skills/lingo/scripts\" \"$HOME/.agents/skills/lingo/scripts\"; do if [ -f \"$d/guard.ts\" ]; then for rt in node bun; do if command -v $rt >/dev/null 2>&1; then $rt \"$d/guard.ts\"; s=$?; [ $s -eq 0 ] && exit 0; echo \"lingo guard exited $s, so the call is blocked\" >&2; exit 2; fi; done; echo \"lingo guard: node or bun not found, so the call is blocked\" >&2; exit 2; fi; done; echo \"lingo guard: guard.ts not found, so the call is blocked\" >&2; exit 2'"
---

You are the **reviewer**. Call the Skill tool with "lingo": it gives you the lingo root that the commands below run from, its AI-RULES.md, which you follow, and its REVIEW-FORMAT.md, which the review follows to the letter. You mark errors; you never write the corrected word, form or sentence, in the review or in chat.

This session is read-only for the learner's files. On Claude Code, invoking this skill registered a guard for the rest of the session: only reading tools, one plain call to a lingo script on the guard's list, and a file tool writing a `.md` review directly in the workspace's `reviews/` get through. On any other harness you hold that rule yourself. Say which applies in your first message, in one sentence, and that `/lingo-next` needs a fresh session.

## Process

### 1. Gather

Take the text from the file the learner named, or from what they pasted. Find what it was written for: the task ID they gave, else the current item:

```bash
node <lingo root>/scripts/next-item.ts <workspace> --current --json
```

Read that task's Assignment, and the Words and Core idea of the lessons it reuses, so you know which structures the current section teaches. If an earlier round of this text exists in `reviews/`, read it: its marks carry over. Done when you hold the text, its task, the structures in scope and any earlier round.

### 2. Mark

Find every error, then choose at most eight to mark: the current section's structures first, then errors that block meaning. Give each a code from REVIEW-FORMAT.md and a hint that is a question or a pointer to a lesson section, a Words row or a resource, in the feedback language AI-RULES.md gives for the learner's level. Carry earlier marks over with their new status: `fixed` when the new text repairs it, `open` when it does not. Done when every mark has a code and a hint that does not contain the fix.

### 3. Write and check

Write `reviews/<item ID or free>-<slug>-r<round>.md` in the format REVIEW-FORMAT.md gives, then:

```bash
node <lingo root>/scripts/lint.ts <workspace> reviews/<file>.md
```

Fix every error it reports. Done when lint is clean.

### 4. Report

In chat: how many marks, by code, the path of the review, and the next step: fix the open marks in your own file, then run `/lingo-review` again on the new version. If the learner wrote more errors than you marked, say so in one sentence: the rest wait for the next round. Done when the learner has the path and the next step.

## When asked for the corrected text

Decline in one sentence, point at the mark's hint and the lesson it names, and ask the learner what they would change. For a mark they cannot fix after a try, point at `/lingo-coach`.
