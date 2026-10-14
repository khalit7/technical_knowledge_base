#!/bin/sh
# Pending generator runs of the page "GraphRAG and structured retrieval" (prefix gr), in priority order.
# Every step uses the local generator (llama-server, Qwen3 GGUF Q4_K_M, temperature 0, seed 0, thinking off) on this
# page's ports 8366 (1.7B) and 8367 (4B), so the whole script holds the bench lock. Every call is cached under
# $RAG_SCRATCH/gr/gen/, so an interrupted run resumes where it stopped. Estimated durations from the setup's and the
# root's measured rates on this Mac (1.7B about 88 tokens/s decode, 4B about 41; prefill about 1,000 / 320 tokens/s).
# usage: RAG_SCRATCH=<shared rag folder> sh run_pending.sh [core|optional|post]
set -e
cd "$(dirname "$0")"
R=$RAG_SCRATCH; V="$R/venv/bin/python -I -B"; GV="$R/gr/venv/bin/python -I -B"; GG="$R/gr/grenv/bin/python -I -B"
LR="$R/gr/lrenv/bin/python -I -B"; LOCK="sh $R/../inf/lock.sh"
step() { echo "== $(date '+%H:%M:%S') load $(sysctl -n vm.loadavg) :: $*"; "$@"; }
case "${1:-core}" in
core)  # about 1 h 45 min
  $LOCK acquire bench gr 5 || exit 1
  ( while sleep 600; do $LOCK touch bench gr >/dev/null; done ) & TOUCH=$!
  trap 'kill $TOUCH 2>/dev/null; $LOCK release bench gr' EXIT
  step $GG s_extract.py run 1.7b          # graphrag prompt + 1 gleaning, 394 paragraphs: ~40 min
  step $GG s_extract.py run 4b 100        # same, first 100 paragraphs with the 4B: ~20 min
  step $GG s_global.py run 4b             # 18 community reports + map-reduce x 5 questions + naive: ~25 min
  step $V s_qa.py run 1.7b                # 4 retrievers x 200 questions, single-shot answers: ~11 min
  step $GV s_sql_run.py run 1.7b          # 100 Spider questions x 4 schema conditions: ~15 min
  step $GV s_cypher_run.py run 1.7b       # 45 concert_singer questions, SQL and Cypher: ~3 min
  step env GR_LOCKED=1 NLTK_DATA=$R/gr/nltk_data $GG s_nlp_extract.py   # re-time the no-LLM extraction under the lock: ~1 min
  ;;
optional)  # about 1 h 40 min
  $LOCK acquire bench gr 5 || exit 1
  ( while sleep 600; do $LOCK touch bench gr >/dev/null; done ) & TOUCH=$!
  trap 'kill $TOUCH 2>/dev/null; $LOCK release bench gr' EXIT
  step $GV s_sql_run.py run 4b            # ~35 min
  step $GV s_cypher_run.py run 4b         # ~8 min
  step $V s_qa.py run 4b                  # ~25 min (the root's 4B single and react runs must exist)
  step env TIKTOKEN_CACHE_DIR=$R/gr/tiktoken $LR s_lightrag.py run 4b 60   # LightRAG insert of 60 paragraphs + queries: ~25 min
  step $GG s_global.py run 1.7b           # ~10 min
  ;;
post)  # no generator, no lock: rebuild the page data from the caches
  $GG s_extract.py summary 1.7b; $GG s_extract.py summary 4b 100
  $V s_entities.py 1.7b_394; $V s_entities.py 4b_100; $V s_entities.py agt
  $GG s_communities.py 1.7b_394; $GG s_communities.py agt
  $GG s_global.py summary 4b; $V s_qa.py summary; $GV s_sql_run.py summary; $GV s_cypher_run.py summary
  ;;
esac
