#!/bin/sh
# Print one placeholder pod that holds <gpus> fake GPUs (example.com/gpu) and sleeps.
# usage: sh gpu-pod.sh <name> <gpus> [schedulerName] [priorityClassName]
N=$1; G=$2; SN=${3:-default-scheduler}; PC=${4:-}
cat <<EOF2
apiVersion: v1
kind: Pod
metadata: {name: $N, namespace: km, labels: {app: km-gpu}}
spec:
  schedulerName: $SN
EOF2
[ -n "$PC" ] && echo "  priorityClassName: $PC"
cat <<EOF2
  terminationGracePeriodSeconds: 1
  restartPolicy: Never
  containers:
  - name: hold
    image: mi-train:1
    imagePullPolicy: Never
    command: ["sleep", "600"]
    resources:
      requests: {cpu: 100m, memory: 64Mi, example.com/gpu: "$G"}
      limits: {memory: 64Mi, example.com/gpu: "$G"}
EOF2
