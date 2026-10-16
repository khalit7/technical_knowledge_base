#!/bin/bash
# Checkpoint before the time limit: Slurm sends SIGUSR1 to the batch shell 25 s before the limit;
# the trap saves (here: prints) and requeues the job, which resumes on its next start.
#SBATCH -J sl-sig
#SBATCH --time=1
#SBATCH --signal=B:USR1@25
#SBATCH --requeue
#SBATCH -n1 --gpus-per-task=1 --cpus-per-task=1
#SBATCH -o /shared/out/sl/%x-%j.out
#SBATCH --open-mode=append
echo "$(date -u +%T) start on $(hostname), SLURM_RESTART_COUNT=${SLURM_RESTART_COUNT:-0}"
if [ "${SLURM_RESTART_COUNT:-0}" -ge 1 ]; then echo "$(date -u +%T) resuming from the saved checkpoint"; sleep 5; echo "$(date -u +%T) finished"; exit 0; fi
trap 'echo "$(date -u +%T) got SIGUSR1: saving checkpoint, then requeue"; scontrol requeue $SLURM_JOB_ID; echo "requeue exit $?"; exit 0' USR1
sleep 300 & wait
