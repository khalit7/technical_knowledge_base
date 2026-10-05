#!/bin/sh
# E14b: what survives execve (output: out/c_exec.txt)
HERE=$(cd "$(dirname "$0")" && pwd)
docker run --rm --name os-proc-ex-$$ --cpus 1 --memory 512m -v "$HERE":/runs:ro kb-os-lab:1 sh -c 'cd /tmp && gcc -O2 -o showself /runs/c/showself.c && gcc -O2 -o exec_keep /runs/c/exec_keep.c && ./exec_keep ./showself' > "$HERE/out/c_exec.txt" 2>&1
