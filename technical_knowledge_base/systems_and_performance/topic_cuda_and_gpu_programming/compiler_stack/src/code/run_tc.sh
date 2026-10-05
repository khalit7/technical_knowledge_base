#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 with /work = this page's src/. CPU only. Writes out/tc/<name>.log (stderr: the TORCH_LOGS) and .json.
set -u
O=/work/out/tc; mkdir -p $O; cd /work/code
run() { name=$1; logs=$2; cache=$3
  if [ -n "$logs" ]; then export TORCH_LOGS="$logs"; else unset TORCH_LOGS; fi
  TORCHINDUCTOR_CACHE_DIR=$cache python tc_programs.py $name > $O/$name.stdout 2> $O/$name.log; unset TORCH_LOGS
  grep '^RESULT ' $O/$name.stdout | sed 's/^RESULT //' > $O/$name.json; }
rm -rf /tmp/c*
run graph "graph_code,guards" /tmp/c1
run explain "" /tmp/c2
run fullgraph "" /tmp/c3
run recompile "recompiles,dynamic" /tmp/c4
run aot "aot_graphs,output_code" /tmp/c5
run inductor_cpu "output_code,fusion" /tmp/c6
run modes "" /tmp/c7
run triton_train "output_code" /tmp/c9
python - > $O/bytecode_orig.txt 2>&1 <<'P'
import torch, dis, torch._dynamo
def with_print(x):
    y = torch.softmax(x * 0.125, dim=-1)
    print("max prob", "(printed from Python)")
    return y.sum(dim=-1)
dis.dis(with_print)
P

TORCH_LOGS="bytecode" TORCHINDUCTOR_CACHE_DIR=/tmp/c8 python tc_programs.py graph > /dev/null 2> $O/bytecode.log
for r in 1 2 3; do
  rm -rf /tmp/cc; run cold "" /tmp/cc; mv $O/cold.json $O/cold_$r.json
  run warm "" /tmp/cc; mv $O/warm.json $O/warm_$r.json
done
rm -f $O/cold.* $O/warm.*
cat /proc/loadavg > $O/loadavg.txt
echo done > $O/DONE
