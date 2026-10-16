#!/bin/sh
# One hop in the toy cluster: c1 -> c2 over Docker's bridge, against c1 -> c1 over loopback.
# Three repeats each; writes JSON lines to $1. Run under the shared slurm lock.
OUT=${1:-ping_raw.jsonl}; : > "$OUT"
HERE=$(cd "$(dirname "$0")" && pwd)
for c in mi-slurm-c1 mi-slurm-c2; do docker cp "$HERE/pingpong.py" $c:/tmp/ca_pingpong.py; done
for rep in 1 2 3; do
  # across the bridge
  docker exec -d mi-slurm-c2 python3 /tmp/ca_pingpong.py server 47011
  r=$(docker exec mi-slurm-c1 python3 /tmp/ca_pingpong.py client c2 47011)
  echo "{\"path\":\"c1->c2 bridge\",\"rep\":$rep,\"r\":$r}" >> "$OUT"
  # loopback inside one container
  docker exec -d mi-slurm-c1 python3 /tmp/ca_pingpong.py server 47012
  r=$(docker exec mi-slurm-c1 python3 /tmp/ca_pingpong.py client 127.0.0.1 47012)
  echo "{\"path\":\"c1 loopback\",\"rep\":$rep,\"r\":$r}" >> "$OUT"
done
for c in mi-slurm-c1 mi-slurm-c2; do docker exec $c rm -f /tmp/ca_pingpong.py; done
cat "$OUT"
