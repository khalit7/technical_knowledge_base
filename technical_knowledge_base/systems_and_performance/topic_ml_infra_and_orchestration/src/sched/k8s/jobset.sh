#!/bin/sh
# Print one JobSet of the gang lab: the running example (2 pods x 2 ranks, static rendezvous on pod 0)
# with each pod asking for a whole node's 4 fake GPUs.
# usage: sh jobset.sh <name> gated|kueue
#   gated: no queue label; every pod is created with a scheduling gate, so the lab decides the order in which
#          the default scheduler sees the pods (standing in for several jobs creating pods at the same moment).
#   kueue: labelled for LocalQueue sc-lq (ClusterQueue mi-cq, 12 fake GPUs of quota); Kueue admits it whole or not at all.
N=$1; MODE=$2
cat <<EOF
apiVersion: jobset.x-k8s.io/v1alpha2
kind: JobSet
metadata:
  name: $N
  namespace: sc
EOF
[ "$MODE" = kueue ] && echo "  labels: {kueue.x-k8s.io/queue-name: sc-lq}"
cat <<EOF
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
EOF
[ "$MODE" = gated ] && echo "            schedulingGates: [{name: sc.example.com/release}]"
cat <<EOF
            containers:
            - name: trainer
              image: mi-train:1
              imagePullPolicy: Never
              command: ["sh", "-c"]
              args:
              - >-
                exec torchrun --nnodes=2 --nproc-per-node=2 --node-rank=\$JOB_COMPLETION_INDEX
                --master-addr=$N-node-0-0.$N --master-port=29500
                /opt/mi/train.py --steps 200 --step-sleep-ms 60 --no-resume
                --ckpt-dir=/shared/ckpt/$N --log-dir=/shared/logs/$N
              resources:
                requests: {cpu: 500m, memory: 400Mi, example.com/gpu: "4"}
                limits: {cpu: "2", memory: 900Mi, example.com/gpu: "4"}
              volumeMounts:
              - {name: shared, mountPath: /shared}
            volumes:
            - name: shared
              hostPath: {path: /shared, type: Directory}
EOF
