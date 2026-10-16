#!/bin/bash
# The same steps as sl_steps2 (--cpus-per-task=1 in the job, no --exact on the steps), printing what srun inherits.
#SBATCH -J sl-steps4
#SBATCH -N 2
#SBATCH --ntasks=4
#SBATCH --ntasks-per-node=2
#SBATCH --gpus-per-task=1
#SBATCH --cpus-per-task=1
#SBATCH --time=3
#SBATCH -o /shared/out/sl/%x-%j.out
echo "batch script on $(hostname): SLURM_CPUS_PER_TASK=${SLURM_CPUS_PER_TASK:-unset} SRUN_CPUS_PER_TASK=${SRUN_CPUS_PER_TASK:-unset}"
echo "## step 0: srun runs one copy per task"
srun -l hostname
echo "## step 1: what each task sees"
srun -l bash -c 'echo "rank=$SLURM_PROCID local=$SLURM_LOCALID node=$(hostname) gpus_on_node=$SLURM_GPUS_ON_NODE step_gpus=${SLURM_STEP_GPUS:-unset} cuda=${CUDA_VISIBLE_DEVICES:-unset}"'
echo "## steps 2-5: four 1-task steps side by side (no --exact: each step takes the whole node)"
for i in 1 2 3 4; do srun -n1 -N1 -J sl-par$i sleep 6 & done; wait
echo done
