#!/bin/sh
# Re-record every deterministic run (no bench lock needed). TORCHRUN and DST_SCRATCH must be set; see README.
cd "$(dirname "$0")"
f(){ sh run.sh "$@" 2>&1 | grep -E 'wrote|Error' ; }
f 2 ddp.py --tag ddp_w2; f 2 ddp.py --bucket-mb 1 --tag ddp_w2_b1; f 4 ddp.py --tag ddp_w4; f 2 ddp.py --as-view --tag ddp_w2_view
f 2 ddp.py --layers 8 --d 512 --tag ddp_w2_big; f 4 ddp.py --layers 8 --d 512 --tag ddp_w4_big
f 2 fsdp.py --tag fsdp_w2; f 4 fsdp.py --tag fsdp_w4; f 2 fsdp.py --no-reshard --tag fsdp_w2_nr
f 2 fsdp.py --layers 8 --d 512 --tag fsdp_w2_big; f 4 fsdp.py --layers 8 --d 512 --tag fsdp_w4_big; f 4 fsdp.py --no-reshard --layers 8 --d 512 --tag fsdp_w4_big_nr
f 4 dtensor.py; f 2 dtensor.py; f 2 tp.py; f 4 tp.py --2d; f 2 pp.py --schedule gpipe; f 2 pp.py --schedule 1f1b
f 4 dcp.py save; f 2 dcp.py load; OMP_NUM_THREADS=1 "${PYTHON:-python}" dcp.py single 2>&1 | grep -E 'wrote|Error'
sh run.sh 2 hang.py skip >/dev/null 2>&1; sh run.sh 2 hang.py barrier >/dev/null 2>&1; TORCH_DISTRIBUTED_DEBUG=DETAIL sh run.sh 2 hang.py shape >/dev/null 2>&1
# hang.py shape without debug aborts a rank inside gloo; its outcome is in inputs/hang_shape_off.json (written by hand from the log)
