#!/bin/sh
# Print one single-pod Job of the borrowing lab: 4 fake GPUs, sleeps $3 seconds. usage: sh team-job.sh <name> <a|b> <seconds>
cat <<YAML
apiVersion: batch/v1
kind: Job
metadata:
  name: $1
  namespace: sc
  labels: {kueue.x-k8s.io/queue-name: sc-lq-$2}
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      terminationGracePeriodSeconds: 2
      containers:
      - name: work
        image: mi-train:1
        imagePullPolicy: Never
        command: ["sleep", "$3"]
        resources:
          requests: {cpu: 100m, memory: 64Mi, example.com/gpu: "4"}
          limits: {cpu: 500m, memory: 64Mi, example.com/gpu: "4"}
YAML
