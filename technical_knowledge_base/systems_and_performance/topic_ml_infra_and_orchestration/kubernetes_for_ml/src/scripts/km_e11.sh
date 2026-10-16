#!/bin/sh
# E11: the root's deadlock input (three 2-pod jobs, each pod a whole worker's 4 fake GPUs, released in the
# order a0 b0 c0 a1 b1 c1) without and with native gang scheduling (PodGroup, GenericWorkload on).
# The PodGroups carry the finalizer scheduling.k8s.io/podgroup-protection, which a kube-controller-manager
# controller removes when its gate is on; only the API server and scheduler were switched here, so the run
# removes the finalizer itself.
# usage (inside the kind lock, gang reconfig on): S=... H=... OUT=... sh km_e11.sh nogang|gang
. "$H/scripts/km_lib.sh"
M=$1; T=e11$M; SECS=30; [ "$M" = nogang ] && SECS=600
snap() { { echo "## $(date -u +%H:%M:%S) $1"; k -n km get pods -o custom-columns='POD:.metadata.name,PHASE:.status.phase,NODE:.spec.nodeName,GATES:.spec.schedulingGates[*].name' ; } >> "$OUT/$T.snap"; }
wstart $T; date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/$T.since"
for j in km-a km-b km-c; do
  [ "$M" = gang ] && sh "$H/k8s/gang-podgroup.sh" $j | k create -f - > /dev/null
  for i in 0 1; do sh "$H/k8s/gang-pod.sh" $j $i $SECS $M | k create -f - > /dev/null || log "$T create failed $j-$i"; done; done
snap "created, all gated"
for i in 0 1; do for j in km-a km-b km-c; do
  k -n km patch pod $j-$i --type=json -p '[{"op":"remove","path":"/spec/schedulingGates"}]' > /dev/null; log "$T released $j-$i"; sleep 1; done; done
sleep 8; snap "8 s after the last release"
if [ "$M" = gang ]; then
  for t in 30 60 90; do sleep 30; snap "$t s later"; done
  k -n km get podgroups -o yaml > "$OUT/$T.podgroups.yaml" 2>&1
else sleep 20; snap "28 s after the last release"; fi
k -n km get events -o custom-columns='EVENTTIME:.eventTime,FIRST:.firstTimestamp,OBJ:.involvedObject.name,REASON:.reason,MSG:.message' --sort-by=.metadata.creationTimestamp > "$OUT/$T.events.txt"
k -n kube-system logs kube-scheduler-mi-kind-control-plane --since-time="$(cat "$OUT/$T.since")" > "$OUT/$T.schedlog.txt" 2>&1
wstop $T; k -n km delete pods --all --wait=true > /dev/null; for g in km-a km-b km-c; do k -n km patch podgroup $g --type=merge -p '{"metadata":{"finalizers":null}}' > /dev/null 2>&1; done; k -n km delete podgroups --all --wait=false > /dev/null 2>&1; k -n km delete events --all > /dev/null 2>&1
