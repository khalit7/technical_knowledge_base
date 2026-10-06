#!/bin/sh
F=$(pwd)
docker run -d --rm --name fobs-col-samp2 -p 127.0.0.1:4918:4318 -p 127.0.0.1:4919:4319 \
  -v $F/col/sampling2.yaml:/etc/otelcol-contrib/config.yaml -v $F/col/out_samp2:/out otel/opentelemetry-collector-contrib:0.162.0 >/dev/null
for i in $(seq 1 30); do docker logs fobs-col-samp2 2>&1 | grep -q "Everything is ready" && break; sleep 1; done
docker logs fobs-col-samp2 2>&1 | grep -i error | head -3
python3 code/sampling_replay.py cc/default_traces_raw.jsonl 6b6b col/out_samp2/log_failed.json http://127.0.0.1:4918/v1/traces http://127.0.0.1:4919/v1/traces &
python3 code/sampling_replay.py cc/default_traces_raw.jsonl 0c0c col/out_samp2/log_ok.json http://127.0.0.1:4918/v1/traces http://127.0.0.1:4919/v1/traces
wait
sleep 10
wc -l col/out_samp2/*.jsonl
docker stop fobs-col-samp2 >/dev/null
echo done
