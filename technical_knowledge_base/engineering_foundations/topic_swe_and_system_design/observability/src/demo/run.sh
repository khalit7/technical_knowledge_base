#!/bin/sh
# Run the whole demo: two services, Prometheus 3.15.0 scraping them, the load, then snapshots.
cd "$(dirname "$0")"
rm -rf out; mkdir -p out
UV="uv run --no-project --python 3.12 --with opentelemetry-sdk==1.45.0 --with prometheus-client==0.26.0"
$UV python dep.py > out/dep.err 2>&1 & echo $! > out/dep.pid
$UV python api.py > out/api.err 2>&1 & echo $! > out/api.pid
./prometheus-3.15.0.darwin-arm64/prometheus --config.file=prometheus.yml --storage.tsdb.path=out/prom \
  --web.listen-address=127.0.0.1:9099 --enable-feature=exemplar-storage > out/prom.log 2>&1 & echo $! > out/prom.pid
sleep 8
date -u +%s > out/start_unix
$UV python load.py > out/load.log 2>&1
sleep 3
curl -s http://127.0.0.1:8701/metrics > out/metrics_prom.txt
curl -s -H 'Accept: application/openmetrics-text; version=1.0.0' http://127.0.0.1:8701/metrics > out/metrics_om.txt
date -u +%s > out/end_unix
echo done > out/DONE
