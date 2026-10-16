#!/bin/bash
# Launch lab, Slurm: the running example's train.sbatch (src/data/slurm/train.sbatch) with the launch probes.
# One torchrun per node (srun starts them), c10d rendezvous on the first node of the allocation.
# Knobs (environment, passed by sbatch --export): RUN names the output folders; LA_EP overrides the rendezvous
# endpoint (to test a wrong MASTER_ADDR); LA_POD1 is a command node 1 runs before torchrun ("sleep 100000;" makes a
# node that never arrives); LA_RDZV adds torchrun rendezvous options. Extra arguments go to train.py.
#SBATCH --job-name=la-launch
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=2
#SBATCH --gres=gpu:2
#SBATCH --time=00:15:00
#SBATCH --output=/shared/la/out/%x-%j.out
set -uo pipefail
LA_BATCH_TS=$(date +%s.%N)
export MASTER_ADDR=$(scontrol show hostnames "$SLURM_JOB_NODELIST" | head -n1)
export MASTER_PORT=29500
export RUN=${RUN:-la-$SLURM_JOB_ID}
export LA_OUT=/shared/la/runs/$RUN
export LA_EP=${LA_EP:-$MASTER_ADDR:$MASTER_PORT} LA_POD1=${LA_POD1:-} LA_RDZV=${LA_RDZV:-}
mkdir -p "$LA_OUT"
echo "{\"batch_ts\": $LA_BATCH_TS, \"job\": $SLURM_JOB_ID, \"nodes\": \"$SLURM_JOB_NODELIST\", \"endpoint\": \"$LA_EP\"}" > "$LA_OUT/batch.json"
echo "job $SLURM_JOB_ID nodes $SLURM_JOB_NODELIST rendezvous $LA_EP"
srun --kill-on-bad-exit=1 bash -c '
  export LA_TASK_TS=$(date +%s.%N)
  if [ "$SLURM_NODEID" = 1 ]; then eval "$LA_POD1"; fi
  exec python3 /shared/la/la_torchrun.py --nnodes="$SLURM_NNODES" --nproc-per-node=2 \
    --rdzv-backend=c10d --rdzv-endpoint="$LA_EP" --rdzv-id="$SLURM_JOB_ID" $LA_RDZV \
    /shared/la/la_probe.py --ckpt-dir "/shared/la/ckpt/$RUN" --log-dir "$LA_OUT" "$@"' la "$@"
echo "srun exit $? at $(date +%s.%N)"
