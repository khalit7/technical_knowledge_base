#!/bin/sh
# Second batch (INSIDE kb-gpu-lab-cs7:1, /work = src/): fullgraph errors, the bytecode Dynamo writes for a graph break, a scalar argument.
set -u
O=/work/out/tc; mkdir -p $O; cd /work/code
python tc_programs.py fullgraph 2> $O/fullgraph.log | grep '^RESULT ' | sed 's/^RESULT //' > $O/fullgraph.json
TORCH_LOGS="bytecode,graph_breaks,graph_code" TORCHINDUCTOR_CACHE_DIR=/tmp/b1 python tc_programs.py breakrun > $O/breakrun.stdout 2> $O/breakrun.log
TORCH_LOGS="recompiles,guards" TORCHINDUCTOR_CACHE_DIR=/tmp/b2 python tc_programs.py scalar > /dev/null 2> $O/scalar.log
echo done > $O/DONE2
