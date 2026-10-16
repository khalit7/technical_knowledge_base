#!/bin/sh
# Runs INSIDE one container of mi-train:1 (started by ld_run.sh). Three torchrun agents A, B, C play three
# nodes on one host, one rank each, running the running example through ld_wrap.py.
#   elastic (and elastic_share, with the store shared) : c10d rendezvous, --nnodes=2:3. A at 0 s, B at 3 s, C at C_AT s; C is killed (SIGKILL, agent and
#             its rank) once rank 0 has logged 4 steps (40 steps) at world 3. --max-restarts=3.
#   static  : the same arrivals and the same kill with torchrun's default static rendezvous, --nnodes=3.
#   share / noshare : two agents, c10d, --nnodes=2, --max-restarts=1; rank 1 exits 13 at step 30 on the first
#             attempt only; with the workers' store shared (torch default) or not (TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1).
# usage: ld_rdzv.sh SCENARIO OUTDIR
SC=$1; L=$2; mkdir -p $L; rm -rf $L/*
export LOGLEVEL=INFO OMP_NUM_THREADS=1 PYTHONUNBUFFERED=1
TRAIN="/w/ld_wrap.py /opt/mi/train.py --step-sleep-ms 100 --ckpt-every 50 --log-every 10"
now(){ python3 -c 'import time;print(round(time.time(),3))'; }
ev(){ echo "$1 $(now)" >> $L/events.txt; }
kill_tree(){ for c in $(grep -l "^PPid:[[:space:]]*$1\$" /proc/[0-9]*/status 2>/dev/null | cut -d/ -f3); do kill_tree $c; done; kill -9 $1 2>/dev/null; }
# $1 logged steps (one every 10) by rank 0 at world size $2 (works after a resume from a checkpoint)
reached(){ [ "$(grep -c "\"ev\": \"step\", \"rank\": 0, \"world\": $2," $L/logs/rank0.jsonl 2>/dev/null)" -ge $1 ]; }
case $SC in
elastic|elastic_share)
  # workers' store not shared between rounds (the workaround from the Failure lab); elastic_share keeps torch's default
  [ $SC = elastic ] && export TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1
  agent(){ python3 /w/ld_torchrun.py --nnodes=2:3 --nproc-per-node=1 --max-restarts=3 --monitor-interval=1 --local-addr=127.0.0.1 \
    --rdzv-backend=c10d --rdzv-endpoint=127.0.0.1:29611 --rdzv-id=ld-el \
    $TRAIN --steps 600 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/agent_$1.out 2>&1 & } ;;
static)
  agent(){ python3 /w/ld_torchrun.py --nnodes=3 --node-rank=$2 --nproc-per-node=1 --monitor-interval=1 --local-addr=127.0.0.1 \
    --master-addr=127.0.0.1 --master-port=29612 \
    $TRAIN --steps 600 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/agent_$1.out 2>&1 & } ;;
share|noshare)
  [ $SC = noshare ] && export TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1
  agent(){ python3 /w/ld_torchrun.py --nnodes=2 --nproc-per-node=1 --max-restarts=1 --monitor-interval=1 --local-addr=127.0.0.1 \
    --rdzv-backend=c10d --rdzv-endpoint=127.0.0.1:29613 --rdzv-id=ld-$SC \
    /w/ld_wrap.py --ld-crash-rank 1 --ld-crash-step 30 /opt/mi/train.py --step-sleep-ms 100 --ckpt-every 20 \
    --log-every 10 --steps 80 --timeout-s 60 --ckpt-dir $L/ckpt --log-dir $L/logs > $L/agent_$1.out 2>&1 & } ;;
esac
ev start; agent A 0; A=$!; ev A_up
sleep 3; agent B 1; B=$!; ev B_up
if [ $SC = elastic ] || [ $SC = elastic_share ] || [ $SC = static ]; then
  C_AT=${C_AT:-45}; sleep $((C_AT-3)); agent C 2; C=$!; ev C_up
  i=0; until reached 4 3; do sleep 0.2; i=$((i+1)); [ $i -gt 1500 ] && break; done
  ev kill_C; kill_tree $C
fi
wait $A; ev "A_exit_$?"; wait $B; ev "B_exit_$?"
[ -n "$C" ] && { wait $C 2>/dev/null; ev "C_exit_$?"; }
ev end
