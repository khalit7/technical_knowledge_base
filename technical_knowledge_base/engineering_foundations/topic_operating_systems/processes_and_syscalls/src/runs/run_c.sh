#!/bin/sh
# Host side: run the C experiments in a capped container. Output: out/c_runs.txt (then redact).
HERE=$(cd "$(dirname "$0")" && pwd)
docker run --rm --name os-proc-c-$$ --cpus 1 --memory 1500m -v "$HERE":/runs:ro kb-os-lab:1 sh /runs/in_container_c.sh > "$HERE/out/c_runs.txt" 2>&1
echo exit $?
