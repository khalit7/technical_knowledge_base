#!/bin/sh
# E2: the running example's crash and eviction under different Job failure policies.
# usage (inside the kind lock): S=... H=... OUT=... sh km_e2.sh a|b|c|d1|d2
. "$H/scripts/km_lib.sh"
crash() { # crash <run> <policy>: rank 1 exits 13 after step 20, every attempt (no checkpoint before step 50)
  wstart "$1"; log "$1 create ($2)"
  sh "$H/k8s/train-indexed-job.sh" "km-$1" "$2" --steps 200 --crash-rank 1 --crash-step 20 --no-resume | k create -f -
  r=$(wjob "km-$1" 400); log "$1 done $r"; sleep 3
  dump "$1" "job/km-$1"; podlogs "$1" 25; wstop "$1"; clean_ns; }
evict() { # evict <run> <policy>: evict pod index 1 once the run has passed its step-50 checkpoint
  wstart "$1"; log "$1 create ($2)"
  sh "$H/k8s/train-indexed-job.sh" "km-$1" "$2" --steps 200 --step-sleep-ms 150 | k create -f -
  L="$S/mi/shared/k8s/logs/km-$1/rank0.jsonl"; i=0
  while [ $i -lt 120 ]; do grep -q '"ev": "ckpt"' "$L" 2>/dev/null && break; sleep 1; i=$((i+1)); done
  sleep 2; p=$(k -n km get pods -l batch.kubernetes.io/job-completion-index=1 -o name | head -1 | cut -d/ -f2)
  log "$1 evict $p"; KUBECONFIG="$S/mi/kubeconfig" "$PY" "$H/scripts/km_evict.py" km "$p" | tee -a "$OUT/driver.log"
  r=$(wjob "km-$1" 400); log "$1 done $r"; sleep 3
  dump "$1" "job/km-$1"; podlogs "$1" 25; wstop "$1"; clean_ns; }
case "$1" in
a) crash e2a none;; b) crash e2b exit13;; c) crash e2c exit13ok;;
d1) evict e2d1 nopolicy0;; d2) evict e2d2 disrupt0;;
esac
