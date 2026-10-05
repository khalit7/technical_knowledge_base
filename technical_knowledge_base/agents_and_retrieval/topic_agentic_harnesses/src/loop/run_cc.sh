#!/bin/sh
# Record the same task run by real Claude Code (its own tools and system prompt), for comparison.
# Usage: AH_SCRATCH=<scratch dir> [CC_ALLOW="Bash(python3 *),Bash(python *)"] sh run_cc.sh <model> <label>
# Writes <scratch>/recordings/ahloop/<label>/{cc.jsonl, repo/, verdict.txt}.
set -e
MODEL=$1; LABEL=$2
OUT="$AH_SCRATCH/recordings/ahloop/$LABEL"
rm -rf "$OUT"; mkdir -p "$OUT"
cp -R "$AH_SCRATCH/task_repo" "$OUT/repo"
cd "$OUT/repo"
start=$(date +%s)
claude -p "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests." \
  --output-format stream-json --verbose --no-session-persistence --setting-sources project \
  --strict-mcp-config --model "$MODEL" --tools "Read,Edit,Write,Bash,Grep,Glob" \
  --permission-mode acceptEdits --allowedTools "${CC_ALLOW:-Bash(python3 *)}" \
  --append-system-prompt "Never use the em-dash character." --max-turns 30 > "$OUT/cc.jsonl" 2> "$OUT/stderr.txt" || true
echo "wall $(( $(date +%s) - start )) s" > "$OUT/verdict.txt"
python3 tests/test_core.py >> "$OUT/verdict.txt" 2>&1 && echo "passed" >> "$OUT/verdict.txt" || echo "failed" >> "$OUT/verdict.txt"
echo "$LABEL done"
