#!/bin/sh
F=$(pwd)
docker run -d --rm --name fobs-col-samp -p 127.0.0.1:4818:4318 -p 127.0.0.1:4819:4319 -p 127.0.0.1:4820:4320 -p 127.0.0.1:4821:4321 \
  -v $F/col/sampling.yaml:/etc/otelcol-contrib/config.yaml -v $F/col/out_samp:/out otel/opentelemetry-collector-contrib:0.162.0 >/dev/null
for i in $(seq 1 30); do docker logs fobs-col-samp 2>&1 | grep -q "Everything is ready" && break; sleep 1; done
python3 code/sampling_replay.py cc/default_traces_raw.jsonl 5a5a col/out_samp/replay_log.json \
  http://127.0.0.1:4818/v1/traces http://127.0.0.1:4819/v1/traces http://127.0.0.1:4820/v1/traces http://127.0.0.1:4821/v1/traces
sleep 75
wc -l col/out_samp/*.jsonl
docker stop fobs-col-samp >/dev/null
echo done
