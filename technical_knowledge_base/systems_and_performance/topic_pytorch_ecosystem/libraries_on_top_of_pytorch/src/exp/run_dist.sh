#!/bin/sh
# Two-process runs of calls_trace.py on CPU/gloo. Usage: sh run_dist.sh <venv python dir> <deepspeed overlay dir> mode [port]
# (DeepSpeed 0.19.7 is used from an overlay folder with DS_ACCELERATOR=cpu; see ../README.md.)
BIN=$1; OVL=$2; MODE=$3; PORT=${4:-29561}
cd "$(dirname "$0")"
DS_ACCELERATOR=cpu PYTHONPATH=$OVL MASTER_ADDR=127.0.0.1 OMP_NUM_THREADS=1 \
  $BIN/torchrun --nproc_per_node 2 --master_addr 127.0.0.1 --master_port $PORT calls_trace.py $MODE
