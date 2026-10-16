#!/bin/sh
# Turn on Kubernetes' native gang scheduling (feature gate GenericWorkload, beta and off by default in
# v1.37) on kind's API server and scheduler, and back off. usage: sh km_gang_reconf.sh on|off
# on:  kube-apiserver gets --feature-gates=GenericWorkload=true and serves scheduling.k8s.io/v1beta1
#      (PodGroup, Workload); kube-scheduler gets the gate (adds the GangScheduling plugin) and logs the
#      gang plugin's decisions (--vmodule). Backups of both manifests stay outside the manifests folder.
CP=mi-kind-control-plane
case "$1" in
on) docker exec $CP sh -c '
  set -e; B=/etc/kubernetes/km-backup; mkdir -p $B; M=/etc/kubernetes/manifests
  [ -f $B/kube-apiserver.yaml ] || cp $M/kube-apiserver.yaml $B/
  [ -f $B/kube-scheduler.yaml ] || cp $M/kube-scheduler.yaml $B/
  sed -e "s#    - --runtime-config=\$#    - --runtime-config=scheduling.k8s.io/v1beta1=true\n    - --feature-gates=GenericWorkload=true#" $B/kube-apiserver.yaml > $B/kube-apiserver.gang.yaml
  sed -e "s#    - --leader-elect=true#    - --leader-elect=true\n    - --feature-gates=GenericWorkload=true\n    - --vmodule=gangscheduling=5,schedule_one_podgroup=5,scheduling_queue=5#" $B/kube-scheduler.yaml > $B/kube-scheduler.gang.yaml
  grep -q GenericWorkload $B/kube-apiserver.gang.yaml && grep -q GenericWorkload $B/kube-scheduler.gang.yaml
  cp $B/kube-apiserver.gang.yaml $M/kube-apiserver.yaml; cp $B/kube-scheduler.gang.yaml $M/kube-scheduler.yaml';;
off) docker exec $CP sh -c 'B=/etc/kubernetes/km-backup; M=/etc/kubernetes/manifests
  cp $B/kube-apiserver.yaml $M/kube-apiserver.yaml; cp $B/kube-scheduler.yaml $M/kube-scheduler.yaml';;
esac
