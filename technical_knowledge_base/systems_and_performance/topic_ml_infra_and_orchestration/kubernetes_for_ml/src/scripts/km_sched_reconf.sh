#!/bin/sh
# Switch kind's kube-scheduler to the page's config (two profiles, per-plugin score logging) and back.
# usage: sh km_sched_reconf.sh on|off   (run inside the kind lock; "off" restores the backed-up manifest)
# The static pod manifest lives in /etc/kubernetes/manifests in the control-plane container; the kubelet
# restarts the scheduler when the file changes. The backup is kept outside the manifests folder.
CP=mi-kind-control-plane; H=$(cd "$(dirname "$0")/.." && pwd)
case "$1" in
on)
  docker exec $CP sh -c 'mkdir -p /etc/kubernetes/km-backup; [ -f /etc/kubernetes/km-backup/kube-scheduler.yaml ] || cp /etc/kubernetes/manifests/kube-scheduler.yaml /etc/kubernetes/km-backup/'
  docker cp "$H/k8s/km-sched-config.yaml" $CP:/etc/kubernetes/km-sched-config.yaml
  # rewrite the manifest: --config plus --vmodule (scores are logged at V(10) in schedule_one.go), drop the
  # flags the config file replaces, and mount the config file
  docker exec $CP sh -c '
    sed -e "s#    - --kubeconfig=/etc/kubernetes/scheduler.conf#    - --config=/etc/kubernetes/km-sched-config.yaml\n    - --vmodule=schedule_one=10#" \
        -e "/    - --leader-elect=true/d" \
        -e "s#    volumeMounts:#    volumeMounts:\n    - mountPath: /etc/kubernetes/km-sched-config.yaml\n      name: kmconfig\n      readOnly: true#" \
        -e "s#  volumes:#  volumes:\n  - hostPath:\n      path: /etc/kubernetes/km-sched-config.yaml\n      type: File\n    name: kmconfig#" \
        /etc/kubernetes/km-backup/kube-scheduler.yaml > /etc/kubernetes/km-backup/kube-scheduler.km.yaml
    cp /etc/kubernetes/km-backup/kube-scheduler.km.yaml /etc/kubernetes/manifests/kube-scheduler.yaml';;
off)
  docker exec $CP sh -c 'cp /etc/kubernetes/km-backup/kube-scheduler.yaml /etc/kubernetes/manifests/kube-scheduler.yaml && rm -f /etc/kubernetes/km-sched-config.yaml';;
esac
