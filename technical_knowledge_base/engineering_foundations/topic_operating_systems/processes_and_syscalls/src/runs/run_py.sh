#!/bin/sh
# Host side: Python experiments P1 (handler latency) and P2 (starting children from a Python process).
HERE=$(cd "$(dirname "$0")" && pwd)
D="docker run --rm --cpus 2 --memory 3g -v $HERE:/runs:ro"
$D --name os-proc-py1-$$ kb-os-lab:1 sh -c 'cd /runs/py && python handler_latency.py' > "$HERE/out/py_handler_latency.txt" 2>&1
$D --name os-proc-py2-$$ kb-os-lab:1 sh -c 'cd /runs/py &&
  python py_spawn.py "plain Python + numpy" 0 0 &&
  python py_spawn.py "+ import torch" 1 0 mp &&
  python py_spawn.py "+ torch + 1 GiB numpy (huge pages, the default)" 1 1024 mp &&
  NUMPY_MADVISE_HUGEPAGE=0 python py_spawn.py "+ torch + 1 GiB numpy (NUMPY_MADVISE_HUGEPAGE=0)" 1 1024' > "$HERE/out/py_spawn.txt" 2>&1
echo done
