#!/bin/sh
# The Scheduling lab's Kubernetes runs on kind (mi-kind). usage: sh k8s_runs.sh <kubectl wrapper> <raw out dir> [k1|k2|k3|all]
#   k1: three JobSets of 2 pods x 4 fake GPUs on 3 workers (12 fake GPUs), no Kueue, default scheduler.
#       Pods are released in the interleaved order a0 b0 c0 a1 b1 c1: every job gets half its pods.
#   k2: the same three JobSets through Kueue (LocalQueue sc-lq -> ClusterQueue mi-cq): admitted whole, one after another.
#   k3: quota borrowing and reclaim in a cohort: team a fills the cluster by borrowing, team b reclaims its share.
set -u
KC=$1; OUT=$2; WHAT=${3:-all}; H=$(cd "$(dirname "$0")" && pwd)
k() { sh "$KC" "$@"; }
log() { echo "$(date -u +%H:%M:%S) $*" | tee -a "$OUT/driver.log"; }
mkdir -p "$OUT"
pods() { k -n sc get pods -o custom-columns='POD:.metadata.name,JOBSET:.metadata.labels.jobset\.sigs\.k8s\.io/jobset-name,IDX:.metadata.labels.batch\.kubernetes\.io/job-completion-index,PHASE:.status.phase,NODE:.spec.nodeName,START:.status.startTime' 2>&1; }
events() { k -n sc get events -o custom-columns='FIRST:.firstTimestamp,LAST:.lastTimestamp,EVENTTIME:.eventTime,KIND:.involvedObject.kind,OBJ:.involvedObject.name,REASON:.reason,MSG:.message' --sort-by=.metadata.creationTimestamp 2>&1; }
snap() { { echo "## $(date -u +%H:%M:%S) $2"; pods; echo; k -n sc get workloads 2>&1; echo; k get clusterqueues 2>&1; } >> "$OUT/$1.snap"; }

k1() {
  k apply -f "$H/sc-queues.yaml" > /dev/null
  for n in a b c; do sh "$H/jobset.sh" sc-$n gated | k create -f - ; done
  for i in $(seq 30); do [ "$(k -n sc get pods --no-headers 2>/dev/null | wc -l)" -ge 6 ] && break; sleep 2; done
  snap k1 "created, all gated"
  for idx in 0 1; do for n in a b c; do
    p=$(k -n sc get pods -l jobset.sigs.k8s.io/jobset-name=sc-$n,batch.kubernetes.io/job-completion-index=$idx -o name)
    k -n sc patch "$p" --type=json -p '[{"op":"remove","path":"/spec/schedulingGates"}]' > /dev/null
    log "k1 released sc-$n pod $idx ($p)"; sleep 1
  done; done
  sleep 20; snap k1 "20 s after release"
  sleep 40; snap k1 "60 s after release"
  { for n in a b c; do for p in $(k -n sc get pods -l jobset.sigs.k8s.io/jobset-name=sc-$n -o name); do
      echo "## logs $p"; k -n sc logs "$p" --tail=8 2>&1; done; done
    echo "## describe a pending pod"; p=$(k -n sc get pods --field-selector=status.phase=Pending -o name | head -1); k -n sc describe "$p" | sed -n '/Events:/,$p'
    echo "## node allocation"; for w in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do echo "# $w"; k describe node $w | sed -n '/Allocated resources/,/Events/p'; done; } > "$OUT/k1.detail" 2>&1
  sleep 120; snap k1 "180 s after release"
  { echo "## logs at 180 s"; for p in $(k -n sc get pods -o name); do echo "# $p"; k -n sc logs "$p" --tail=5 2>&1; done; } >> "$OUT/k1.detail"
  events > "$OUT/k1.events"
  k -n sc get jobsets -o wide > "$OUT/k1.jobsets" 2>&1
  k -n sc delete jobsets --all --wait=true > /dev/null
  k -n sc delete events --all > /dev/null 2>&1
  log "k1 done"
}

k2() {
  k apply -f "$H/sc-queues.yaml" > /dev/null
  for n in a b c; do sh "$H/jobset.sh" sc-$n kueue | k create -f - ; done
  log "k2 created sc-a sc-b sc-c"
  sleep 5; snap k2 "5 s after create"
  k -n sc get workloads -o yaml > "$OUT/k2.workloads_t5.yaml" 2>&1
  for i in $(seq 90); do
    done_n=$(k -n sc get jobsets -o jsonpath='{range .items[*]}{.status.terminalState}{"\n"}{end}' | grep -c Completed)
    [ "$done_n" -ge 3 ] && break; sleep 3; done
  snap k2 "all completed"
  events > "$OUT/k2.events"
  k -n sc get workloads -o yaml > "$OUT/k2.workloads_end.yaml" 2>&1
  pods > "$OUT/k2.pods"
  k -n sc delete jobsets --all --wait=true > /dev/null
  k -n sc delete events --all > /dev/null 2>&1
  log "k2 done"
}

k3() {
  k apply -f "$H/sc-queues.yaml" > /dev/null
  for i in 1 2 3; do sh "$H/team-job.sh" sc-a$i a 150 | k create -f - ; sleep 1; done
  log "k3 team a submitted 3 x 4 GPUs"
  sleep 15; snap k3 "team a alone"
  k get clusterqueue sc-cq-a sc-cq-b -o yaml > "$OUT/k3.cq_borrow.yaml"
  sh "$H/team-job.sh" sc-b1 b 40 | k create -f -
  log "k3 team b submitted 1 x 4 GPUs"
  sleep 15; snap k3 "15 s after team b"
  for i in $(seq 100); do
    n=$(k -n sc get jobs -o jsonpath='{range .items[*]}{.status.succeeded}{"\n"}{end}' | grep -c 1)
    [ "$n" -ge 4 ] && break; sleep 3; done
  snap k3 "all done"
  events > "$OUT/k3.events"
  k -n sc get workloads -o yaml > "$OUT/k3.workloads_end.yaml" 2>&1
  k -n sc delete jobs --all --wait=true > /dev/null
  log "k3 done"
}

case "$WHAT" in k1) k1;; k2) k2;; k3) k3;; all) k1; k2; k3;; esac
