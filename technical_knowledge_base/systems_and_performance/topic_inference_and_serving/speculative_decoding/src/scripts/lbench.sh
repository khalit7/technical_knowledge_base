#!/bin/sh
# usage: INF=<scratch inf dir> OUT=<raw runs dir> lbench.sh
# Time of one forward pass over n tokens (llama-bench prompt processing at depth 512), Metal, flash attention on, 5 reps.
G=$INF/models/gguf
$INF/lock.sh acquire bench sd 7200 || exit 1
for m in Qwen3-4B-Q4_K_M Qwen3-0.6B-Q4_K_M Qwen3-1.7B-Q8_0; do
  echo "load_before $(sysctl -n vm.loadavg)" > $OUT/lb_$m.log
  llama-bench -m $G/$m.gguf -ngl 99 -fa 1 -d 512 -p 1,2,3,4,5,6,7,8,10,12,16,20,24,32,48,64,96,128,192,256,512 -n 0 -r 5 -o json > $OUT/lb_$m.json 2>> $OUT/lb_$m.log
  echo "load_after $(sysctl -n vm.loadavg)" >> $OUT/lb_$m.log
  $INF/lock.sh touch bench sd
done
$INF/lock.sh release bench sd
