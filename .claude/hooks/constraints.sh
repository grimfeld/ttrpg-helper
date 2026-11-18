#!/usr/bin/env bash
# Claude Code hook for CONSTRAINTS.md.
#   constraints.sh fast   PostToolUse on file edits: floor and secrets
#   constraints.sh task   Stop: the task-end stage, before the agent hands work back
# A failed check exits 2, which blocks and feeds the findings back to the agent.
# A check that could not run (a tool not installed) only warns: CI still enforces it.
stage="$1"
input="$(cat)"
# Stop fires again after the agent reacts to a block; let it stop the second time rather than loop.
if [ "$stage" = task ] && printf '%s' "$input" | grep -q '"stop_hook_active": *true'; then exit 0; fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
out="$(scripts/check.sh "$stage" 2>&1)"; code=$?
case "$code" in
  0) exit 0 ;;
  1) printf 'CONSTRAINTS.md %s checks failed. Fix the code; do not weaken a check.\n%s\n' "$stage" "$out" >&2; exit 2 ;;
  *) printf 'CONSTRAINTS.md %s checks could not run (CI still enforces them):\n%s\n' "$stage" "$out" >&2; exit 1 ;;
esac
