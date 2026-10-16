#!/bin/sh
# One batch Job for Kueue: <pods> pods of <gpus> fake GPUs each, sleeping <secs>.
# usage: sh kueue-job.sh <name> <pods> <gpus> <localqueue> [required|preferred <topology level>] [secs]
N=$1; P=$2; G=$3; Q=$4; MODE=${5:-}; LVL=${6:-}; SECS=${7:-90}
cat <<EOF2
apiVersion: batch/v1
kind: Job
metadata:
  name: $N
  namespace: km
  labels: {kueue.x-k8s.io/queue-name: $Q}
spec:
  parallelism: $P
  completions: $P
  completionMode: Indexed
  template:
EOF2
[ -n "$MODE" ] && [ "$MODE" != - ] && cat <<EOF2
    metadata:
      annotations: {kueue.x-k8s.io/podset-$MODE-topology: $LVL}
EOF2
cat <<EOF2
    spec:
      restartPolicy: Never
      terminationGracePeriodSeconds: 1
      containers:
      - name: hold
        image: mi-train:1
        imagePullPolicy: Never
        command: ["sleep", "$SECS"]
        resources:
          requests: {cpu: 100m, memory: 64Mi, example.com/gpu: "$G"}
          limits: {memory: 64Mi, example.com/gpu: "$G"}
EOF2
