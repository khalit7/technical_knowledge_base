#!/bin/sh
# E7: a real device plugin on worker3 (sample-device-plugin 1.8.0). E8: DRA with a hand-written ResourceSlice.
# usage (inside the kind lock): S=... H=... OUT=... sh km_e78.sh 7|8
. "$H/scripts/km_lib.sh"
cap() { k get node mi-kind-worker3 -o jsonpath='{"capacity: "}{.status.capacity}{"\nallocatable: "}{.status.allocatable}{"\n"}'; }
case "$1" in
7) "$S/mi/bin/kind" load docker-image --name mi-kind --nodes mi-kind-worker3 registry.k8s.io/e2e-test-images/sample-device-plugin:1.8.0 2>&1 | tail -1
   { echo "## before"; cap; } > "$OUT/e7.steps.txt"
   wstart e7; sed -n '1,/^---/p' "$H/k8s/e7-device-plugin.yaml" | k create -f -; sleep 8
   { echo "## plugin running 8 s"; cap; echo "## plugin log"; k -n km logs km-device-plugin 2>&1 | head -20
     echo "## kubelet's socket folder"; docker exec mi-kind-worker3 ls -l /var/lib/kubelet/device-plugins; } >> "$OUT/e7.steps.txt"
   k create -f "$H/k8s/e7-device-plugin.yaml" 2>&1 | grep -v AlreadyExists; sleep 8
   { echo "## workload pod"; k -n km get pods -o wide; echo "## its log"; k -n km logs km-uses-device
     echo "## kubelet checkpoint"; docker exec mi-kind-worker3 cat /var/lib/kubelet/device-plugins/kubelet_internal_checkpoint; echo
     echo "## plugin log after Allocate"; k -n km logs km-device-plugin 2>&1 | tail -8; } >> "$OUT/e7.steps.txt"
   k -n km delete pod km-uses-device --wait=true > /dev/null; k -n km delete pod km-device-plugin --wait=true >/dev/null; sleep 6
   { echo "## plugin deleted, 6 s"; cap; } >> "$OUT/e7.steps.txt"
   dump e7; wstop e7; clean_ns
   docker exec mi-kind-worker3 sh -c 'rm -f /tmp/Dev-1 /tmp/Dev-2'
   docker exec mi-kind-worker3 crictl rmi registry.k8s.io/e2e-test-images/sample-device-plugin:1.8.0 > /dev/null 2>&1;;
8) wstart e8; k create -f "$H/k8s/e8-dra.yaml"; sleep 10
   { echo "## after create"; k -n km get pods,resourceclaims -o wide; k -n km get resourceclaims -o yaml; k -n km describe pod km-dra-pod | sed -n '/Events/,$p'; } > "$OUT/e8.steps.txt"
   k create -f "$H/k8s/e8-dra-third.yaml"; sleep 8
   { echo "## second pod"; k -n km get pods,resourceclaims -o wide; k -n km describe pod km-dra-pod2 | sed -n '/Events/,$p'; } >> "$OUT/e8.steps.txt"
   k -n kube-system logs kube-scheduler-mi-kind-control-plane --since=40s > "$OUT/e8.schedlog.txt" 2>&1
   k -n kube-system logs kube-controller-manager-mi-kind-control-plane --since=40s 2>&1 | grep -i 'resourceclaim\|km-dra' > "$OUT/e8.kcmlog.txt"
   docker exec mi-kind-worker3 sh -c 'journalctl -u kubelet --since "-40s" --no-pager 2>/dev/null | grep -i "dra\|km-dra\|resourceclaim" | tail -20' > "$OUT/e8.kubeletlog.txt"
   dump e8 pod/km-dra-pod pod/km-dra-pod2; wstop e8
   k -n km delete pod km-dra-pod km-dra-pod2 --wait=true >/dev/null; sleep 3; k delete -f "$H/k8s/e8-dra.yaml" --wait=true 2>&1 | tail -4
   k -n km get resourceclaims 2>&1 | tail -2; clean_ns;;
esac
