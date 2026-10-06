#!/bin/sh
# run_codex.sh NAME : Codex CLI 0.160.1 headless (codex exec), its own Seatbelt sandbox (workspace-write),
# model calls to the LiteLLM gateway's /v1/responses bridge (8192) -> logging proxy (8190) -> local MLX server.
H=$(cd "$(dirname "$0")" && pwd); N=$1; shift
$H/prep.sh $N; cd $H/runs/$N/work; T0=$(date +%s)
mkdir -p $H/home/codex
HOME=$H/home CODEX_HOME=$H/home/codex GWKEY=$(cat $H/gw/key.txt) python3 $H/to.py 900 $H/env/npm/node_modules/.bin/codex exec \
  --skip-git-repo-check -s workspace-write --json \
  -c model_provider=gw -c 'model_providers.gw={name="litellm-gw",base_url="http://127.0.0.1:8192/v1",wire_api="responses",env_key="GWKEY"}' \
  -c model_context_window=32768 -m qwen3-4b-local "$@" \
  "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests." \
  > ../events.jsonl 2> ../stderr.txt
echo "exit $? seconds $(( $(date +%s) - T0 ))" > ../exit.txt
python3 tests/test_core.py > ../final_tests.txt 2>&1; echo "tests_exit $?" >> ../exit.txt
git status --short > ../status.txt; git diff > ../diff.txt; cat ../exit.txt
