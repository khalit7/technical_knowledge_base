#!/bin/sh
# Pending generator runs of the page "Agentic retrieval, long context and memory" (prefix ar), in priority order.
# Every step calls the local generator (llama-server, Qwen3 GGUF Q4_K_M from the inference topic's store, temperature 0,
# seed 0, thinking off, prompt cache on) on this page's ports 8360 (1.7B) and 8361 (4B), so each block holds the bench
# lock and touches it every 10 minutes. Every call is cached under $RAG_SCRATCH/ar/gen/ (and identical calls are read
# from the root Agentic lab's cache), so an interrupted run resumes where it stopped.
# Time estimates use this page's prefill model fitted to the root's recorded calls (src/data/longctx.json: about
# 0.82 ms per prompt token plus attention) and the measured decode rate (about 88 tokens/s for the 1.7B, 41 for the 4B).
# usage: RAG_SCRATCH=<shared rag folder> sh run_pending.sh core|budgets|lim|optional|post
cd "$(dirname "$0")"
R=$RAG_SCRATCH; V="$R/venv/bin/python -I -B"; LOCK="sh $R/../inf/lock.sh"
step() { echo "== $(date '+%F %T') load $(sysctl -n vm.loadavg) :: $*"; "$@"; }
lock() { $LOCK acquire bench ar 5 || exit 1
  ( while sleep 600; do $LOCK touch bench ar >/dev/null; done ) & TOUCH=$!
  trap 'kill $TOUCH 2>/dev/null; $LOCK release bench ar' EXIT; }
case "${1:-core}" in
core)  # about 1 h 20 min
  lock
  for j in ircot selfask flare crag; do step $V s_pending.py $j 1.7b 60 set=heldout; done   # format check on held-out questions: ~15 min
  step $V s_pending.py ircot 1.7b          # ~23 min
  step $V s_pending.py selfask 1.7b        # ~13 min
  step $V s_pending.py flare 1.7b          # ~5 min
  step $V s_pending.py crag 1.7b           # ~5 min
  step $V s_pending.py selfcheck 1.7b      # ~3 min
  for h in all last top3; do step $V s_pending.py memory 1.7b how=$h; done   # ~6 min
  step $V s_pending.py router 1.7b         # ~3 min
  ;;
budgets)  # about 1 h 15 min: the root's ReAct agent with other search budgets and results per search
  lock
  for b in 1 2 3 6; do step $V s_pending.py react_b 1.7b budget=$b; done
  for k in 1 5; do step $V s_pending.py react_b 1.7b k=$k; done
  ;;
lim)  # about 1 h 10 min: lost in the middle at 5, 10, 40 and 80 paragraphs (up to about 12k tokens), 50 questions
  lock
  step $V s_pending.py lim 1.7b 50
  ;;
optional)  # about 2 h: the 4B on the strategies that matter most
  lock
  step $V s_pending.py ircot 4b; step $V s_pending.py selfask 4b
  step $V s_pending.py react_b 4b budget=2; step $V s_pending.py react_b 4b budget=6
  ;;
post)  # no generator, no lock: turn the runs into the page's data and rebuild
  $V s_post.py && $V s_router.py && $V ../build_data.py && sh ../build.sh && $V ../check_data.py
  ;;
esac
