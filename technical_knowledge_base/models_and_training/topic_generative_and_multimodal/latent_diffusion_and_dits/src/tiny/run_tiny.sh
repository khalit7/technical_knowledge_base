#!/bin/sh
# The tiny-model queue for this page: one GPU process at a time, the shared bench lock acquired before and released
# after EACH run (never held across runs or during CPU work), every MPS process capped with
# PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 (lead's rule, 2026-10-17; the recorded runs predate it).
# usage: GM_SCRATCH=<shared setup folder> LOCKSH=<scratchpad>/inf/lock.sh GUARD=<scratchpad>/inf/guard.sh sh run_tiny.sh
# Equal-compute arithmetic (flops.py, out_flops.json): TinyUNet 402,980,864 FLOPs per forward pass, TinyDiT p4
# 249,047,040, so the UNet's 4,000 training steps cost as much as 4,000 x 402.98 / 249.05 = 6,473 DiT p4 steps.
cd "$(dirname "$0")"
export GM_LOCK="$LOCKSH" PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45
run() {   # one GPU run under the lock
  sh "$GUARD"
  sh "$LOCKSH" acquire bench ld 5400 || return 1
  nice -n 15 $GM_SCRATCH/venv/bin/python -I "$@"; rc=$?
  sh "$LOCKSH" release bench ld
  return $rc
}
run train_dit.py --variant p4 --steps 6473 --save-at 4000 &&
run sample_dit.py fw_fm_4000 ld_dit_p4_4000 ld_dit_p4_6473 &&
run train_dit.py --variant p8 --steps 4000 &&
run train_dit.py --variant p2 --steps 4000 &&
run train_dit.py --variant p4_nozero --steps 4000 &&
run sample_dit.py ld_dit_p8_4000 ld_dit_p2_4000 ld_dit_p4_nozero_4000
echo "queue exit $?"
