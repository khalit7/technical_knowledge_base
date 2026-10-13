#!/bin/sh
# usage: sh run.sh <nproc> <script.py> [args...]   (PY: the shared venv's python dir; torchrun from it)
# Loopback only: without MASTER_ADDR=127.0.0.1 torchrun on macOS waited forever resolving the hostname.
N=$1; shift
: "${TORCHRUN:=torchrun}"
PORT=$(( 29600 + $$ % 300 ))
cd "$(dirname "$0")"
TORCH_FR_BUFFER_SIZE=${TORCH_FR_BUFFER_SIZE:-20000} OMP_NUM_THREADS=1 MASTER_ADDR=127.0.0.1 GLOO_SOCKET_IFNAME=lo0 \
  "$TORCHRUN" --nproc_per_node "$N" --master_addr 127.0.0.1 --master_port $PORT "$@"
