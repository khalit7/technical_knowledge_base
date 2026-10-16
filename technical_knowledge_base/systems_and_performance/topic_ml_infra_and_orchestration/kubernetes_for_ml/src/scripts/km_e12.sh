#!/bin/sh
# E12: install Kubeflow Trainer v2.3.0 (CRDs, controller, webhooks; JobSet already present), run the running
# example as a TrainJob, record what the controller built, uninstall. usage (inside the kind lock):
# S=... H=... OUT=... TR=<rendered trainer.km.yaml> RT=<rendered runtimes.yaml> sh km_e12.sh
. "$H/scripts/km_lib.sh"
mem() { echo "$(date -u +%H:%M:%S) $1 control plane $(docker stats --no-stream --format '{{.MemUsage}}' mi-kind-control-plane)" | tee -a "$OUT/e12.mem.txt"; }
mem "before install"
"$S/mi/bin/kind" load docker-image --name mi-kind --nodes mi-kind-worker,mi-kind-worker2,mi-kind-worker3 ghcr.io/kubeflow/trainer/trainer-controller-manager:v2.3.0 2>&1 | tail -1
k apply --server-side -f "$TR" > "$OUT/e12.install.txt" 2>&1; mem "after apply"
k -n kubeflow-system rollout status deployment/kubeflow-trainer-controller-manager --timeout=180s 2>&1 | tail -1
i=0; while [ $i -lt 30 ]; do python3 -c "
import sys,yaml
d=[x for x in yaml.safe_load_all(open('$RT')) if x and x['metadata']['name']=='torch-distributed']
print(yaml.safe_dump(d[0]))" | k apply -f - > "$OUT/e12.runtime.txt" 2>&1 && break; sleep 4; i=$((i+1)); done; cat "$OUT/e12.runtime.txt"; mem "controller ready"
wstart e12; k create -f "$H/k8s/e12-trainjob.yaml"; sleep 5
k -n km get trainjob km-tj -o yaml > "$OUT/e12.trainjob_t5.yaml"; k -n km get jobset km-tj -o yaml > "$OUT/e12.jobset.yaml" 2>&1
i=0; while [ $i -lt 90 ]; do c=$(k -n km get trainjob km-tj -o jsonpath='{range .status.conditions[?(@.status=="True")]}{.type}{" "}{end}'); case "$c" in *Complete*|*Failed*) break;; esac; sleep 2; i=$((i+1)); done
log "e12 trainjob: $c"; mem "after run"
k -n km get trainjob km-tj -o yaml > "$OUT/e12.trainjob.yaml"; k -n km get jobset km-tj -o yaml > "$OUT/e12.jobset_end.yaml" 2>&1
k -n km get jobs -o yaml > "$OUT/e12.jobs.yaml"; k -n km get pods -o yaml > "$OUT/e12.pods.yaml"; k -n km get svc -o yaml > "$OUT/e12.svc.yaml"
podlogs e12 4; k -n km get events -o custom-columns='EVENTTIME:.eventTime,FIRST:.firstTimestamp,KIND:.involvedObject.kind,OBJ:.involvedObject.name,REASON:.reason,FROM:.reportingComponent,MSG:.message' --sort-by=.metadata.creationTimestamp > "$OUT/e12.events.txt"
k -n kubeflow-system logs deployment/kubeflow-trainer-controller-manager --tail=60 > "$OUT/e12.ctrl.log" 2>&1
wstop e12
k -n km delete trainjob km-tj --wait=true > /dev/null; sleep 3; k delete clustertrainingruntime torch-distributed > /dev/null
k delete -f "$TR" --wait=true > "$OUT/e12.uninstall.txt" 2>&1; mem "after uninstall"
for w in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do docker exec $w crictl rmi ghcr.io/kubeflow/trainer/trainer-controller-manager:v2.3.0 > /dev/null 2>&1; done
clean_ns; k get crd | grep -c trainer.kubeflow.org
