#!/bin/sh
# Start the Wire Lab server. Usage: sh serve.sh <venv python> <pki dir>
# Env: TLS_PORT (default 8443; TCP for HTTP/1.1+2 and UDP for HTTP/3), PLAIN_PORT (default 8080),
#      TOKEN_GAP (s between tokens, default 0.05), FIRST_TOKEN_DELAY (s, default 0.12).
PY="${1:?python}"; PKI="${2:?pki dir}"; cd "$(dirname "$0")"
TLS_PORT="${TLS_PORT:-8443}"; PLAIN_PORT="${PLAIN_PORT:-8080}"
exec "$PY" -m hypercorn llm_server:app --certfile "$PKI/server.pem" --keyfile "$PKI/server.key" \
  --bind 127.0.0.1:$TLS_PORT --quic-bind 127.0.0.1:$TLS_PORT --insecure-bind 127.0.0.1:$PLAIN_PORT --keep-alive 5
