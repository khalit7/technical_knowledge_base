#!/bin/sh
# One 1-GPU pod that must spread evenly over the blocks (label mi.example.com/block: b1 = worker, worker2;
# b2 = worker3). usage: sh spread-pod.sh <name> Ignore|Honor   (nodeTaintsPolicy; Ignore is the default)
cat <<EOF2
apiVersion: v1
kind: Pod
metadata: {name: $1, namespace: km, labels: {app: km-spread}}
spec:
  terminationGracePeriodSeconds: 1
  restartPolicy: Never
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: mi.example.com/block
    whenUnsatisfiable: DoNotSchedule
    labelSelector: {matchLabels: {app: km-spread}}
    nodeTaintsPolicy: $2
  containers:
  - name: hold
    image: mi-train:1
    imagePullPolicy: Never
    command: ["sleep", "600"]
    resources:
      requests: {cpu: 100m, memory: 64Mi, example.com/gpu: "1"}
      limits: {memory: 64Mi, example.com/gpu: "1"}
EOF2
