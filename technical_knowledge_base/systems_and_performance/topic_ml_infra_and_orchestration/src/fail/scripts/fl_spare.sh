#!/bin/sh
# Failure lab: a hot spare with torchrun. Same setup as fl_elastic.sh (agents of 2 ranks, --nnodes=1:2, c10d
# rendezvous on localhost, A hosts the store), but a third agent C is started early, at step SPARE_AT, while
# the job is already at its maximum of 2 nodes, so C waits as a spare. At step KILL_AT agent B is killed;
# C takes its place. usage: fl_spare.sh RUN SPARE_AT KILL_AT   (multiples of 10)
RUN=$1; SPARE_AT=$2; KILL_AT=$3
export TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1
L=/work/$RUN; mkdir -p $L
now(){ python3 -c 'import time;print(round(time.time(),3))'; }
start_agent(){ torchrun --nnodes=1:2 --nproc-per-node=2 --max-restarts=5 --monitor-interval=1 \
  --rdzv-backend=c10d --rdzv-endpoint=localhost:29400 --rdzv-id=$RUN \
  /opt/mi/train.py --steps 400 --step-sleep-ms 100 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/agent_$1.out 2>&1 & }
kill_tree(){ for c in $(grep -l "^PPid:[[:space:]]*$1\$" /proc/[0-9]*/status 2>/dev/null | cut -d/ -f3); do kill_tree $c; done; kill -9 $1 2>/dev/null; }
reached(){ grep -q "\"step\": $1," $L/logs/rank0.jsonl 2>/dev/null; }
start_agent A; A=$!; sleep 3; start_agent B; B=$!; echo "start $(now)" > $L/events.txt
until reached $SPARE_AT; do sleep 0.2; done
start_agent C; C=$!; echo "start_C $(now)" >> $L/events.txt
until reached $KILL_AT; do sleep 0.2; done
echo "kill_B $(now)" >> $L/events.txt; kill_tree $B
wait $A; echo "A_exit $? $(now)" >> $L/events.txt
wait $C; echo "C_exit $? $(now)" >> $L/events.txt
