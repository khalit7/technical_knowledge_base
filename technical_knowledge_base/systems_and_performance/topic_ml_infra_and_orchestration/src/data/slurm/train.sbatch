#!/bin/bash
# The running example on Slurm: 2 nodes x 2 ranks. One torchrun per node (srun starts them), c10d rendezvous
# on the first node of the allocation. Submit as a lab user: su alice -c "sbatch /shared/jobs/train.sbatch"
# Extra arguments go to train.py, e.g. sbatch train.sbatch --steps 400 --step-sleep-ms 50. RUN names the output dirs.
#SBATCH --job-name=mi-train
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
RUN=${RUN:-slurm-$SLURM_JOB_ID}
echo "job $SLURM_JOB_ID nodes $SLURM_JOB_NODELIST master $MASTER_ADDR:$MASTER_PORT restart ${SLURM_RESTART_COUNT:-0}"
srun --kill-on-bad-exit=1 torchrun --nnodes="$SLURM_NNODES" --nproc-per-node=2 \
  --rdzv-backend=c10d --rdzv-endpoint="$MASTER_ADDR:$MASTER_PORT" --rdzv-id="$SLURM_JOB_ID" \
  /opt/mi/train.py --ckpt-dir "/shared/ckpt/$RUN" --log-dir "/shared/logs/$RUN" "$@"
