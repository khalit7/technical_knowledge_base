#!/bin/sh
# Launch lab, Kubernetes: one rank stalls mid-run; look at it with py-spy and the flight recorder while the others
# wait in an all-reduce, then record how the job ends. py-spy runs in the kind NODE container (which has
# CAP_SYS_PTRACE; the pods do not), against the pod's process as the node sees it.
# usage: la_k8s_stall.sh NAME   (LA_EVID as for la_k8s.sh; LA_SHARED: host folder mounted at /shared on the nodes;
#        the py-spy binary at /shared/la/py-spy)
set -u
NAME=$1; HERE=$(cd "$(dirname "$0")" && pwd)
E="$LA_EVID/$NAME"; mkdir -p "$E"
K="docker exec -i mi-kind-control-plane kubectl --kubeconfig /etc/kubernetes/admin.conf"
ARGS="--steps 20 --ckpt-every 0 --slow-rank 3 --slow-ms 600000 --timeout-s 60"
sh "$HERE/la_k8s.sh" "$NAME" "$NAME-node-0-0.$NAME" "$ARGS" "" "" 1 900Mi -1
# wait until rank 0 has logged step 1 (rank 3 is then asleep inside step 1, before its log line; the others block in step 2)
for i in $(seq 90); do grep -q '"step": 1,' "$LA_SHARED/la/runs/$NAME/rank0.jsonl" 2>/dev/null && break; sleep 1; done
sleep 15
date +%s.%N > "$E/inspect_ts.txt"
for node in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do
  for pid in $(docker exec $node pgrep -f la_probe.py); do
    r=$(docker exec $node sh -c "tr '\0' '\n' < /proc/$pid/environ | sed -n 's/^RANK=//p'")
    [ -z "$r" ] && continue
    docker exec $node /shared/la/py-spy dump --pid "$pid" > "$E/pyspy_rank$r.txt" 2>&1
    [ "$r" = 3 ] || [ "$r" = 0 ] && docker exec $node kill -USR1 "$pid"
  done
done
# now wait for the JobSet to end and collect
t=0; while [ $t -lt 400 ]; do
  st=$($K -n mi get jobset "$NAME" -o jsonpath='{range .status.conditions[?(@.status=="True")]}{.type} {end}' 2>/dev/null)
  case "$st" in *Completed*|*Failed*) break;; esac; sleep 2; t=$((t+2)); done
echo "$st" > "$E/final.txt"
$K -n mi get pods -l jobset.sigs.k8s.io/jobset-name="$NAME" -o json > "$E/pods.json"
for p in $($K -n mi get pods -l jobset.sigs.k8s.io/jobset-name="$NAME" -o name); do $K -n mi logs "$p" > "$E/$(basename $p).log" 2>&1; done
$K -n mi get events -o json > "$E/events_all.json"
$K -n mi delete jobset "$NAME" --wait=true > /dev/null 2>&1
echo "$NAME: $st"
