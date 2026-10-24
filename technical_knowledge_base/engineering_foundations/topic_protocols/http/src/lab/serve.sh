#!/bin/sh
# Start the HTTP page lab server (lab_server.py) under hypercorn, in the background; prints its PID once it answers.
# Usage: sh serve.sh <venv python> <pki dir> <log dir>. Ports: TLS_PORT (TCP h1/h2 and UDP h3, default 30300), PLAIN_PORT (default 30301).
# A just-stopped server can hold its ports for a few seconds, so this retries for up to about 40 s.
PY="${1:?python}"; PKI="${2:?pki}"; LOGD="${3:?logdir}"; cd "$(dirname "$0")"
TLS_PORT="${TLS_PORT:-30300}"; PLAIN_PORT="${PLAIN_PORT:-30301}"
for i in 1 2 3 4 5 6 7 8 9 10; do
  LAB_LOG="$LOGD/server_req.log" nohup "$PY" -m hypercorn lab_server:app --certfile "$PKI/server.pem" --keyfile "$PKI/server.key" \
    --bind 127.0.0.1:$TLS_PORT --quic-bind 127.0.0.1:$TLS_PORT --insecure-bind 127.0.0.1:$PLAIN_PORT --keep-alive 5 > "$LOGD/server.log" 2>&1 &
  pid=$!; sleep 2
  if curl -s -m 2 "http://127.0.0.1:$PLAIN_PORT/health" >/dev/null 2>&1; then echo $pid; exit 0; fi
  kill $pid 2>/dev/null; sleep 2
done
echo "server did not start" >&2; exit 1
