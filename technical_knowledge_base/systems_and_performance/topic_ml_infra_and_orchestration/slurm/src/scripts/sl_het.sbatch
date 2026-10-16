#!/bin/bash
# A heterogeneous job: component 0 is one CPU-only task (a launcher or data server), component 1 is two GPU nodes.
#SBATCH -J sl-het
#SBATCH --time=2
#SBATCH -o /shared/out/sl/%x-%j.out
#SBATCH -N1 -n1 --cpus-per-task=1
#SBATCH hetjob
#SBATCH -N2 --ntasks-per-node=1 --gpus-per-task=2 --cpus-per-task=2
echo "batch on $(hostname): het group 0 nodes=$SLURM_JOB_NODELIST_HET_GROUP_0, group 1 nodes=$SLURM_JOB_NODELIST_HET_GROUP_1"
srun --het-group=0 bash -c 'echo "group0 $(hostname) gpus=${SLURM_GPUS_ON_NODE:-0}"'
srun --het-group=1 -l bash -c 'echo "group1 $(hostname) gpus=$SLURM_GPUS_ON_NODE"'
srun --het-group=0,1 -l hostname
