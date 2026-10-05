#!/bin/sh
HERE=$(cd "$(dirname "$0")" && pwd)
JOB=$(cd "$HERE/../../../src/trace/job" && pwd)
docker run --rm --name os-proc-snap-$$ --cpus 2 --memory 2g --shm-size 256m -v "$JOB":/job:ro -v "$HERE":/runs:ro kb-os-lab:1 sh /runs/in_container_proc.sh > "$HERE/out/proc_snapshot.txt" 2>&1
echo done
