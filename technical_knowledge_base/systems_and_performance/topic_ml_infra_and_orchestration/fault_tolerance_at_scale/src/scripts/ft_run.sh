#!/bin/sh
# Run every native experiment of the fault tolerance page, one after another (4 ranks, 1 thread each, nice 15).
# usage: sh ft_run.sh <scratch dir> <root src/data> <out dir> [names...]
# Natively on macOS (no cluster, no lock needed); the scratch guard is checked before each run.
S=$1; D=$2; OUT=$3; shift 3
HERE=$(cd "$(dirname "$0")" && pwd)
PY=$S/mi/venv/bin
run() { name=$1; shift
  sh "$S/inf/guard.sh" | grep -q HIGH && { echo "guard HIGH, skipping $name"; return 1; }
  rm -rf "$OUT/$name"; mkdir -p "$OUT/$name"
  MI_TRAIN_DIR=$D/train OMP_NUM_THREADS=1 GLOO_SOCKET_IFNAME=lo0 nice -n 15 "$PY/torchrun" --nnodes 1 --nproc-per-node 4 \
    --master-addr 127.0.0.1 --master-port 29561 "$HERE/ft_lab.py" --data "$S/mi/data/input.txt" --out "$OUT/$name" "$@" \
    > "$OUT/$name/torchrun.log" 2>&1
  echo "$name exit $?"; }
want() { [ -z "$SEL" ] || echo " $SEL " | grep -q " $1 "; }
SEL="$*"
# Stragglers: none; then three kinds at once (sustained on rank 2, periodic on rank 0, mild on rank 3), twice.
SLOW="2:80:159:6 0:25:300:20:25 3:200:300:2"
want strag_none && run strag_none --mode strag --steps 300
want strag_mix  && run strag_mix  --mode strag --steps 300 --slow $SLOW
want strag_mix2 && run strag_mix2 --mode strag --steps 300 --slow $SLOW
# Silent data corruption: one bit, one rank (2), one step (120); checkpoint at 100.
want sdc_clean  && run sdc_clean  --mode sdc --steps 200
want grad_lo    && run grad_lo    --mode sdc --steps 200 --flip grad   --flip-index -1 --flip-bit 3
want grad_mid   && run grad_mid   --mode sdc --steps 200 --flip grad   --flip-index -1 --flip-bit 27
want grad_hi    && run grad_hi    --mode sdc --steps 200 --flip grad   --flip-index -1 --flip-bit 30
want w_lo       && run w_lo       --mode sdc --steps 200 --flip weight --flip-bit 3
want w_mid      && run w_mid      --mode sdc --steps 200 --flip weight --flip-bit 27
want w_hi       && run w_hi       --mode sdc --steps 200 --flip weight --flip-bit 30
# Replays from each faulty run's step-100 checkpoint, on the same (healthy) machine, steps 101 to 150.
for r in grad_lo grad_mid grad_hi w_lo w_mid; do
  want rp_$r && run rp_$r --mode replay --replay-from "$OUT/$r/step_000100.pt" --replay-to 150
done
exit 0
