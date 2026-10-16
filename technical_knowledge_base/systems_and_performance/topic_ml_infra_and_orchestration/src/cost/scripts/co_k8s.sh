#!/bin/sh
# Cost lab: the running example on kind (JobSet admitted by Kueue), recorded for its accounting.
# usage: K=<kubectl wrapper> SHARED=<host folder mounted at /shared> OUT=<dir> sh co_k8s.sh <name> <steps>
# Writes OUT/<name>/: workload.json (Kueue conditions with times), events.txt, rank0..3.jsonl
set -eu
N=$1; STEPS=$2; D="$OUT/$N"; mkdir -p "$D"
cat <<EOF | sh "$K" create -f -
apiVersion: jobset.x-k8s.io/v1alpha2
kind: JobSet
metadata: {name: $N, namespace: mi, labels: {kueue.x-k8s.io/queue-name: mi-lq}}
spec:
  failurePolicy: {maxRestarts: 0}
  replicatedJobs:
  - name: node
    replicas: 1
    template:
      spec:
        parallelism: 2
        completions: 2
        completionMode: Indexed
        backoffLimit: 0
        template:
          spec:
            restartPolicy: Never
            containers:
            - name: trainer
              image: mi-train:1
              imagePullPolicy: Never
              command: ["sh", "-c"]
              args:
              - >-
                exec torchrun --nnodes=2 --nproc-per-node=2 --node-rank=\$JOB_COMPLETION_INDEX
                --master-addr=$N-node-0-0.$N --master-port=29500
                /opt/mi/train.py --steps $STEPS --ckpt-every 50 --no-resume
                --ckpt-dir=/shared/ckpt/$N --log-dir=/shared/logs/$N
              resources:
                requests: {cpu: "1", memory: 900Mi, example.com/gpu: "2"}
                limits: {cpu: "2", memory: 900Mi, example.com/gpu: "2"}
              volumeMounts: [{name: shared, mountPath: /shared}]
            volumes: [{name: shared, hostPath: {path: /shared, type: Directory}}]
EOF
date -u +%Y-%m-%dT%H:%M:%S.%NZ > "$D/submitted.txt" 2>/dev/null || date -u > "$D/submitted.txt"
i=0
while [ $i -lt 200 ]; do
  s=$(sh "$K" -n mi get jobset "$N" -o jsonpath='{.status.terminalState}' 2>/dev/null || true)
  [ -n "$s" ] && break; sleep 2; i=$((i+1))
done
echo "terminal: $s"
sleep 3
sh "$K" -n mi get workloads -o json > "$D/workloads_all.json"
sh "$K" -n mi get events --sort-by=.lastTimestamp -o custom-columns=TIME:.lastTimestamp,ETIME:.eventTime,KIND:.involvedObject.kind,NAME:.involvedObject.name,REASON:.reason,MSG:.message | grep "$N" > "$D/events.txt" || true
cp "$SHARED/logs/$N"/rank*.jsonl "$D/"
sh "$K" -n mi delete jobset "$N" --wait=true
rm -rf "$SHARED/logs/$N" "$SHARED/ckpt/$N"
