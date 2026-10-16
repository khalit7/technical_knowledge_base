#!/bin/sh
# Storage and data movement: how many file-system metadata calls one rank makes just to start (the import storm).
# strace -f -c over `python3 -c pass`, `import numpy`, `import torch` and `import torch.distributed`, 3 runs each,
# in a container that has strace and torch 2.14.1+cpu (kb-os-cont:1, read only; --cap-add SYS_PTRACE for strace).
# usage: OUT=<raw dir> sh run_import.sh
set -e
mkdir -p "$OUT"
: > "$OUT/import_strace.txt"
for what in "pass" "import numpy" "import torch" "import torch, torch.distributed, torch.distributed.checkpoint"; do
  for rep in 1 2 3; do
    echo "### $what | rep $rep" >> "$OUT/import_strace.txt"
    docker run --rm --name sd-imp --memory 1g --cpus 1 --cap-add SYS_PTRACE --entrypoint sh kb-os-cont:1 -c \
      "strace -f -c -e trace=%file,getdents64 -o /tmp/s.txt python3 -c '$what' && /usr/bin/time -f 'wall %e s' python3 -c '$what' 2>&1 | tail -1; cat /tmp/s.txt" >> "$OUT/import_strace.txt" 2>&1
  done
done
echo done
