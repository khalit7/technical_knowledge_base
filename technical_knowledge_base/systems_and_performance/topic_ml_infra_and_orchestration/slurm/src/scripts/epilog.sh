#!/bin/sh
# Epilog: slurmd runs this as root on every node of a job after it ends (cleanup: kill strays, wipe /tmp, reset GPUs).
echo "$(date -u +%H:%M:%S.%3N) epilog $(hostname) job=$SLURM_JOB_ID user=$SLURM_JOB_USER" >> /shared/out/sl/pe.log
exit 0
