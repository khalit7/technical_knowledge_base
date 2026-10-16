#!/bin/bash
# Launch lab, Slurm without torchrun: srun starts the 3 training processes directly and the script maps Slurm's
# variables to PyTorch's (RANK from SLURM_PROCID, LOCAL_RANK from SLURM_LOCALID) for init_process_group(env://).
# The bug on purpose: WORLD_SIZE is hard-coded to 4 while srun starts 3 tasks (a job resized without editing
# the script). Rank 0 hosts the TCPStore and waits for 4 clients. Extra arguments go to train.py.
#SBATCH --job-name=la-launch
#SBATCH --nodes=2
#SBATCH --ntasks=3
#SBATCH --cpus-per-task=1
#SBATCH --gres=gpu:2
#SBATCH --time=00:10:00
#SBATCH --output=/shared/la/out/%x-%j.out
set -uo pipefail
export MASTER_ADDR=$(scontrol show hostnames "$SLURM_JOB_NODELIST" | head -n1)
export MASTER_PORT=29500
export WORLD_SIZE=4                      # wrong: should be $SLURM_NTASKS
export RUN=${RUN:-la-$SLURM_JOB_ID} LA_OUT=/shared/la/runs/${RUN:-la-$SLURM_JOB_ID}
mkdir -p "$LA_OUT"
echo "{\"batch_ts\": $(date +%s.%N), \"job\": $SLURM_JOB_ID, \"nodes\": \"$SLURM_JOB_NODELIST\"}" > "$LA_OUT/batch.json"
srun --kill-on-bad-exit=1 bash -c '
  export RANK=$SLURM_PROCID LOCAL_RANK=$SLURM_LOCALID LA_TASK_TS=$(date +%s.%N)
  exec python3 /shared/la/la_probe.py --ckpt-dir "/shared/la/ckpt/$RUN" --log-dir "$LA_OUT" "$@"' la "$@"
echo "srun exit $? at $(date +%s.%N)"
