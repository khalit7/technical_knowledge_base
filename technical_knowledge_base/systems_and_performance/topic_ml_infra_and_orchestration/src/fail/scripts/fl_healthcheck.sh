#!/bin/sh
# Failure lab: a node health check for Slurm's HealthCheckProgram. slurmd runs it as root every
# HealthCheckInterval seconds. Slurm does nothing with its exit code: the script must drain the node itself.
# Here the "GPU test" is that the node's four fake GPU device files exist; a real one would run
# nvidia-smi / dcgmi diag, check Xid errors in the kernel log, ECC counters, NVLink and the InfiniBand ports.
NODE=$(hostname)
missing=""
for i in 0 1 2 3; do [ -e /dev/mi_gpu$i ] || missing="$missing mi_gpu$i"; done
if [ -n "$missing" ]; then
  scontrol update nodename="$NODE" state=drain reason="healthcheck: missing$missing"
  exit 1
fi
exit 0
