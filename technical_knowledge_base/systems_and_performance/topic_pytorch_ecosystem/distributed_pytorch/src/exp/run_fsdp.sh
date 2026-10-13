#!/bin/sh
# Every FSDP2 recording of this page (deterministic: collectives, shapes, dtypes, losses, memory; no bench lock).
cd "$(dirname "$0")"
f(){ n=$1; shift; PORT=29535 sh run.sh "$n" fsdp_more.py "$@" > "$DPT_SCRATCH/fsdp_$1.log" 2>&1; grep -h -E "^wrote" "$DPT_SCRATCH/fsdp_$1.log" || echo "FAILED $*"; }
f 4 fsdp4; f 4 ddp4; f 4 hsdp; f 4 raf2; f 4 prefetch; f 2 mp; f 2 mp_bf16reduce; f 2 offload; f 2 accum; f 2 statedict; f 2 fsdp1
