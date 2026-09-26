#!/usr/bin/env bash
set -euo pipefail

# Dev-only, for people working on this repo. Not a supported installer: users
# take the Claude Code plugin or skills.sh, as the README says.
#
# Symlinks every skill under plugins/*/skills/ into the skill directories the
# agent harnesses read:
#   ~/.claude/skills   Claude Code
#   ~/.agents/skills   Codex and other Agent Skills harnesses
# Each entry is a symlink into this checkout, so a `git pull` is all it takes
# to keep them current. Run with --unlink to remove the links again.

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")
MODE="${1:-link}"

names=()
srcs=()
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  names+=("$(basename "$src")")
  srcs+=("$src")
done < <(find "$REPO/plugins" -path '*/skills/*/SKILL.md' -not -path '*/node_modules/*' -print0 | sort -z)

if [ "${#names[@]}" -eq 0 ]; then
  echo "no skills found under $REPO/plugins" >&2
  exit 1
fi

for DEST in "${DESTS[@]}"; do
  if [ -L "$DEST" ]; then
    resolved="$(cd "$DEST" 2>/dev/null && pwd -P || true)"
    case "$resolved" in
      "$REPO"|"$REPO"/*)
        echo "skip $DEST: it resolves into this repo" >&2
        continue
        ;;
    esac
  fi
  mkdir -p "$DEST"
  for i in "${!names[@]}"; do
    link="$DEST/${names[$i]}"
    if [ "$MODE" = "--unlink" ]; then
      if [ -L "$link" ]; then rm "$link"; echo "unlinked $link"; fi
      continue
    fi
    if [ -e "$link" ] && [ ! -L "$link" ]; then
      echo "skip $link: exists and is not a symlink" >&2
      continue
    fi
    ln -sfn "${srcs[$i]}" "$link"
    echo "linked $link -> ${srcs[$i]}"
  done
done
