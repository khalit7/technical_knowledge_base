#!/bin/sh
# Print the running example as a JobSet (as in the root's src/data/k8s/train-jobset.yaml), in namespace km.
# usage: sh train-jobset.sh <name> plain|policy [queue] [extra train.py args]
#   plain:  failurePolicy.maxRestarts 0, as the root's run
#   policy: the pattern JobSet's docs recommend for preemptible training: the Job fails fast with reason
#           PodFailurePolicy when a pod is disrupted (evicted, preempted, node drained), and the JobSet then
#           restarts every Job without spending its restart budget; any other failure (a crash) spends the
#           budget, here 0, so a crash fails the JobSet at once.
#   queue:  a Kueue LocalQueue name, or "-" for none
N=$1; MODE=$2; Q=${3:--}; shift 3 2>/dev/null; EXTRA="$*"
cat <<EOF
apiVersion: jobset.x-k8s.io/v1alpha2
kind: JobSet
metadata:
  name: $N
  namespace: km
EOF
[ "$Q" != "-" ] && echo "  labels: {kueue.x-k8s.io/queue-name: $Q}"
echo "spec:"
if [ "$MODE" = policy ]; then cat <<EOF
  failurePolicy:
    maxRestarts: 0
    rules:
    - name: disruptedRestartFree
      action: RestartJobSetAndIgnoreMaxRestarts
      onJobFailureReasons: [PodFailurePolicy]
EOF
else echo "  failurePolicy: {maxRestarts: 0}"; fi
cat <<EOF
  replicatedJobs:
  - name: node
    replicas: 1
    template:
      spec:
        parallelism: 2
        completions: 2
        completionMode: Indexed
        backoffLimit: 0
EOF
[ "$MODE" = policy ] && cat <<EOF
        podFailurePolicy:
          rules:
          - action: FailJob
            onPodConditions:
            - {type: DisruptionTarget}
EOF
cat <<EOF
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
