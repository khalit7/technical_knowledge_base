#!/bin/sh
# E5: priority and preemption (a); topology spread next to a tainted node (b).
# usage (inside the kind lock): S=... H=... OUT=... sh km_e5.sh a|b
. "$H/scripts/km_lib.sh"
case "$1" in
a) wstart e5a; k apply -f "$H/k8s/e5-priority.yaml" > /dev/null
   for i in 1 2 3; do sh "$H/k8s/gpu-pod.sh" km-low-$i 4 default-scheduler km-low | k create -f - >/dev/null; done; sleep 6
   k -n km get pods -o wide > "$OUT/e5a.pods_low.txt"; log "e5a low pods placed"
   sh "$H/k8s/gpu-pod.sh" km-high-nopreempt 4 default-scheduler km-high-nopreempt | k create -f - >/dev/null; sleep 6
   k -n km get pods -o wide > "$OUT/e5a.pods_nopreempt.txt"; log "e5a nopreempt created"
   sh "$H/k8s/gpu-pod.sh" km-high 4 default-scheduler km-high | k create -f - >/dev/null; sleep 10
   k -n km get pods -o wide > "$OUT/e5a.pods_high.txt"; log "e5a high created"
   dump e5a pod/km-high; k -n kube-system logs kube-scheduler-mi-kind-control-plane --since=40s > "$OUT/e5a.schedlog.txt" 2>&1
   wstop e5a; k -n km delete pods --all --wait=true >/dev/null; k delete -f "$H/k8s/e5-priority.yaml" >/dev/null; k -n km delete events --all >/dev/null 2>&1;;
b) for pol in Ignore Honor; do T=e5b-$(echo $pol | tr A-Z a-z)
     k taint node mi-kind-worker3 km.example.com/reserved=inference:NoSchedule > /dev/null
     for i in 1 2 3; do sh "$H/k8s/spread-pod.sh" km-sp-$i $pol | k create -f - >/dev/null; sleep 2; done; sleep 4
     k -n km get pods -o wide > "$OUT/$T.pods.txt"; log "$T placed"
     k -n km get events -o custom-columns='EVENTTIME:.eventTime,OBJ:.involvedObject.name,REASON:.reason,MSG:.message' --sort-by=.metadata.creationTimestamp > "$OUT/$T.events.txt"
     k -n km delete pods --all --wait=true >/dev/null; k -n km delete events --all >/dev/null 2>&1
     k taint node mi-kind-worker3 km.example.com/reserved- > /dev/null
   done;;
esac
