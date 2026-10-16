#!/bin/sh
# Launch lab, Slurm: submit la.sbatch as alice inside the controller container (the submit timestamp shares the
# Docker VM's clock with the nodes), wait for the job to end, save sacct, the job output and the probe files.
# usage: la_slurm.sh RUN WAIT_S "SBATCH_ENV" [train.py args...]
#   SBATCH_ENV: extra VAR=value assignments for the job (LA_EP, LA_POD1, LA_RDZV), shell syntax, e.g. "LA_EP=c9:29500".
#   They travel in sbatch's environment (sbatch exports everything by default). Not --export=ALL,VAR=...: in these
#   unprivileged containers that made slurmd load the user's environment through clone(CLONE_NEWPID|CLONE_NEWNS),
#   which failed ("slurmd: fatal: clone: Operation not permitted") and took the node down.
#   LA_EVID: host folder for evidence; LA_SB: batch script in /shared/la (default la.sbatch)
set -u
RUN=$1 WAIT=$2 XENV=$3; shift 3
E="$LA_EVID/$RUN"; mkdir -p "$E"
X="docker exec mi-slurm-ctl"
$X su alice -c "date +%s.%N; export RUN=$RUN $XENV; sbatch --parsable /shared/la/${LA_SB:-la.sbatch} $*" > "$E/submit.txt" 2>&1
JOB=$(tail -1 "$E/submit.txt")
t=0
while [ $t -lt "$WAIT" ]; do
  s=$($X squeue -h -j "$JOB" -o %T 2>/dev/null)
  [ -z "$s" ] && break
  sleep 2; t=$((t+2))
done
[ -n "$($X squeue -h -j "$JOB" -o %T 2>/dev/null)" ] && { $X scancel "$JOB"; echo "cancelled after ${WAIT}s" >> "$E/submit.txt"; sleep 3; }
$X sacct -j "$JOB" -P -o JobID,JobName,State,ExitCode,Submit,Start,End,Elapsed,NodeList > "$E/sacct.txt"
$X cat "/shared/la/out/la-launch-$JOB.out" > "$E/job.out" 2>&1
$X sh -c "cd /shared/la/runs/$RUN && tar cf - ." | tar xf - -C "$E"
$X grep -h "JobId=$JOB\b\|job_id:$JOB\b\|JobId=$JOB " /var/log/slurm/slurmctld.log > "$E/slurmctld.txt" 2>/dev/null
echo "$RUN job $JOB: $(sed -n 2p "$E/sacct.txt" | cut -d'|' -f3,4,8) after ${t}s"
