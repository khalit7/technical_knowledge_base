#!/bin/sh
# The Scheduling lab's Slurm runs (sleep jobs: they hold fake GPUs and use no CPU).
# usage: sh slurm_runs.sh <data dir (src/data)> <raw output dir> [w1|w2|w3|all]
#   w1: the Reading tab's eight-job queue on 8 fake GPUs (c1, c2), once with sched/builtin (FIFO, no backfill)
#       and once with sched/backfill (the cluster's normal config). Time unit: 1 minute (Slurm time limits are
#       whole minutes); each job sleeps its runtime minus 5 s so it ends inside its limit.
#   w2: fairshare. alice (teama) runs a 12-GPU job for 3 minutes; while it runs alice queues four 4-GPU jobs,
#       then bob (teamb) queues four of the same. Who starts when it ends?
#   w3: preemption. bob runs a 12-GPU job in partition batch; alice submits a 4-GPU job to partition urgent.
# Every job asks for N tasks of 1 GPU and 1 CPU each (--ntasks=N --gpus-per-task=1 --cpus-per-task=1). A first
# attempt used --gpus=N --cpus-per-gpu=1: Slurm gave a 6-GPU job all 8 CPUs of its two nodes (one task per node),
# which stranded the 2 GPUs left on the second node (kept as evidence: stranded_evidence.txt).
# The original slurm.conf (src/data/slurm/slurm.conf) is put back at the end.
set -u
D=$1; OUT=$2; WHAT=${3:-all}
mkdir -p "$OUT"
X() { docker exec mi-slurm-ctl "$@"; }
AS() { u=$1; shift; docker exec mi-slurm-ctl su "$u" -c "$*"; }
log() { echo "$(date -u +%H:%M:%S) $*" | tee -a "$OUT/driver.log"; }
waitdone() { # wait until no job named $1* is pending or running
  while X squeue -h -o %j | grep -q "^$1"; do sleep 5; done; }
snap() { # $1 file: queue with reasons and backfill's expected start times, priorities
  { echo "## $(date -u +%H:%M:%S) squeue"; X squeue -o '%.6i %.10j %.8u %.2t %.10M %.5D %.20b %R';
    echo "## squeue --start"; X squeue --start -o '%.6i %.10j %.8u %.2t %.20S %R';
    echo "## sprio"; X sprio -l; echo "## sshare"; X sshare -a -l; } >> "$1" 2>&1; }
SACCT='JobID,JobName%12,User,Account,Partition,AllocTRES%60,Timelimit,Submit,Start,End,Elapsed,State,NodeList,Reason'

w1() { # $1 = fifo | backfill
  mode=$1
  if [ "$mode" = fifo ]; then
    sed 's#^SchedulerType=sched/backfill#SchedulerType=sched/builtin#' "$D/slurm/slurm.conf" > "$OUT/slurm.conf.fifo"
    docker cp "$OUT/slurm.conf.fifo" mi-slurm-ctl:/etc/slurm/slurm.conf
  else
    docker cp "$D/slurm/slurm.conf" mi-slurm-ctl:/etc/slurm/slurm.conf
  fi
  X scontrol reconfigure; sleep 8
  log "w1 $mode: $(X scontrol show config | grep -E '^SchedulerType')"
  for j in A:4:6 B:6:4 C:2:3 D:1:2 E:4:5 F:2:7 G:1:1 H:3:2; do
    n=${j%%:*}; r=${j#*:}; g=${r%%:*}; m=${r#*:}
    AS alice "sbatch --parsable -p batch --exclude=c3 --ntasks=$g --gpus-per-task=1 --cpus-per-task=1 --time=$m -J sc-$mode-$n -o /dev/null --wrap 'sleep $((m*60-5))'" >> "$OUT/w1_$mode.ids"
  done
  log "w1 $mode submitted $(tr '\n' ' ' < "$OUT/w1_$mode.ids")"
  sleep 15; snap "$OUT/w1_$mode.snap"
  sleep 120; snap "$OUT/w1_$mode.snap"
  waitdone "sc-$mode-"
  X sacct -X -P -j "$(paste -sd, "$OUT/w1_$mode.ids")" --format=$SACCT > "$OUT/w1_$mode.sacct"
  log "w1 $mode done"
}

w2() {
  AS alice "sbatch --parsable -p batch --ntasks=12 --gpus-per-task=1 --cpus-per-task=1 --time=3 -J sc-fs-hist -o /dev/null --wrap 'sleep 175'" > "$OUT/w2.ids"
  sleep 20
  for i in 1 2 3 4; do AS alice "sbatch --parsable -p batch --ntasks=4 --gpus-per-task=1 --cpus-per-task=1 --time=2 -J sc-fs-a$i -o /dev/null --wrap 'sleep 115'" >> "$OUT/w2.ids"; done
  sleep 2
  for i in 1 2 3 4; do AS bob "sbatch --parsable -p batch --ntasks=4 --gpus-per-task=1 --cpus-per-task=1 --time=2 -J sc-fs-b$i -o /dev/null --wrap 'sleep 115'" >> "$OUT/w2.ids"; done
  log "w2 submitted $(tr '\n' ' ' < "$OUT/w2.ids")"
  sleep 70; snap "$OUT/w2.snap"   # fairshare and priorities after the first recalculation
  sleep 90; snap "$OUT/w2.snap"   # just before the history job ends
  sleep 60; snap "$OUT/w2.snap"   # first wave running
  sleep 120; snap "$OUT/w2.snap"  # second wave
  waitdone "sc-fs-"
  X sacct -X -P -j "$(paste -sd, "$OUT/w2.ids")" --format=$SACCT > "$OUT/w2.sacct"
  snap "$OUT/w2.snap"
  log "w2 done"
}

w3() {
  AS bob "sbatch --parsable -p batch --requeue --ntasks=12 --gpus-per-task=1 --cpus-per-task=1 --time=4 -J sc-pre-big -o /dev/null --wrap 'sleep 175'" > "$OUT/w3.ids"
  sleep 40
  AS alice "sbatch --parsable -p urgent --ntasks=4 --gpus-per-task=1 --cpus-per-task=1 --time=1 -J sc-pre-urg -o /dev/null --wrap 'sleep 50'" >> "$OUT/w3.ids"
  sleep 10; snap "$OUT/w3.snap"
  waitdone "sc-pre-"
  X sacct -X -D -P -j "$(paste -sd, "$OUT/w3.ids")" --format=$SACCT > "$OUT/w3.sacct"
  X sh -c "grep -E 'sc-pre|JobId=($(paste -sd'|' "$OUT/w3.ids"))' /var/log/slurm/slurmctld.log" > "$OUT/w3.ctldlog" 2>&1
  log "w3 done"
}

case "$WHAT" in
w1) w1 fifo; w1 backfill;;
w2) w2;; w3) w3;;
all) w1 fifo; w1 backfill; w2; w3;;
esac
# always leave the shared config as it was
docker cp "$D/slurm/slurm.conf" mi-slurm-ctl:/etc/slurm/slurm.conf; X scontrol reconfigure; sleep 5
log "restored: $(X scontrol show config | grep -E '^SchedulerType')"
X sh -c "grep -E 'sched|backfill|sc-' /var/log/slurm/slurmctld.log | tail -400" > "$OUT/slurmctld_tail.log" 2>&1
log "all done"
