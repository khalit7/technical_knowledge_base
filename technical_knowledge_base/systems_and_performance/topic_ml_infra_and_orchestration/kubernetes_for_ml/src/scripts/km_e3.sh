#!/bin/sh
# E3: the running example as a JobSet: the objects it creates (a), and its failure policy against an
# eviction (b) and a crash (c). usage (inside the kind lock): S=... H=... OUT=... sh km_e3.sh a|b|c
. "$H/scripts/km_lib.sh"
wjs() { i=0; while [ $i -lt "${2:-400}" ]; do
  s=$(k -n km get jobset "$1" -o jsonpath='{.status.terminalState}' 2>/dev/null)
  [ -n "$s" ] && { echo "$s"; return 0; }; sleep 2; i=$((i+2)); done; echo TIMEOUT; }
jsdump() { n=$1; js=$2
  { k -n km get jobset "$js" -o yaml; echo ---; k -n km get jobs -o yaml; echo ---; k -n km get svc -o yaml; echo ---
    k -n km get endpointslices -o yaml; } > "$OUT/$n.objects.yaml" 2>&1
  k -n km get pods -o yaml > "$OUT/$n.pods.yaml" 2>&1
  k -n km get events -o custom-columns='FIRST:.firstTimestamp,EVENTTIME:.eventTime,KIND:.involvedObject.kind,OBJ:.involvedObject.name,REASON:.reason,FROM:.reportingComponent,MSG:.message' --sort-by=.metadata.creationTimestamp > "$OUT/$n.events.txt" 2>&1; }
jsclean() { k -n km delete jobsets --all --wait=true > /dev/null 2>&1; clean_ns; }
case "$1" in
a) wstart e3a; log "e3a create"; sh "$H/k8s/train-jobset.sh" km-e3a plain - | k create -f -
   sleep 6; k -n km get pods -o yaml > "$OUT/e3a.pods_running.yaml"
   for p in $(k -n km get pods -o name); do echo "## $p"; k -n km exec "${p#pod/}" -- sh -c 'hostname; hostname -f; env | grep -E "^(JOB_|JOBSET|REPLICATED|MASTER|TORCHELASTIC|HOSTNAME)" | sort; getent hosts km-e3a-node-0-0.km-e3a' 2>&1; done > "$OUT/e3a.exec.txt"
   r=$(wjs km-e3a); log "e3a done $r"; sleep 2; jsdump e3a km-e3a; wstop e3a; jsclean;;
b) wstart e3b; log "e3b create"; sh "$H/k8s/train-jobset.sh" km-e3b policy - --steps 200 --step-sleep-ms 150 | k create -f -
   L="$S/mi/shared/k8s/logs/km-e3b/rank0.jsonl"; i=0
   while [ $i -lt 120 ]; do grep -q '"ev": "ckpt"' "$L" 2>/dev/null && break; sleep 1; i=$((i+1)); done
   sleep 2; p=$(k -n km get pods -l batch.kubernetes.io/job-completion-index=1 -o name | head -1 | cut -d/ -f2)
   log "e3b evict $p"; KUBECONFIG="$S/mi/kubeconfig" "$PY" "$H/scripts/km_evict.py" km "$p" | tee -a "$OUT/driver.log"
   r=$(wjs km-e3b 400); log "e3b done $r"; sleep 2; jsdump e3b km-e3b; podlogs e3b 12; wstop e3b; jsclean;;
c) wstart e3c; log "e3c create"; sh "$H/k8s/train-jobset.sh" km-e3c policy - --steps 200 --crash-rank 1 --crash-step 20 --no-resume | k create -f -
   r=$(wjs km-e3c 300); log "e3c done $r"; sleep 2; jsdump e3c km-e3c; podlogs e3c 12; wstop e3c; jsclean;;
esac
