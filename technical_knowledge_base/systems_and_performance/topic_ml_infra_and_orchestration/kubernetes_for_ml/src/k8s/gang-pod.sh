#!/bin/sh
# One member of a native gang (scheduling.k8s.io/v1beta1 PodGroup, Kubernetes v1.37 with GenericWorkload on):
# pod <job>-<index> holds a whole worker's 4 fake GPUs, starts behind a scheduling gate (so the run controls
# the order in which the scheduler sees pods, as in the root's deadlock run) and sleeps <secs>.
# usage: sh gang-pod.sh <job> <index> <secs> gang|nogang
J=$1; I=$2; SECS=$3; MODE=$4
cat <<EOF2
apiVersion: v1
kind: Pod
metadata: {name: $J-$I, namespace: km, labels: {km-gang: $J}}
spec:
EOF2
[ "$MODE" = gang ] && echo "  schedulingGroup: {podGroupName: $J}"
cat <<EOF2
  schedulingGates: [{name: km.example.com/release}]
  terminationGracePeriodSeconds: 1
  restartPolicy: Never
  containers:
  - name: hold
    image: mi-train:1
    imagePullPolicy: Never
    command: ["sleep", "$SECS"]
    resources:
      requests: {cpu: 100m, memory: 64Mi, example.com/gpu: "4"}
      limits: {memory: 64Mi, example.com/gpu: "4"}
EOF2
