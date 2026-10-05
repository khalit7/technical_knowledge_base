#!/bin/sh
HERE=$(cd "$(dirname "$0")" && pwd)
docker run --rm --name os-proc-rp-$$ --cpus 1 --memory 512m -v "$HERE":/runs:ro kb-os-lab:1 sh -c 'gcc -O2 -o /tmp/reparent /runs/c/reparent.c && /tmp/reparent' > "$HERE/out/c_reparent.txt" 2>&1
