#!/bin/sh
# E6: the same five pods (2, 1, 1, 2, 2 fake GPUs), then one 4-GPU pod, placed by the default profile
# (spread on cpu and memory) and by the km-binpack profile (MostAllocated with GPUs counted).
# usage (inside the kind lock, scheduler reconfigured): S=... H=... OUT=... sh km_e6.sh <profile> <tag>
. "$H/scripts/km_lib.sh"
P=$1; T=$2; i=0
k get nodes -o json > "$OUT/$T.nodes_before.json"
k get pods -A -o json > "$OUT/$T.allpods_before.json"
date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/$T.since"
for g in 2 1 1 2 2 4; do i=$((i+1))
  sh "$H/k8s/gpu-pod.sh" "km-$T-p$i" "$g" "$P" | k create -f - > /dev/null
  j=0; while [ $j -lt 10 ]; do n=$(k -n km get pod "km-$T-p$i" -o jsonpath='{.spec.nodeName}'); [ -n "$n" ] && break; sleep 1; j=$((j+1)); done
  log "$T p$i gpus=$g -> ${n:-PENDING}"
done
sleep 3
k -n km get pods -o wide > "$OUT/$T.pods.txt"
k -n km get events -o custom-columns='EVENTTIME:.eventTime,OBJ:.involvedObject.name,REASON:.reason,MSG:.message' --sort-by=.metadata.creationTimestamp > "$OUT/$T.events.txt"
k -n kube-system logs kube-scheduler-mi-kind-control-plane --since-time="$(cat "$OUT/$T.since")" > "$OUT/$T.schedlog.txt" 2>&1
k -n km delete pods -l app=km-gpu --wait=true > /dev/null; k -n km delete events --all > /dev/null 2>&1
