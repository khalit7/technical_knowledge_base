#!/bin/sh
# Print the running example as a plain Indexed Job plus the headless Service its pods need to find each other:
# what a JobSet builds for you (see train-jobset.yaml in the root's src/data/k8s/).
# usage: sh train-indexed-job.sh <name> [policy] [extra train.py args]
#   policy: none        backoffLimit 2, no podFailurePolicy
#           exit13      podFailurePolicy FailJob on exit code 13 (train.py's crash knob exits 13)
#           exit13ok    the same rule written against what the pod really returns (see the page)
#           nopolicy0   backoffLimit 0, no podFailurePolicy
#           disrupt0    backoffLimit 0, podFailurePolicy Ignore on the DisruptionTarget condition
# Pods get hostname <name>-<index> and, with subdomain <name>, the DNS name <name>-<index>.<name>.
N=$1; P=${2:-none}; shift 2 2>/dev/null; EXTRA="$*"
BL=2; [ "$P" = nopolicy0 ] || [ "$P" = disrupt0 ] && BL=0
cat <<EOF
apiVersion: v1
kind: Service
metadata: {name: $N, namespace: km}
spec:
  clusterIP: None
  selector: {job-name: $N}
  publishNotReadyAddresses: true
---
apiVersion: batch/v1
kind: Job
metadata: {name: $N, namespace: km}
spec:
  completions: 2
  parallelism: 2
  completionMode: Indexed
  backoffLimit: $BL
EOF
case "$P" in
exit13) cat <<EOF
  podFailurePolicy:
    rules:
    - action: FailJob
      onExitCodes: {containerName: trainer, operator: In, values: [13]}
EOF
;;
exit13ok) cat <<EOF
  podFailurePolicy:
    rules:
    - action: FailJob
      onExitCodes: {containerName: trainer, operator: In, values: [1]}
EOF
;;
disrupt0) cat <<EOF
  podFailurePolicy:
    rules:
    - action: Ignore
      onPodConditions:
      - {type: DisruptionTarget}
EOF
;;
esac
cat <<EOF
  template:
    spec:
      restartPolicy: Never
      subdomain: $N
      containers:
      - name: trainer
        image: mi-train:1
        imagePullPolicy: Never
        command: ["sh", "-c"]
        args:
        - >-
          exec torchrun --nnodes=2 --nproc-per-node=2 --node-rank=\$JOB_COMPLETION_INDEX
          --master-addr=$N-0.$N --master-port=29500
          /opt/mi/train.py --ckpt-dir=/shared/ckpt/$N --log-dir=/shared/logs/$N $EXTRA
        resources:
          requests: {cpu: 500m, memory: 400Mi, example.com/gpu: "2"}
          limits: {cpu: "2", memory: 900Mi, example.com/gpu: "2"}
        volumeMounts:
        - {name: shared, mountPath: /shared}
      volumes:
      - name: shared
        hostPath: {path: /shared, type: Directory}
EOF
