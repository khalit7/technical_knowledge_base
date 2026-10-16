#!/bin/sh
# Prolog: slurmd runs this as root on every node of a job when the allocation is made (PrologFlags=Alloc).
# A real site checks GPU health here and exits non-zero to drain a bad node; this one only logs, and always exits 0.
echo "$(date -u +%H:%M:%S.%3N) prolog $(hostname) job=$SLURM_JOB_ID user=$SLURM_JOB_USER" >> /shared/out/sl/pe.log
exit 0
