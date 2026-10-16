#!/bin/sh
# Observability and cost child page: one Slurm queue watched by Prometheus, and the accounting it leaves behind.
# Run under the slurm lock, with oc_up.sh already run. usage: OUT=<dir> sh oc_slurm.sh
#   A (alice): the running example, 2 nodes x gpu:2, 500 steps with 100 ms of extra work per step
#   B (bob):   one node, gpu:4, sleep 70        -> the only node with 4 free GPUs
#   C (carol): one node, gpu:4, sleep 30        -> waits (Resources) while 4 GPUs are free, 2 on each of two nodes
# Afterwards: sacct with AllocTRES and billing for the chargeback table.
set -u
M="$OUT/marks.txt"; mkdir -p "$OUT"
X() { docker exec mi-slurm-ctl "$@"; }
mark() { echo "$(python3 -c 'import time;print(round(time.time(),3))') $1 $2" >> "$M"; }
A=$(X su alice -c "RUN=oc-sa sbatch --parsable -J oc-sa /shared/jobs/train.sbatch --steps 500 --step-sleep-ms 100 --ckpt-every 100 --no-resume"); mark oc-sa "submitted:$A"
sleep 2
B=$(X su bob -c "sbatch --parsable -J oc-sb -N1 --gres=gpu:4 -c1 --time=5 -o /dev/null --wrap 'sleep 70'"); mark oc-sb "submitted:$B"
sleep 2
C=$(X su carol -c "sbatch --parsable -J oc-sc -N1 --gres=gpu:4 -c1 --time=5 -o /dev/null --wrap 'sleep 30'"); mark oc-sc "submitted:$C"
sleep 4
X squeue -o '%i %u %j %T %r %b %D %N' > "$OUT/squeue_mid.txt"
X scontrol show node -o | sed -n 's/.*\(NodeName=[^ ]*\).*\(CfgTRES=[^ ]*\).*\(AllocTRES=[^ ]*\).*/\1 \2 \3/p' > "$OUT/nodes_mid.txt"
i=0; while [ $i -lt 150 ]; do
  n=$(X squeue -h -j "$A,$B,$C" 2>/dev/null | wc -l | tr -d ' '); [ "$n" = 0 ] && break; sleep 2; i=$((i+1)); done
mark all done
sleep 3
X sacct -j "$A,$B,$C" -X -P -o JobID,User,Account,JobName,Partition,State,Submit,Start,End,Elapsed,ElapsedRaw,AllocTRES,TotalCPU,ExitCode > "$OUT/sacct.txt"
X sacct -j "$A,$B,$C" -P -o JobID,JobName,State,Start,End,ElapsedRaw,AllocTRES > "$OUT/sacct_steps.txt"
X sh -c "cat /shared/logs/oc-sa/rank*.jsonl" > "$OUT/oc-sa_all.jsonl"
X sh -c "cat /shared/out/oc-sa-$A.out" > "$OUT/oc-sa.out" 2>/dev/null
X rm -rf /shared/logs/oc-sa /shared/ckpt/oc-sa "/shared/out/oc-sa-$A.out"
echo "$A $B $C" > "$OUT/jobids.txt"
