#!/bin/sh
# E9b: strace's own system calls per traced call (output: out/strace_meta.txt)
HERE=$(cd "$(dirname "$0")" && pwd)
docker run --rm --name os-proc-meta-$$ --cpus 1 --memory 512m -v "$HERE":/runs:ro kb-os-lab:1 sh /runs/in_container_meta.sh > "$HERE/out/strace_meta.txt" 2>&1
