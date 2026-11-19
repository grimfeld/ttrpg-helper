#!/usr/bin/env bash
# Runs the checks in CONSTRAINTS.md. CONSTRAINTS.md is the source of truth; this mirrors it.
#   scripts/check.sh fast   after each edit       (floor, secrets)               under 5 s
#   scripts/check.sh task   when a task is done   (fast, plus tests when they exist) under 90 s
#   scripts/check.sh full   in CI                 (task, plus dependency and code scans)
#   scripts/check.sh floor|secrets-history|dependencies|code-scan|format   one CI job each
# Exit 0 clean, 1 a check failed, 2 a check could not run.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
stage="${1:-task}"
base="${CHECK_BASE:-origin/main}"
status=0
run() { # run <name> <command...>: keeps the worst exit code, 2 beats 1
  local name="$1"; shift
  "$@"; local code=$?
  if [ "$code" -ne 0 ]; then
    echo "check: $name failed (exit $code)" >&2
    if [ "$code" -ge 2 ]; then status=2; elif [ "$status" -eq 0 ]; then status=1; fi
  fi
}
need() { command -v "$1" >/dev/null || { echo "check: $1 is not installed (see CONSTRAINTS.md)" >&2; exit 2; }; }

fast() {
  need node; need gitleaks
  run floor node scripts/floor-guard.mjs --base "$base"
  run secrets gitleaks dir . --redact --verbose --no-banner --log-level warn --ignore-gitleaks-allow
}

format_check() {
  [ -x node_modules/.bin/prettier ] || { echo "check: prettier is not installed; run pnpm install" >&2; return 2; }
  node_modules/.bin/prettier --check . --log-level warn
}

task() {
  fast
  run format format_check
  # Tests, coverage, types, lint and architecture join this stage with the workspace scaffold.
}

osv() {
  if [ -z "$(git ls-files -co --exclude-standard -- '*pnpm-lock.yaml' '*Cargo.lock')" ]; then
    echo "osv: no lockfiles yet, nothing to scan"; return 0
  fi
  local out; out="$(mktemp)"
  osv-scanner scan source -r --format json . > "$out"; local code=$?
  # 0 nothing found, 1 vulnerabilities found (graded below); anything else is a failed scan.
  if [ "$code" -gt 1 ]; then rm -f "$out"; return 2; fi
  node scripts/quality-gate.mjs osv "$out"; code=$?; rm -f "$out"; return "$code"
}

semgrep_scan() {
  local out; out="$(mktemp)"
  # --strict turns scan errors into a non-zero exit; findings are graded by the gate, not the exit code.
  semgrep scan --config p/default --strict --metrics off --json --quiet . > "$out"; local code=$?
  if [ "$code" -ne 0 ] && [ "$code" -ne 1 ]; then rm -f "$out"; return 2; fi
  node scripts/quality-gate.mjs semgrep "$out"; code=$?; rm -f "$out"; return "$code"
}

full() {
  task
  need osv-scanner; need semgrep
  run dependencies osv
  run code-scan semgrep_scan
}

case "$stage" in
  fast) fast ;; task) task ;; full) full ;;
  floor) need node; run floor node scripts/floor-guard.mjs --base "$base" ;;
  secrets-history) need gitleaks; run secrets gitleaks git . --redact --verbose --no-banner --log-level warn --ignore-gitleaks-allow ;;
  dependencies) need osv-scanner; need node; run dependencies osv ;;
  code-scan) need semgrep; need node; run code-scan semgrep_scan ;;
  format) need node; run format format_check ;;
  *) echo "usage: scripts/check.sh fast|task|full|floor|secrets-history|dependencies|code-scan|format" >&2; exit 2 ;;
esac
[ "$status" -eq 0 ] && echo "check: $stage clean"
exit "$status"
