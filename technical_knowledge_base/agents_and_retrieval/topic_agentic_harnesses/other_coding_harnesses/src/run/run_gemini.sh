#!/bin/sh
# run_gemini.sh NAME : Gemini CLI 0.62.0 headless (-p, --yolo), its own Seatbelt sandbox (-s, permissive-open),
# GOOGLE_GEMINI_BASE_URL -> LiteLLM gateway's Gemini-API endpoints (8192) -> logging proxy (8190) -> local MLX server.
H=$(cd "$(dirname "$0")" && pwd); N=$1; shift
$H/prep.sh $N; cd $H/runs/$N/work; T0=$(date +%s)
HOME=$H/home GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8192 GEMINI_API_KEY=$(cat $H/gw/key.txt) \
  python3 $H/to.py 900 $H/env/npm/node_modules/.bin/gemini -m qwen3-4b-local --yolo --output-format stream-json "$@" \
  -p "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests." \
  > ../events.jsonl 2> ../stderr.txt
echo "exit $? seconds $(( $(date +%s) - T0 ))" > ../exit.txt
python3 tests/test_core.py > ../final_tests.txt 2>&1; echo "tests_exit $?" >> ../exit.txt
git status --short > ../status.txt; git diff > ../diff.txt; cat ../exit.txt
