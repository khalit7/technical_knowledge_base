#!/bin/sh
# Start the observability stack for the local clusters: Prometheus (one capped container), the oc exporter,
# kubectl proxy (cAdvisor through the API server) and a port-forward to Kueue's metrics. PIDs in $D/*.pid.
# usage: S=<scratch mi folder> sh oc_up.sh       (D=$S/oc)
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); D="$S/oc"; mkdir -p "$D/prom"
KC="$S/bin/kubectl --kubeconfig $S/kubeconfig --context kind-mi-kind"
cp "$HERE/prom/prometheus.yml" "$HERE/prom/oc_rules.yml" "$D/prom/"
$KC create namespace oc --dry-run=client -o yaml | $KC apply -f - >/dev/null
$KC -n oc create serviceaccount oc-prom --dry-run=client -o yaml | $KC apply -f - >/dev/null
$KC create clusterrolebinding oc-prom-metrics --clusterrole=kueue-metrics-reader --serviceaccount=oc:oc-prom --dry-run=client -o yaml | $KC apply -f - >/dev/null
$KC -n oc create token oc-prom --duration 3h > "$D/prom/kueue_token"
nohup $KC proxy --port 18001 --address 127.0.0.1 --accept-hosts '^host\.docker\.internal$,^localhost$,^127\.0\.0\.1$' > "$D/proxy.log" 2>&1 & echo $! > "$D/proxy.pid"
nohup $KC -n kueue-system port-forward svc/kueue-controller-manager-metrics-service 18443:8443 --address 127.0.0.1 > "$D/pf.log" 2>&1 & echo $! > "$D/pf.pid"
OC_SOURCES=k8s,slurm OC_K8S_LOGS="$S/shared/k8s/logs" KUBECTL="$KC" nohup python3 "$HERE/oc_exporter.py" 19811 > "$D/exporter.log" 2>&1 & echo $! > "$D/exporter.pid"
docker run -d --name oc-prom --memory 256m --cpus 0.5 -p 127.0.0.1:19090:9090 -v "$D/prom":/etc/prometheus:ro \
  prom/prometheus:v3.13.4 --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=1d > "$D/prom.cid"
echo up
