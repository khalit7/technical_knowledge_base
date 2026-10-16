#!/bin/sh
# Create the kind cluster mi-kind, cap its node containers, install JobSet and Kueue at pinned releases,
# pin their controllers to the control plane, advertise FAKE GPUs, load the mi-train image, apply the queues.
# usage: MI_SHARED=<host folder for /shared> KIND=<kind binary> KUBECTL=<kubectl binary> MANIFESTS=<folder with
#        kueue-v0.20.2.yaml and jobset-v0.13.0.yaml> sh up.sh
set -e
H=$(cd "$(dirname "$0")" && pwd)
KIND=${KIND:-kind}; K=${KUBECTL:-kubectl}; : "${MI_SHARED:?set MI_SHARED}"; : "${MANIFESTS:?set MANIFESTS}"
mkdir -p "$MI_SHARED"; chmod 1777 "$MI_SHARED"
sed "s|SHARED_DIR|$MI_SHARED|" "$H/kind-config.yaml" > "$MI_SHARED/.kind-config.yaml"
$KIND create cluster --config "$MI_SHARED/.kind-config.yaml" --wait 120s
# Caps right after creation (kind has no flag for them): control plane 1300 MB, workers 1100 MB, 1.5 CPUs each.
docker update --memory 1300m --memory-swap 1300m --cpus 1.5 mi-kind-control-plane >/dev/null
for w in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do docker update --memory 1100m --memory-swap 1100m --cpus 1.5 $w >/dev/null; done
K="$K --context kind-mi-kind"
$K apply --server-side -f "$MANIFESTS/jobset-v0.13.0.yaml" >/dev/null
$K apply --server-side -f "$MANIFESTS/kueue-v0.20.2.yaml" >/dev/null
# Controllers on the control plane, so the three workers hold only training pods. Patch only after both are up:
# Kueue's own webhook intercepts Deployment updates (its pod integration) and refuses them until it is serving.
$K -n jobset-system rollout status deployment/jobset-controller-manager --timeout 180s
$K -n kueue-system rollout status deployment/kueue-controller-manager --timeout 180s
P='{"spec":{"template":{"spec":{"nodeSelector":{"node-role.kubernetes.io/control-plane":""},"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}}}}'
$K -n jobset-system patch deployment jobset-controller-manager --type merge -p "$P" >/dev/null
$K -n kueue-system patch deployment kueue-controller-manager --type merge -p "$P" >/dev/null
$K -n jobset-system rollout status deployment/jobset-controller-manager --timeout 180s
$K -n kueue-system rollout status deployment/kueue-controller-manager --timeout 180s
# FAKE GPUs: 4 "example.com/gpu" per worker, written into node status by hand (no device plugin, no device).
for w in mi-kind-worker mi-kind-worker2 mi-kind-worker3; do
  $K patch node $w --subresource=status --type=json -p '[{"op":"add","path":"/status/capacity/example.com~1gpu","value":"4"}]' >/dev/null
done
$KIND load docker-image mi-train:1 --name mi-kind --nodes mi-kind-worker,mi-kind-worker2,mi-kind-worker3
# Kueue webhooks need a moment after the rollout before they accept objects.
for i in $(seq 30); do $K apply -f "$H/queues.yaml" >/dev/null 2>&1 && break; sleep 2; done
$K get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable.example\\.com/gpu,BLOCK:.metadata.labels.mi\\.example\\.com/block
