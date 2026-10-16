#!/bin/sh
# Stop everything oc_up.sh started (only our own PIDs and our own container and objects).
S=${S:?}; D="$S/oc"; KC="$S/bin/kubectl --kubeconfig $S/kubeconfig --context kind-mi-kind"
for p in exporter proxy pf; do [ -f "$D/$p.pid" ] && kill "$(cat "$D/$p.pid")" 2>/dev/null; rm -f "$D/$p.pid"; done
docker rm -f oc-prom >/dev/null 2>&1
$KC delete clusterrolebinding oc-prom-metrics --ignore-not-found >/dev/null
$KC delete namespace oc --ignore-not-found >/dev/null
rm -f "$D/prom/kueue_token"
echo down
