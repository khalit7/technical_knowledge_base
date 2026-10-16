#!/bin/bash
# Failure lab: the running example's train.sbatch with two changes: torchrun --max-restarts from $MAXR
# (default 0, as in train.sbatch) and train.py run through fl_wrap.py (for --crash-once).
#SBATCH --job-name=fl-train
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=2
#SBATCH --gres=gpu:2
#SBATCH --time=00:10:00
#SBATCH --output=/shared/out/%x-%j.out
#SBATCH --requeue
set -euo pipefail
export MASTER_ADDR=$(scontrol show hostnames "$SLURM_JOB_NODELIST" | head -n1)
export MASTER_PORT=29500
# FL_NOSHARE=1: give each restart its own c10d store instead of reusing the rendezvous store (see the Failure lab)
[ -n "${FL_NOSHARE:-}" ] && export TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1
RUN=${RUN:-fl-$SLURM_JOB_ID}
echo "job $SLURM_JOB_ID nodes $SLURM_JOB_NODELIST master $MASTER_ADDR:$MASTER_PORT restart ${SLURM_RESTART_COUNT:-0} noshare ${FL_NOSHARE:-0} start $(date -u +%H:%M:%S)"
srun --kill-on-bad-exit=1 torchrun --nnodes="$SLURM_NNODES" --nproc-per-node=2 --max-restarts="${MAXR:-0}" \
  --rdzv-backend=c10d --rdzv-endpoint="$MASTER_ADDR:$MASTER_PORT" --rdzv-id="$SLURM_JOB_ID" \
  /shared/jobs/fl/fl_wrap.py --ckpt-dir "/shared/ckpt/$RUN" --log-dir "/shared/logs/$RUN" "$@"
echo "job $SLURM_JOB_ID end $(date -u +%H:%M:%S)"
