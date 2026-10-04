#!/bin/sh
# Runs the retry-storm matrix: 6 configurations x 3 seeds, about 45 s each (about 14 minutes).
# Usage: sh run_all.sh <output dir>   (run it from a short path: the Unix socket path must be short)
L="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-runs}"; mkdir -p "$OUT"; cd "$OUT"
COMMON="--duration 40 --timeout-ms 100 --attempts 3 --rate 100"
run() { # name policy serverflags seed
  rm -f s.sock s.sock.ready
  python3 "$L/server.py" --sock s.sock --stats "$1_s$4_srv.txt" --duration 48 $3 &
  sp=$!
  python3 "$L/loadgen.py" --sock s.sock --out "$1_s$4_att.txt" --policy $2 --seed $4 $COMMON
  wait $sp
  echo "done $1 seed $4"
}
for seed in 1 2 3; do
  run none none "" $seed
  run naive naive "" $seed
  run backoff backoff "" $seed
  run budget budget "" $seed
  run deadline naive "--drop-expired" $seed
  run shed naive "--max-queue 8" $seed
done
echo ALLDONE
