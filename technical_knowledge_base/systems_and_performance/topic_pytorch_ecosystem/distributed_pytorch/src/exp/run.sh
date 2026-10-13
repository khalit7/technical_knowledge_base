#!/bin/sh
# usage: sh run.sh <nproc> <script.py> [args...]
# TORCHRUN: the shared venv's torchrun. Ports 29530-29539 belong to this page (PORT=... to pick one).
# Loopback only: without MASTER_ADDR=127.0.0.1 torchrun on macOS waits forever at the rendezvous.
N=$1; shift
: "${TORCHRUN:=torchrun}"; : "${PORT:=29530}"
cd "$(dirname "$0")"
TORCH_FR_BUFFER_SIZE=${TORCH_FR_BUFFER_SIZE:-20000} OMP_NUM_THREADS=1 MASTER_ADDR=127.0.0.1 GLOO_SOCKET_IFNAME=lo0 \
  "$TORCHRUN" --nproc_per_node "$N" --master_addr 127.0.0.1 --master_port $PORT "$@"
