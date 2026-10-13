#!/bin/sh
# Usage: sh run_titan.sh <venv bin> <torchtitan v0.3.0 clone> <overlay with tyro etc.> NPROC PORT CONFIG [extra args]
# Runs torchtitan.train through ttrun.py (the four CPU patches) from inside the clone (it reads tests/assets).
BIN=$1; SRC=$2; OVL=$3; N=$4; PORT=$5; CONF=$6; shift 6
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$SRC"
PYTHONPATH=$SRC:$OVL:$HERE MASTER_ADDR=127.0.0.1 OMP_NUM_THREADS=2 \
  $BIN/torchrun --nproc_per_node=$N --master_addr 127.0.0.1 --master_port $PORT -m ttrun --module libcfg --config $CONF "$@"
