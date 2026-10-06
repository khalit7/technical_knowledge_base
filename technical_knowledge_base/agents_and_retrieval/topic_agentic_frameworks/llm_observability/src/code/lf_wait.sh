#!/bin/sh
# lf_wait.sh TRACEID EXPECTED OUT: poll Langfuse until EXPECTED observations of the trace are readable (max ~3 min)
for i in $(seq 1 60); do
  curl -s -u pk-lf-fobs:sk-lf-fobs "127.0.0.1:3100/api/public/v2/observations?traceId=$1&limit=100&fields=core,basic,model,usage,metadata,io" > $3
  N=$(python3 -c "import json;print(len(json.load(open('$3')).get('data',[])))")
  [ "$N" -ge "$2" ] && break
  sleep 3
done
echo "$1 $N"
