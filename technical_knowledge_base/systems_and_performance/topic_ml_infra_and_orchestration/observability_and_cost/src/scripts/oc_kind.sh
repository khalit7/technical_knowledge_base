#!/bin/sh
# Observability and cost child page: four scenarios of the running example on kind, watched by Prometheus.
# Run under the kind lock, with oc_up.sh already run (Prometheus, exporter, kubectl proxy, Kueue port-forward).
# usage: K=<kubectl wrapper> SHARED=<host folder mounted at /shared> OUT=<dir> sh oc_kind.sh [base|slow|hang|queue ...]
# Writes OUT/marks.txt: one line per injected event, "<unix time> <scenario> <what>".
set -u
M="$OUT/marks.txt"; mkdir -p "$OUT"
mark() { echo "$(python3 -c 'import time;print(round(time.time(),3))') $1 $2" >> "$M"; }

jobset() { # name steps sleep_ms extra-args
cat <<EOF | sh "$K" create -f - >/dev/null
apiVersion: jobset.x-k8s.io/v1alpha2
kind: JobSet
metadata: {name: $1, namespace: mi, labels: {kueue.x-k8s.io/queue-name: mi-lq}}
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
                --master-addr=$1-node-0-0.$1 --master-port=29500
                /opt/mi/train.py --steps $2 --step-sleep-ms $3 --ckpt-every 100 --no-resume $4
                --ckpt-dir=/shared/ckpt/$1 --log-dir=/shared/logs/$1
              resources:
                requests: {cpu: "1", memory: 900Mi, example.com/gpu: "2"}
                limits: {cpu: "2", memory: 900Mi, example.com/gpu: "2"}
              volumeMounts: [{name: shared, mountPath: /shared}]
            volumes: [{name: shared, hostPath: {path: /shared, type: Directory}}]
EOF
mark "$1" submitted
}

laststep() { # name rank -> last logged step of that rank (0 if none)
  f="$SHARED/logs/$1/rank$2.jsonl"; [ -f "$f" ] || { echo 0; return; }
  python3 -c "import json,sys
s=0
for l in open(sys.argv[1]):
  r=json.loads(l)
  if r.get('ev') in ('step','end'): s=r['step']
print(s)" "$f"
}

waitstep() { # name rank step (max 240 s)
  i=0; while [ "$(laststep "$1" "$2")" -lt "$3" ] && [ $i -lt 480 ]; do sleep 0.5; i=$((i+1)); done
}

waitdone() { # name (max 300 s)
  i=0; while [ $i -lt 150 ]; do
    s=$(sh "$K" -n mi get jobset "$1" -o jsonpath='{.status.terminalState}' 2>/dev/null)
    [ -n "$s" ] && break; sleep 2; i=$((i+1)); done
  mark "$1" "terminal:$s"
}

podnode() { sh "$K" -n mi get pod -l jobset.sigs.k8s.io/jobset-name="$1",batch.kubernetes.io/job-completion-index="$2" -o jsonpath='{.items[0].spec.nodeName} {.items[0].metadata.uid}'; }

save() { # name: copy logs, events and the workload, then delete
  d="$OUT/$1"; mkdir -p "$d"
  cp "$SHARED/logs/$1"/rank*.jsonl "$d/" 2>/dev/null
  sh "$K" -n mi get workloads -o json > "$d/workloads.json" 2>/dev/null
  sh "$K" -n mi get pods -o wide -l jobset.sigs.k8s.io/jobset-name="$1" > "$d/pods.txt" 2>/dev/null
  sh "$K" -n mi get events --sort-by=.lastTimestamp -o custom-columns=TIME:.lastTimestamp,ETIME:.eventTime,KIND:.involvedObject.kind,NAME:.involvedObject.name,REASON:.reason,MSG:.message 2>/dev/null | grep "$1" > "$d/events.txt"
  sh "$K" -n mi delete jobset "$1" --wait=true >/dev/null 2>&1
  rm -rf "$SHARED/logs/$1" "$SHARED/ckpt/$1"
}

for sc in "$@"; do
case $sc in
base)   # the healthy reference: 400 steps, 100 ms of extra work per step
  jobset oc-base 400 100 ""; waitdone oc-base; save oc-base; sleep 15;;
slow)   # a slow node: at step 150, the pod of node rank 1 (ranks 2 and 3) is capped at 0.2 CPU through its cgroup
  jobset oc-slow 400 100 ""; waitstep oc-slow 2 150
  set -- $(podnode oc-slow 1); node=$1; uid=$(echo "$2" | tr '-' '_')
  cg=$(docker exec "$node" sh -c "find /sys/fs/cgroup -maxdepth 5 -type d -name '*pod${uid}*' | head -1")
  docker exec "$node" sh -c "cat $cg/cpu.max > /tmp/oc_cpu_max_before; echo '20000 100000' > $cg/cpu.max"
  mark oc-slow "throttle:pod-index-1:$(docker exec "$node" cat /tmp/oc_cpu_max_before | tr ' ' '/')->20000/100000"
  waitdone oc-slow; save oc-slow; sleep 15;;
hang)   # a hang: at step 150, rank 3's process is frozen with SIGSTOP; process-group timeout 45 s
  jobset oc-hang 400 100 "--timeout-s 45"; waitstep oc-hang 3 150
  set -- $(podnode oc-hang 1); node=$1
  pid=$(docker exec "$node" sh -c 'for p in $(pgrep -f /opt/mi/train.py); do tr "\0" "\n" < /proc/$p/environ | grep -qx RANK=3 && echo $p; done' | head -1)
  docker exec "$node" kill -STOP "$pid"; mark oc-hang "sigstop:rank3"
  waitdone oc-hang; save oc-hang; sleep 15;;
queue)  # three jobs at once: the queue holds 12 GPUs, 4 CPUs and 3 GiB; each job asks 4 GPUs, 2 CPUs, 1800 MiB
  jobset oc-q1 200 100 ""; jobset oc-q2 200 100 ""; jobset oc-q3 200 100 ""
  waitdone oc-q1; waitdone oc-q2; waitdone oc-q3; save oc-q1; save oc-q2; save oc-q3; sleep 10;;
esac
done
