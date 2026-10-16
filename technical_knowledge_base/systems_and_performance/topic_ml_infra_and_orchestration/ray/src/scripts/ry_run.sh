#!/bin/sh
# Ray child page: every run, in order, under the ray lock. Usage: sh ry_run.sh <scratch> <repo src/data> <evidence dir> [sections]
# sections default: procs tasks objects spill fault lineage train data
# The head runs with a 2000 MB cap instead of up.sh's 1500 MB (+500 MB): Ray's memory monitor fixes its kill
# threshold (95% of the limit) when the raylet starts, so raising the cap later with docker update does not help.
# Starts Ray (src/data/ray/up.sh) if it is not running; stops it at the end unless another lab waits for the lock.
S=$1; R=$2; E=$3; shift 3
SECS=${*:-"procs tasks objects spill fault lineage train data"}
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$E"
sh "$S/inf/guard.sh" | grep -q '^OK' || { echo "guard HIGH: not starting"; sh "$S/inf/guard.sh"; exit 1; }
sh "$S/inf/lock.sh" acquire ray ry 60 || exit 1
started=0
docker ps --format '{{.Names}}' | grep -q '^mi-ray-head$' || { sed 's/--memory 1500m --memory-swap 1500m/--memory 2000m --memory-swap 2000m/' "$R/ray/up.sh" | sh > "$E/up.txt" 2>&1; started=1; }
docker exec mi-ray-head sh -c 'mkdir -p /shared/ry/out /shared/ry/marks && rm -f /shared/ry/GO'
for f in ry_core.py ry_data.py ry_train.py ry_ps.py; do docker cp "$HERE/$f" mi-ray-head:/shared/ry/$f; done
stats() { docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.MemPerc}}' mi-ray-head mi-ray-w1 mi-ray-w2 >> "$E/mem.txt"; }
for sec in $SECS; do
  echo "== $sec $(date -u +%H:%M:%S)"; echo "== $sec $(date -u +%s)" >> "$E/mem.txt"; stats
  case $sec in
  procs)
    docker exec mi-ray-head ray status > "$E/ray_status.txt" 2>&1
    for c in mi-ray-head mi-ray-w1 mi-ray-w2; do docker exec $c python /shared/ry/ry_ps.py > "$E/ps_$c.txt"; done
    docker exec mi-ray-head ray list nodes --format json > "$E/nodes.json" 2>&1 ;;
  tasks|objects|spill|fault)
    docker exec mi-ray-head python /shared/ry/ry_core.py $sec > "$E/$sec.jsonl" 2> "$E/$sec.err"
    [ $sec = spill ] && docker exec mi-ray-head ray memory --stats-only > "$E/spill_memory.txt" 2>&1
    [ $sec = objects ] && docker exec mi-ray-head ray memory --stats-only > "$E/objects_memory.txt" 2>&1 ;;
  lineage)
    docker exec mi-ray-head sh -c 'rm -f /shared/ry/out/runs.log'
    docker exec -d mi-ray-head sh -c 'python /shared/ry/ry_core.py lineage > /shared/ry/out/lineage.jsonl 2> /shared/ry/out/lineage.err'
    i=0; until docker exec mi-ray-head grep -q READY /shared/ry/out/lineage.jsonl 2>/dev/null || [ $i -ge 120 ]; do sleep 1; i=$((i+1)); done
    date +%s.%N > "$E/lineage_kill_time.txt"; docker kill mi-ray-w2 >/dev/null
    docker exec mi-ray-head touch /shared/ry/GO
    i=0; until docker exec mi-ray-head grep -q '"ev": "end"' /shared/ry/out/lineage.jsonl 2>/dev/null || [ $i -ge 400 ]; do sleep 1; i=$((i+1)); done
    docker cp mi-ray-head:/shared/ry/out/lineage.jsonl "$E/"; docker cp mi-ray-head:/shared/ry/out/lineage.err "$E/"; docker cp mi-ray-head:/shared/ry/out/runs.log "$E/lineage_runs.log"
    docker exec mi-ray-head sh -c 'grep -h -i "health check\|dead\|died" /tmp/ray/session_latest/logs/gcs_server.out | tail -20' > "$E/lineage_gcs.txt" 2>&1
    docker start mi-ray-w2 >/dev/null; date +%s.%N > "$E/lineage_restart_time.txt"
    i=0; until docker exec mi-ray-head ray status 2>/dev/null | grep -q "/4.0 CPU" || [ $i -ge 90 ]; do sleep 1; i=$((i+1)); done ;;
  data)
    for m in ${DATA_MODES:-streaming pipelined staged}; do
      docker exec mi-ray-head python /shared/ry/ry_data.py $m > "$E/data_$m.out" 2> "$E/data_$m.err"
      docker cp mi-ray-head:/shared/ry/out/data_$m.log "$E/"; stats
    done ;;
  train)
    docker exec mi-ray-head sh -c 'rm -rf /shared/results/${TNAME:-ry-t1} /shared/logs/${TNAME:-ry-t1} /shared/ry/marks/${TNAME:-ry-t1}.crashed /shared/ry/out/${TNAME:-ry-t1}_ctl.log'
    docker exec mi-ray-head python /shared/ry/ry_train.py --name ${TNAME:-ry-t1} --max-failures 1 --crash-rank 3 --crash-step 120 > "$E/train.out" 2> "$E/train.err"
    mkdir -p "$E/train_logs"; docker cp mi-ray-head:/shared/logs/${TNAME:-ry-t1}/. "$E/train_logs/"; docker cp mi-ray-head:/shared/ry/out/${TNAME:-ry-t1}_ctl.log "$E/"
    docker exec mi-ray-head sh -c 'cd /shared/results/${TNAME:-ry-t1} && find . -maxdepth 2 | sort && du -sb checkpoint_* 2>/dev/null' > "$E/train_storage.txt" 2>&1 ;;
  esac
  stats
done
docker exec mi-ray-head sh -c 'grep -h "Killing worker\|memory monitor\|exceeded threshold" /tmp/ray/session_latest/logs/raylet.out | tail -5' > "$E/head_oom.txt" 2>&1
if [ "${KEEP:-0}" != 1 ]; then
  # stop Ray unless another lab is waiting (a waiter shows as nothing here; ask the lead's status file)
  sh "$R/ray/down.sh"
fi
sh "$S/inf/lock.sh" release ray ry
echo "== done $(date -u +%H:%M:%S)"
