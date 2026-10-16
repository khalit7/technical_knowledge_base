#!/bin/sh
# Failure lab: elastic training with torchrun inside one container. Two "nodes" = two torchrun agents (A, B),
# 2 ranks each, --nnodes=1:2, c10d rendezvous on localhost. Agent A starts first, so A hosts the rendezvous
# store. When training reaches step KILL_AT, agent B and its ranks are killed with SIGKILL (a node lost);
# A re-forms the job with world size 2. At step UP_AT a new agent C starts and the job grows back to 4.
# usage: fl_elastic.sh RUN NOSHARE(0|1) KILL_AT UP_AT     (KILL_AT and UP_AT multiples of 10)
RUN=$1; NOSHARE=$2; KILL_AT=$3; UP_AT=$4
[ "$NOSHARE" = 1 ] && export TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1
L=/work/$RUN; mkdir -p $L
now(){ python3 -c 'import time;print(round(time.time(),3))'; }
start_agent(){ torchrun --nnodes=1:2 --nproc-per-node=2 --max-restarts=5 --monitor-interval=1 \
  --rdzv-backend=c10d --rdzv-endpoint=localhost:29400 --rdzv-id=$RUN \
  /opt/mi/train.py --steps 400 --step-sleep-ms 100 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/agent_$1.out 2>&1 & }
kill_tree(){ for c in $(grep -l "^PPid:[[:space:]]*$1\$" /proc/[0-9]*/status 2>/dev/null | cut -d/ -f3); do kill_tree $c; done; kill -9 $1 2>/dev/null; }
reached(){ grep -q "\"world\": $2,.*\"step\": $1," $L/logs/rank0.jsonl 2>/dev/null; }
start_agent A; A=$!; sleep 3; start_agent B; B=$!; echo "start $(now) A=$A B=$B" > $L/events.txt
until reached $KILL_AT 4; do sleep 0.2; done
echo "kill_B $(now)" >> $L/events.txt; kill_tree $B
until reached $UP_AT 2; do sleep 0.2; done
start_agent C; C=$!; echo "start_C $(now)" >> $L/events.txt
wait $A; echo "A_exit $? $(now)" >> $L/events.txt
wait $C; echo "C_exit $? $(now)" >> $L/events.txt
