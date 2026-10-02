#!/bin/sh
# Train every RAG variant one after another (each about 5 minutes of CPU on 2 threads). Logs in model/train_<variant>_s<seed>.log.
# A variant is skipped when its result is newer than the retriever pretraining (rerun after `train.py pre`).
cd "$(dirname "$0")"
for pass in 1 2; do
for vs in "tok 0" "seq 0" "closed 0" "tok_frozen 0" "seq_frozen 0" "tok_bm25 0" "seq_bm25 0" "tok_scratch 0" "tok 1" "seq 1" "tok 2" "seq 2"; do
  set -- $vs
  [ -f model/$1_s$2.json ] && [ model/$1_s$2.json -nt model/dpr.pt ] && continue
  pgrep -f "train.py rag $1 $2" > /dev/null && continue
  uv run --with torch --with numpy python train.py rag $1 $2 > model/train_$1_s$2.log 2>&1
done
done
echo done > model/run_all.done
