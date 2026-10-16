#!/bin/sh
# The Slurm child page's runs on the shared mi Slurm cluster (24.11.5, 3 nodes x 4 CPUs x 4 fake GPUs).
# usage: sh sl_runs.sh <root src/data dir> <this scripts dir> <raw output dir> [phase ...]
# phases: arch setup life steps gallery deps het resv acct restore   (default: all, in that order)
# Run only under the slurm lock. Almost every job is a sleep: it holds fake GPUs and uses no CPU.
# setup applies sl_slurm.conf (priority weights, enforced limits, prolog/epilog, partition sllow) and creates
# QOS sl-high, sl-small and a GPU limit on carol; restore puts everything back exactly (original slurm.conf).
set -u
D=$1; SC=$2; OUT=$3; shift 3
PH=${*:-"arch setup life steps gallery deps het resv acct restore"}
mkdir -p "$OUT"
X() { docker exec mi-slurm-ctl "$@"; }
AS() { u=$1; shift; docker exec mi-slurm-ctl su "$u" -c "$*"; }
N() { docker exec "mi-slurm-$1" sh -c "$2"; }
ts() { date -u +%H:%M:%S; }
log() { echo "$(ts) $*" | tee -a "$OUT/driver.log"; }
G='--gpus-per-task=1 --cpus-per-task=1'   # every sleep job: N tasks of 1 fake GPU and 1 CPU
SUB() { u=$1; shift; AS "$u" "sbatch --parsable -o /dev/null $*" 2>&1; }
snapq() { { echo "## $(ts) squeue"; X squeue -o '%.5i %.12j %.6u %.7P %.9q %.2t %.8Q %.5D %.4C %b %R';
  echo "## squeue --start"; X squeue --start -o '%.5i %.12j %.2t %.20S %R'; } >> "$1" 2>&1; }
gone() { while X squeue -h -o %j | grep -q "^$1"; do sleep 3; done; }
SACCT='JobID%14,JobName%12,User,Account,Partition,QOS,AllocTRES%50,Timelimit,Submit,Eligible,Start,End,Elapsed,State,ExitCode,NodeList,Reason%30'

arch() { # read-only: the daemons, munge, configless, what slurmd detects, the config Slurm runs with
  f=$OUT/arch.txt; : > "$f"
  { echo '$ ps -eo user,comm (ctl)'; X ps -eo user,comm | grep -E 'slurm|munge|maria' ;
    echo '$ ps -eo user,comm (c1)'; N c1 'ps -eo user,comm' | grep -E 'slurm|munge';
    echo '$ scontrol ping'; X scontrol ping;
    echo '$ munge -n | unmunge (on c1: a credential made on ctl decodes on c1 with the shared key)'; X sh -c 'munge -n' | N c1 'unmunge' | grep -E 'STATUS|ENCODE_HOST|UID|GID|TTL';
    echo '$ ls /var/spool/slurmd/conf-cache (c1: configless, fetched from slurmctld)'; N c1 'ls /var/spool/slurmd/conf-cache 2>/dev/null || ls /run/slurm/conf 2>/dev/null';
    echo '$ slurmd -C (c1: what the node detects)'; N c1 'slurmd -C';
    echo '$ scontrol show node c1'; X scontrol show node c1;
    echo '$ scontrol show partition batch'; X scontrol show partition batch;
    echo '$ sinfo'; X sinfo;
    echo '$ sacctmgr show assoc tree'; X sacctmgr show assoc tree format=account%14,user,share,grptres,maxtres,qos;
    echo '$ sdiag (before)'; X sdiag; } >> "$f" 2>&1
  X sh -c 'wc -l < /var/log/slurm/slurmctld.log' > "$OUT/ctld_start_line"
  for n in c1 c2 c3; do N $n 'wc -l < /var/log/slurm/slurmd.log' > "$OUT/slurmd_${n}_start_line"; done
  log "arch done"
}

setup() {
  X mkdir -p /shared/jobs/sl /shared/out/sl
  for s in prolog.sh epilog.sh sl_steps.sbatch sl_het.sbatch; do docker cp "$SC/$s" mi-slurm-ctl:/shared/jobs/sl/$s; done
  X sh -c 'chmod 755 /shared/jobs/sl/*.sh; chmod 777 /shared/out/sl; touch /shared/out/sl/pe.log; chmod 666 /shared/out/sl/pe.log'
  docker cp "$SC/sl_slurm.conf" mi-slurm-ctl:/etc/slurm/slurm.conf
  X scontrol reconfigure; sleep 8
  X sacctmgr -i add qos sl-high Priority=100 Description=sl-high > /dev/null
  X sacctmgr -i add qos sl-small Priority=20 MaxTRESPerUser=gres/gpu=4 Description=sl-small > /dev/null
  X sacctmgr -i modify user where name=alice,bob,carol set qos+=sl-high,sl-small > /dev/null
  X sacctmgr -i modify user where name=carol set GrpTRES=gres/gpu=2 > /dev/null
  sleep 3
  { echo '$ scontrol show config (changed lines)'; X scontrol show config | grep -E '^(AccountingStorageEnforce|PriorityWeight|Prolog|Epilog|PrologFlags) ';
    echo '$ sacctmgr show qos'; X sacctmgr show qos format=name,priority,maxtrespu%20,preempt,preemptmode;
    echo '$ sacctmgr show assoc'; X sacctmgr show assoc format=account,user,grptres,qos%30;
    echo '$ scontrol show partition (name, factor)'; X scontrol show partition | grep -E 'PartitionName|PriorityJobFactor'; } > "$OUT/setup.txt" 2>&1
  log "setup: $(X scontrol show config | grep -E '^AccountingStorageEnforce')"
}

life() { # the running example, made to wait first, followed second by second
  f=$OUT/life_poll.txt; : > "$f"
  X scontrol setdebug debug; X scontrol setdebugflags +Backfill
  B=$(SUB bob "-J sl-life-blk -p batch --ntasks=12 $G --time=1 --wrap 'sleep 25'")
  sleep 2
  J=$(AS alice "RUN=sl-life sbatch --parsable /shared/jobs/train.sbatch --steps 200")
  echo "$B $J" > "$OUT/life.ids"; log "life: blocker $B, running example $J"
  seen=""
  for i in $(seq 1 120); do
    st=$(X squeue -h -j "$J" -o '%T|%r|%S|%N' 2>/dev/null)
    echo "$(date -u +%H:%M:%S.%N | cut -c1-12) $st" >> "$f"
    s=${st%%|*}
    case " $seen " in *" $s "*) ;; *) seen="$seen $s"; [ -n "$s" ] && X scontrol show job -d "$J" > "$OUT/life_show_$s.txt" 2>&1;; esac
    if [ "$s" = RUNNING ] && [ ! -s "$OUT/life_sstat.txt" ]; then sleep 4; X sstat -a -j "$J" --format=JobID,NTasks,AveCPU,MaxRSS%10,MaxRSSNode > "$OUT/life_sstat.txt" 2>&1; fi
    [ -z "$st" ] && break
    sleep 1
  done
  sleep 3
  X scontrol setdebug info; X scontrol setdebugflags -Backfill
  X sacct -j "$J" --format=JobID%14,JobName%10,State,Start,End,Elapsed,NodeList,AllocTRES%45,ExitCode > "$OUT/life_sacct.txt"
  X sacct -j "$B" -X --format=JobID,JobName%12,State,Start,End,NodeList > "$OUT/life_sacct_blk.txt"
  X cat /shared/out/mi-train-$J.out > "$OUT/life_job.out" 2>&1
  X sh -c 'grep -h "\"ev\": \"end\"" /shared/logs/sl-life/rank*.jsonl; grep -h "\"step\": 200" /shared/logs/sl-life/rank0.jsonl' > "$OUT/life_end.jsonl" 2>&1
  X sh -c "grep -E 'job=($J|$B) ' /shared/out/sl/pe.log" > "$OUT/life_pe.txt"
  log "life done"
}

steps() {
  J=$(AS alice "sbatch --parsable /shared/jobs/sl/sl_steps.sbatch"); echo "$J" > "$OUT/steps.id"; log "steps: $J"
  sleep 8; X squeue -s -j "$J" -o '%.12i %.9j %.8T %.10M %N' > "$OUT/steps_squeue_s.txt" 2>&1
  gone sl-steps
  X cat /shared/out/sl/sl-steps-$J.out > "$OUT/steps.out" 2>&1
  X sacct -j "$J" --format=JobID%14,JobName%10,NTasks,Start,End,Elapsed,NodeList,AllocTRES%42,State,ExitCode > "$OUT/steps_sacct.txt"
  log "steps done"
}

gallery() { # one blocked cluster, one job per pending reason; then submit-time errors
  f=$OUT/gallery.txt; : > "$f"
  B=$(SUB bob "-J sl-g-blk -p batch --ntasks=12 $G --time=3 --wrap 'sleep 170'"); sleep 3
  R1=$(SUB alice "-J sl-g-res --ntasks=8 $G --time=2 --wrap 'sleep 100'")
  R2=$(SUB alice "-J sl-g-pri --ntasks=4 $G --time=2 --wrap 'sleep 100'")
  R3=$(SUB alice "-J sl-g-dep --ntasks=1 $G --time=2 --dependency=afterok:$R1 --wrap 'sleep 30'")
  R4=$(SUB alice "-J sl-g-begin --ntasks=1 $G --time=2 --begin=now+600 --wrap 'sleep 30'")
  R5=$(SUB alice "-J sl-g-huser -H --ntasks=1 $G --time=2 --wrap 'sleep 30'")
  R6=$(SUB alice "-J sl-g-hadm --ntasks=1 $G --time=2 --wrap 'sleep 30'"); X scontrol hold "$R6"
  R7=$(SUB alice "-J sl-g-ptl --ntasks=1 $G --time=120 --wrap 'sleep 30'")
  R8=$(SUB alice "-J sl-g-nice --ntasks=4 $G --time=2 --nice=1500 --wrap 'sleep 30'")
  R9=$(SUB alice "-J sl-g-qhigh --ntasks=4 $G --time=2 --qos=sl-high --wrap 'sleep 30'")
  R10=$(SUB alice "-J sl-g-low -p sllow --ntasks=4 $G --time=2 --wrap 'sleep 30'")
  R11=$(SUB alice "-J sl-g-qmax --ntasks=8 $G --time=2 --qos=sl-small --wrap 'sleep 30'")
  R12=$(SUB carol "-J sl-g-assoc --ntasks=4 $G --time=2 --wrap 'sleep 30'")
  R13=$(SUB alice "-J sl-g-arr --array=0-3%1 --ntasks=1 $G --time=2 --wrap 'sleep 30'")
  R14=$(SUB bob "-J sl-g-bob -N 2 --ntasks=4 $G --time=2 --wrap 'sleep 30'")
  R15=$(SUB alice "-J sl-g-1gpu --ntasks=1 $G --time=1 --wrap 'sleep 30'")
  echo "$B $R1 $R2 $R3 $R4 $R5 $R6 $R7 $R8 $R9 $R10 $R11 $R12 $R13 $R14 $R15" > "$OUT/gallery.ids"
  log "gallery submitted: $(cat "$OUT/gallery.ids")"
  for w in 20 70; do
    sleep $((w==20?17:50))
    snapq "$f"
    { echo "## $(ts) sprio -l"; X sprio -l; echo "## sprio -n -l (normalised factors)"; X sprio -n -l;
      echo "## sprio -w"; X sprio -w; echo "## sshare -a -l"; X sshare -a -l; } >> "$f" 2>&1
  done
  for j in $R1 $R2 $R3 $R4 $R5 $R6 $R7 $R8 $R9 $R10 $R11 $R12 $R13 $R14 $R15; do
    { echo "## scontrol show job $j"; X scontrol show job "$j" | grep -E 'JobId|Priority|JobState|Reason|Dependency|SubmitTime|EligibleTime|AccrueTime|Partition|QOS|NumNodes|TRES|TimeLimit|Nice'; } >> "$OUT/gallery_jobs.txt" 2>&1
  done
  # submit-time errors: rejected before they reach the queue
  { echo '$ sbatch -N1 --gres=gpu:5 (nodes have 4)'; SUB alice "-N1 --gres=gpu:5 --wrap true";
    echo '$ sbatch -N4 (3 nodes)'; SUB alice "-N4 --wrap true";
    echo '$ sbatch --mem=8000 (RealMemory=4000)'; SUB alice "--mem=8000 --wrap true";
    echo '$ sbatch -p nope'; SUB alice "-p nope --wrap true";
    echo '$ sbatch --qos=nope'; SUB alice "--qos=nope --wrap true";
    echo '$ sbatch --time=0:30 --begin=bogus'; SUB alice "--begin=bogus --wrap true";
    echo '$ sbatch --dependency=afterok:999999'; SUB alice "--dependency=afterok:999999 --wrap true";
    echo '$ sbatch --gpus-per-task=1 --cpus-per-task=5 (nodes have 4 CPUs)'; SUB alice "-n1 --gpus-per-task=1 --cpus-per-task=5 --wrap true";
  } > "$OUT/gallery_submit_errors.txt" 2>&1
  X scancel -n sl-g-okq 2>/dev/null
  log "gallery: cancelling"
  X scancel $(cat "$OUT/gallery.ids") 2>/dev/null; gone sl-g-
  X sacct -X -P -j "$(tr ' ' ',' < "$OUT/gallery.ids")" --format=$SACCT > "$OUT/gallery.sacct"
  log "gallery done"
}

deps() { # arrays, dependency chains, singleton, never-satisfied
  f=$OUT/deps_poll.txt; : > "$f"
  A=$(SUB alice "-J sl-arr --array=0-5%2 --ntasks=1 $G --time=1 -o /shared/out/sl/arr_%A_%a.out --wrap 'echo task \$SLURM_ARRAY_TASK_ID of \$SLURM_ARRAY_JOB_ID on \$(hostname); sleep 15'")
  P1=$(SUB alice "-J sl-prep --ntasks=1 $G --time=1 --wrap 'sleep 10'")
  P2=$(SUB alice "-J sl-train --ntasks=4 $G --time=1 --dependency=afterok:$P1 --wrap 'sleep 15'")
  P3=$(SUB alice "-J sl-eval --ntasks=1 $G --time=1 --dependency=afterok:$P2 --wrap 'sleep 5'")
  F1=$(SUB alice "-J sl-fail --ntasks=1 $G --time=1 --wrap 'sleep 5; exit 3'")
  F2=$(SUB alice "-J sl-clean --ntasks=1 $G --time=1 --dependency=afternotok:$F1 --wrap 'sleep 3'")
  F3=$(SUB alice "-J sl-report --ntasks=1 $G --time=1 --dependency=afterok:$F1 --wrap 'sleep 3'")
  S1=$(SUB alice "-J sl-single --ntasks=1 $G --time=1 --dependency=singleton --wrap 'sleep 10'")
  S2=$(SUB alice "-J sl-single --ntasks=1 $G --time=1 --dependency=singleton --wrap 'sleep 10'")
  echo "$A $P1 $P2 $P3 $F1 $F2 $F3 $S1 $S2" > "$OUT/deps.ids"; log "deps: $(cat "$OUT/deps.ids")"
  for i in $(seq 1 40); do
    { echo "## $(ts)"; X squeue -r -h -o '%.10i %.10j %.2t %.24r %.8E'; } >> "$f" 2>&1
    left=$(X squeue -h -o %j | grep -E '^sl-(arr|prep|train|eval|fail|clean|single)' | wc -l)
    [ "$left" -eq 0 ] && break
    sleep 3
  done
  X scontrol show job "$F3" | grep -E 'JobState|Reason|Dependency' > "$OUT/deps_never.txt" 2>&1
  X scancel "$F3"; sleep 2
  X sacct -P -X -j "$(tr ' ' ',' < "$OUT/deps.ids")" --format=$SACCT > "$OUT/deps.sacct"
  X sh -c 'cat /shared/out/sl/arr_*.out' > "$OUT/deps_array_out.txt" 2>&1
  log "deps done"
}

het() {
  J=$(AS alice "sbatch --parsable /shared/jobs/sl/sl_het.sbatch"); echo "$J" > "$OUT/het.id"; log "het: $J"
  sleep 4; X squeue -o '%.10i %.9j %.2t %.6D %b %N' > "$OUT/het_squeue.txt" 2>&1
  gone sl-het
  X cat /shared/out/sl/sl-het-$J.out > "$OUT/het.out" 2>&1
  X sacct -j "$J" --format=JobID%14,JobName%10,Start,End,NodeList,AllocTRES%45,State > "$OUT/het_sacct.txt"
  log "het done"
}

resv() { # a maintenance window, then a team reservation
  f=$OUT/resv.txt; : > "$f"
  X scontrol create reservation ReservationName=sl_maint StartTime=now+3minutes Duration=5 Nodes=ALL Flags=MAINT,IGNORE_JOBS Users=root >> "$f" 2>&1
  L1=$(SUB alice "-J sl-r-long --ntasks=8 $G --time=10 --wrap 'sleep 30'")
  L2=$(SUB alice "-J sl-r-short --ntasks=4 $G --time=2 --wrap 'sleep 20'")
  L3=$(SUB bob "-J sl-r-mid --ntasks=4 $G --time=4 --wrap 'sleep 20'")
  echo "$L1 $L2 $L3" > "$OUT/resv1.ids"; sleep 8
  { echo '$ scontrol show reservation'; X scontrol show reservation; } >> "$f" 2>&1
  snapq "$f"
  X scontrol show job "$L1" | grep -E 'Reason|StartTime' >> "$f"
  X scontrol delete ReservationName=sl_maint; sleep 6
  { echo "## after scontrol delete ReservationName=sl_maint"; } >> "$f"; snapq "$f"
  X scancel $L1 $L2 $L3; gone sl-r-
  X sacct -X -P -j "$(tr ' ' ',' < "$OUT/resv1.ids")" --format=$SACCT > "$OUT/resv1.sacct"
  X scontrol create reservation ReservationName=sl_team StartTime=now Duration=10 Nodes=c3 Users=alice >> "$f" 2>&1
  T1=$(SUB bob "-J sl-t-bob12 --ntasks=12 $G --time=2 --wrap 'sleep 20'")
  T2=$(SUB bob "-J sl-t-bob8 --ntasks=8 $G --time=2 --wrap 'sleep 20'")
  T3=$(SUB alice "-J sl-t-resv --reservation=sl_team --ntasks=4 $G --time=2 --wrap 'sleep 20'")
  T4=$(SUB alice "-J sl-t-nores --ntasks=4 $G --time=2 --wrap 'sleep 20'")
  echo "$T1 $T2 $T3 $T4" > "$OUT/resv2.ids"; sleep 8
  { echo "## team reservation"; X scontrol show reservation sl_team; } >> "$f" 2>&1; snapq "$f"
  X scancel $T1 $T2 $T3 $T4; gone sl-t-
  X scontrol delete ReservationName=sl_team
  X sacct -X -P -j "$(tr ' ' ',' < "$OUT/resv2.ids")" --format=$SACCT > "$OUT/resv2.sacct"
  log "resv done"
}

acct() {
  st=$(head -1 "$OUT/driver.log" | cut -c1-8)
  { echo '$ sacct -X -u alice,bob,carol -S <session start> (sl jobs)'; X sacct -X -a -S "2026-10-16T$st" --format=JobID%12,JobName%13,User,Partition,QOS,AllocTRES%42,Elapsed,State | grep -E 'JobID|---|sl-|mi-train';
    echo '$ sreport cluster AccountUtilizationByUser -t minutes (session)'; X sreport -t minutes cluster AccountUtilizationByUser start="2026-10-16T$st" end=now format=Account,Login,Used,Energy;
    echo '$ sreport -T gres/gpu -t minutes user topusage'; X sreport -T gres/gpu -t minutes user topusage start="2026-10-16T$st" end=now;
    echo '$ sdiag (after)'; X sdiag; } > "$OUT/acct.txt" 2>&1
  log "acct done"
}

restore() {
  X scancel -n sl-g-okq 2>/dev/null
  for r in sl_maint sl_team; do X scontrol delete ReservationName=$r 2>/dev/null; done
  X sacctmgr -i modify user where name=carol set GrpTRES=gres/gpu=-1 > /dev/null
  X sacctmgr -i modify user where name=alice,bob,carol set qos-=sl-high,sl-small > /dev/null
  X sacctmgr -i delete qos sl-high,sl-small > /dev/null
  docker cp "$D/slurm/slurm.conf" mi-slurm-ctl:/etc/slurm/slurm.conf
  X scontrol reconfigure; sleep 8; X scontrol setdebug info; X scontrol setdebugflags -Backfill 2>/dev/null
  s=$(X sh -c 'wc -l < /var/log/slurm/slurmctld.log' ); a=$(cat "$OUT/ctld_start_line" 2>/dev/null || echo 0)
  X sh -c "tail -n +$((a+1)) /var/log/slurm/slurmctld.log" > "$OUT/slurmctld_session.log" 2>&1
  for n in c1 c2 c3; do a=$(cat "$OUT/slurmd_${n}_start_line" 2>/dev/null || echo 0); N $n "tail -n +$((a+1)) /var/log/slurm/slurmd.log" > "$OUT/slurmd_${n}_session.log" 2>&1; done
  X cat /shared/out/sl/pe.log > "$OUT/pe.log" 2>&1
  LJ=$(awk '{print $2}' "$OUT/life.ids" 2>/dev/null)
  X sh -c "rm -rf /shared/jobs/sl /shared/out/sl /shared/ckpt/sl-life /shared/logs/sl-life; [ -n '$LJ' ] && rm -f /shared/out/mi-train-$LJ.out" 2>/dev/null
  { X scontrol show config | grep -E '^(AccountingStorageEnforce|PriorityWeight|Prolog|Epilog|PrologFlags|SchedulerType) ';
    X sacctmgr -n show qos format=name; X sacctmgr -n show assoc format=account,user,grptres,qos; X scontrol show res; X sinfo; X squeue; } > "$OUT/restored.txt" 2>&1
  log "restored"
}

life_idle() { # the same running example on an idle cluster (the before of the lifecycle tab)
  X scontrol setdebug debug; X scontrol setdebugflags +Backfill
  J=$(AS alice "RUN=sl-life2 sbatch --parsable /shared/jobs/train.sbatch --steps 200"); echo "$J" > "$OUT/life_idle.id"; log "life_idle: $J"
  sleep 2; for i in $(seq 1 40); do X squeue -h -j "$J" | grep -q . || break; sleep 1; done; sleep 3
  X scontrol setdebug info; X scontrol setdebugflags -Backfill
  X sacct -j "$J" --format=JobID%14,JobName%10,State,Submit,Start,End,Elapsed,NodeList,AllocTRES%45,ExitCode > "$OUT/life_idle_sacct.txt"
  X sh -c 'grep -h "\"ev\": \"end\"" /shared/logs/sl-life2/rank*.jsonl' > "$OUT/life_idle_end.jsonl" 2>&1
  X sh -c "rm -rf /shared/ckpt/sl-life2 /shared/logs/sl-life2; cat /shared/out/mi-train-$J.out; rm -f /shared/out/mi-train-$J.out" > "$OUT/life_idle_job.out" 2>&1
  log "life_idle done"
}

steps2() {
  docker cp "$SC/sl_steps2.sbatch" mi-slurm-ctl:/shared/jobs/sl/sl_steps2.sbatch; docker cp "$SC/sl_steps.sbatch" mi-slurm-ctl:/shared/jobs/sl/sl_steps.sbatch
  for v in sl_steps sl_steps2; do
    J=$(AS alice "sbatch --parsable /shared/jobs/sl/$v.sbatch"); echo "$J" > "$OUT/$v.id"; log "$v: $J"
    sleep 3; while X squeue -h -j "$J" | grep -q .; do sleep 2; done
    X sh -c "cat /shared/out/sl/*-$J.out" > "$OUT/$v.out" 2>&1
    X sacct -j "$J" --format=JobID%14,JobName%10,NTasks,Start,End,Elapsed,NodeList,AllocTRES%42,State,ExitCode > "$OUT/${v}_sacct.txt"
  done
  log "steps2 done"
}

sig() {
  docker cp "$SC/sl_sig.sbatch" mi-slurm-ctl:/shared/jobs/sl/sl_sig.sbatch
  J=$(AS alice "sbatch --parsable /shared/jobs/sl/sl_sig.sbatch"); echo "$J" > "$OUT/sig.id"; log "sig: $J"
  for i in $(seq 1 100); do { echo "## $(ts)"; X squeue -h -j "$J" -o '%T %r %S'; } >> "$OUT/sig_poll.txt" 2>&1
    X sacct -n -X -j "$J" -o State | grep -q COMPLETED && break; sleep 3; done
  X sh -c "cat /shared/out/sl/sl-sig-$J.out" > "$OUT/sig.out" 2>&1
  X sacct -D -j "$J" --format=JobID%14,JobName%8,State,Submit,Eligible,Start,End,Elapsed,ExitCode > "$OUT/sig_sacct.txt"
  X sh -c "grep -E 'JobId=$J' /var/log/slurm/slurmctld.log | tail -20" > "$OUT/sig_ctld.txt" 2>&1
  log "sig done"
}

steps3() { # is --exact implied? the same steps with and without --cpus-per-task in the job
  for v in sl_steps3 sl_steps4; do
    docker cp "$SC/$v.sbatch" mi-slurm-ctl:/shared/jobs/sl/$v.sbatch
    J=$(AS alice "sbatch --parsable /shared/jobs/sl/$v.sbatch"); echo "$J" > "$OUT/$v.id"; log "$v: $J"
    sleep 3; while X squeue -h -j "$J" | grep -q .; do sleep 2; done
    X sh -c "cat /shared/out/sl/*-$J.out" > "$OUT/$v.out" 2>&1
    X sacct -j "$J" --format=JobID%14,JobName%10,NTasks,Start,End,Elapsed,NodeList,AllocTRES%42,State,ExitCode > "$OUT/${v}_sacct.txt"
  done
  log "steps3 done"
}

munge_t() { # a credential made on the controller decodes on a compute node (same key)
  { echo '$ munge -n | unmunge    (encoded on ctl, decoded on c1)'; docker exec mi-slurm-ctl munge -n | docker exec -i mi-slurm-c1 unmunge | grep -E 'STATUS|ENCODE_HOST|UID|GID|TTL';
    echo '$ echo tampered | unmunge  (a credential that was not made with the key)'; echo 'MUNGE:AwQFAAAtampered:' | docker exec -i mi-slurm-c1 unmunge 2>&1 | head -2; } > "$OUT/munge.txt" 2>&1
  log "munge done"
}

for p in $PH; do $p; done
