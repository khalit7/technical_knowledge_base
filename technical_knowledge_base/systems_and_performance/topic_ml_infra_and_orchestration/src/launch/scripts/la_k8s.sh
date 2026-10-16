#!/bin/sh
# Launch lab, Kubernetes: submit one JobSet from la-jobset.yaml inside the kind control plane (so the submit
# timestamp and the pods share the Docker VM's clock), wait for it to finish, save the evidence, delete it.
# usage: la_k8s.sh NAME MASTER "ARGS" "POD1" "RDZV" CPU MEM WAIT_S
#   LA_EVID: host folder for evidence (one subfolder per run); WAIT_S -1 = submit only, -2 = collect only
set -u
NAME=$1 MASTER=$2 ARGS=$3 POD1=$4 RDZV=$5 CPU=$6 MEM=$7 WAIT=${8:-300}
HERE=$(cd "$(dirname "$0")" && pwd)
E="$LA_EVID/$NAME"; mkdir -p "$E"
K="docker exec -i mi-kind-control-plane kubectl --kubeconfig /etc/kubernetes/admin.conf"
sed -e "s|__NAME__|$NAME|g" -e "s|__MASTER__|$MASTER|g" -e "s|__ARGS__|$ARGS|g" -e "s|__POD1__|$POD1|g" \
    -e "s|__RDZV__|$RDZV|g" -e "s|__CPU__|$CPU|g" -e "s|__MEM__|$MEM|g" "$HERE/la-jobset.yaml" > "$E/jobset.yaml"
if [ "$WAIT" = "-2" ]; then WAIT=1200   # collect only: the JobSet was submitted earlier
else docker exec -i mi-kind-control-plane sh -c 'date +%s.%N; kubectl --kubeconfig /etc/kubernetes/admin.conf create -f -' \
  < "$E/jobset.yaml" > "$E/submit.txt" 2>&1; fi
[ "$WAIT" = "-1" ] && exit 0   # submit only (the caller waits and collects)
t=0; st=""
while [ $t -lt "$WAIT" ]; do
  st=$($K -n mi get jobset "$NAME" -o jsonpath='{range .status.conditions[?(@.status=="True")]}{.type} {end}' 2>/dev/null)
  case "$st" in *Completed*|*Failed*) break;; esac
  sleep 2; t=$((t+2))
done
echo "$st after ${t}s" > "$E/final.txt"
$K -n mi get workloads -o json > "$E/workloads.json" 2>/dev/null
$K -n mi get pods -l jobset.sigs.k8s.io/jobset-name="$NAME" -o json > "$E/pods.json" 2>/dev/null
$K -n mi get jobset "$NAME" -o json > "$E/jobset_status.json" 2>/dev/null
$K -n mi get svc "$NAME" -o json > "$E/svc.json" 2>/dev/null
$K -n mi get events -o json > "$E/events_all.json" 2>/dev/null
for p in $($K -n mi get pods -l jobset.sigs.k8s.io/jobset-name="$NAME" -o name 2>/dev/null); do
  $K -n mi logs "$p" > "$E/$(basename $p).log" 2>&1
done
$K -n mi delete jobset "$NAME" --wait=true > /dev/null 2>&1
echo "$NAME: $st (${t}s)"
