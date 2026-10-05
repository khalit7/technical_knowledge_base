#!/bin/sh
# Record one Loop lab run: copy the task repository fresh, run one harness step on it, keep the logs.
# Usage: AH_SCRATCH=<scratch dir> sh run.sh <step file> <label> [extra env as VAR=value ...]
# Writes <scratch>/recordings/ahloop/<label>/{events.jsonl, events.jsonl.raw, repo/, empty/}.
# Raw logs stay in the scratch directory; redact.py writes the copies kept in this folder.
set -e
STEP=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); LABEL=$2; shift 2
OUT="$AH_SCRATCH/recordings/ahloop/$LABEL"
rm -rf "$OUT"; mkdir -p "$OUT/empty"
cp -R "$AH_SCRATCH/task_repo" "$OUT/repo"
# AH_INJECT=<file>: append that file to the copy's README (the planted prompt-injection variant)
[ -n "$AH_INJECT" ] && cat "$AH_INJECT" >> "$OUT/repo/README.md"
# AH_INJECT_TEST=<file>: put that file at the top of the copy's test file (same planted text, a place agents read)
[ -n "$AH_INJECT_TEST" ] && { cat "$AH_INJECT_TEST" "$OUT/repo/tests/test_core.py" > "$OUT/t.py"; mv "$OUT/t.py" "$OUT/repo/tests/test_core.py"; }
start=$(date +%s)
env AH_EMPTY="$OUT/empty" "$@" python3 "$STEP" "$OUT/repo" "$OUT/events.jsonl" > "$OUT/stdout.txt" 2>&1 || echo "harness exited $?" >> "$OUT/stdout.txt"
echo "$LABEL done in $(( $(date +%s) - start )) s"
