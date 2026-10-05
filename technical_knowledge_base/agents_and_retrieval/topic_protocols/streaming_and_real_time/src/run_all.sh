#!/bin/sh
# Rerun every measurement on this page into raw/. About 3 minutes.
# Usage: WORK=<scratch dir> NGINX=<nginx binary> HNM=<html_utils/node_modules> sh run_all.sh
# WORK must hold a Python 3.13 venv (.venv: websockets aiohttp httpx httpx-sse anthropic openai standardwebhooks
# sseclient-py) and node/node_modules (eventsource-parser eventsource ws). Ports used: 30401-30411, 30420.
# The nginx used was 1.31.6 built from source by the root's Failure lab (src/fail/README.md).
set -e
cd "$(dirname "$0")/lab"
W="${WORK:?scratch dir}"; PY="$W/.venv/bin/python"; R=../raw
pids=""
start() { "$@" > "$W/$(basename "$1")_$$.log" 2>&1 & pids="$pids $!"; }
PORT=30401 start "$PY" lab_server.py
start "$PY" ws_server.py 30405 30406
rm -f "$W/relay50.jsonl" "$W/relay100.jsonl"
start "$PY" relay.py 30402 30401 25 "$W/relay50.jsonl"
start "$PY" relay.py 30403 30401 50 "$W/relay100.jsonl"
mkdir -p "$W/ngx_tmp"; sed "s#@WORK@#$W#g" nginx_ws.conf.in > "$W/nginx_ws.conf"; "$NGINX" -p "$W" -c "$W/nginx_ws.conf"
sleep 3
"$PY" four_ways.py http://127.0.0.1:30402 "$W/relay50.jsonl" 25 7 > $R/four_ways_rtt50.json
"$PY" four_ways.py http://127.0.0.1:30403 "$W/relay100.jsonl" 50 7 > $R/four_ways_rtt100.json
"$PY" parsers_py.py > "$W/py.jsonl"
node parsers_node.mjs http://127.0.0.1:30401 "$("$PY" -c 'import edge_cases;print(",".join(edge_cases.CASES))')" "$W/node/node_modules" "$HNM" > "$W/node.jsonl"
cat "$W/py.jsonl" "$W/node.jsonl" > $R/parsers.jsonl
node reconnect.mjs http://127.0.0.1:30401 "$HNM" > $R/reconnect.json
node six_limit.mjs http://127.0.0.1:30401 "$HNM" > $R/six_limit.json
"$PY" cancel.py http://127.0.0.1:30401 > $R/cancel.json
"$PY" ws_bytes.py 30405 > $R/ws_bytes.json
"$PY" ws_proxy.py > $R/ws_proxy.json
node ws_proxy_node.mjs "$W/node/node_modules" "$HNM" > $R/ws_proxy_node.json
grep -i "timed out" "$W/ngx_error.log" | tail -1 | sed -E 's/^[0-9/]+ [0-9:]+ //; s/[0-9]+#[0-9]+: //' > $R/ws_nginx_error.txt
H="-H Upgrade:websocket -H Connection:Upgrade -H Sec-WebSocket-Key:dGhlIHNhbXBsZSBub25jZQ== -H Sec-WebSocket-Version:13"
curl -si --max-time 3 $H http://127.0.0.1:30411/tokens | grep -v '^Date:' > $R/ws_no_upgrade_curl.txt || true
curl -si --max-time 1 $H http://127.0.0.1:30410/tokens 2>&1 | head -6 | grep -v '^Date:' > $R/ws_good_curl.txt || true
"$PY" ws_deflate.py ../inputs/rfc6455_s1.1.txt > $R/ws_deflate.json
"$PY" webhooks.py 30420 > $R/webhooks.json
kill $(cat "$W/ngx.pid") $pids 2>/dev/null || true
# Public, read-only, 4 seconds: Wikimedia's EventStreams (documented SSE service). Redacted by hand into raw/wikimedia.json:
#   curl -sS -N -m 4 -D h.txt -H 'Accept: text/event-stream' https://stream.wikimedia.org/v2/stream/recentchange -o body.txt
cd .. && python3 make_data.py
