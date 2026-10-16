#!/bin/sh
# E10: Kueue flavor assignment (a) and topology-aware scheduling (b).
# usage (inside the kind lock): S=... H=... OUT=... sh km_e10.sh a|b
. "$H/scripts/km_lib.sh"
wl() { k -n km get workloads -o yaml > "$OUT/$1.workloads.yaml"; k -n km get workloads -o wide > "$OUT/$1.workloads.txt" 2>&1; k get clusterqueue "$2" -o yaml > "$OUT/$1.cq.yaml"; }
case "$1" in
a) k apply -f "$H/k8s/e10-kueue.yaml" > /dev/null; sleep 2; wstart e10a
   for j in 1 2 3 4; do sh "$H/k8s/kueue-job.sh" km-q$j 2 2 km-lq - - 120 | k create -f - > /dev/null; log "e10a km-q$j created"; sleep 3; done
   sleep 6; wl e10a km-cq; k -n km get pods -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,PHASE:.status.phase,SELECTOR:.spec.nodeSelector' > "$OUT/e10a.pods.txt"
   dump e10a; wstop e10a; k -n km delete jobs --all --wait=true >/dev/null; sleep 2; k -n km delete workloads --all >/dev/null 2>&1; clean_ns;;
b) k apply -f "$H/k8s/e10-kueue.yaml" > /dev/null
   for w in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do k label node $w km.example.com/tas=true --overwrite > /dev/null; done; sleep 3; wstart e10b
   sh "$H/k8s/kueue-job.sh" km-t1 3 2 km-lq-tas required mi.example.com/block 60 | k create -f - >/dev/null; log "e10b km-t1 (3 x 2 GPUs, one block required)"; sleep 8
   wl e10b1 km-cq-tas; k -n km get pods -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,PHASE:.status.phase,SELECTOR:.spec.nodeSelector,GATES:.spec.schedulingGates' > "$OUT/e10b1.pods.txt"
   k -n km delete jobs --all --wait=true >/dev/null; sleep 3
   sh "$H/k8s/kueue-job.sh" km-t2 3 4 km-lq-tas required mi.example.com/block 60 | k create -f - >/dev/null; log "e10b km-t2 (3 x 4 GPUs, one block required)"; sleep 8
   wl e10b2 km-cq-tas; k -n km get pods -o wide > "$OUT/e10b2.pods.txt" 2>&1
   k -n km delete jobs --all --wait=true >/dev/null; sleep 3
   sh "$H/k8s/kueue-job.sh" km-t3 3 4 km-lq-tas preferred mi.example.com/block 60 | k create -f - >/dev/null; log "e10b km-t3 (3 x 4 GPUs, one block preferred)"; sleep 8
   wl e10b3 km-cq-tas; k -n km get pods -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,PHASE:.status.phase,SELECTOR:.spec.nodeSelector' > "$OUT/e10b3.pods.txt"
   dump e10b; wstop e10b; k -n km delete jobs --all --wait=true >/dev/null; sleep 2; k -n km delete workloads --all >/dev/null 2>&1; clean_ns
   for w in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do k label node $w km.example.com/tas- > /dev/null; done;;
z) k delete -f "$H/k8s/e10-kueue.yaml" --wait=true 2>&1 | tail -3;;
esac
