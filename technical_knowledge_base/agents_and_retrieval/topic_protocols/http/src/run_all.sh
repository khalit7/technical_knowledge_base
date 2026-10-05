#!/bin/sh
# Rerun every recording behind the HTTP page into raw/, then rebuild the data, the page and the checks.
# Usage: WORK=<scratch dir> NGINX=<nginx binary> sh run_all.sh
#   WORK: a scratch directory (venv, throwaway CA with its private keys, logs; nothing in it is committed)
#   NGINX: nginx 1.31.x built with http_ssl, http_v2 and the poll module (the root Failure lab's build, see
#          ../../src/fail/README.md)
# Ports used (all on 127.0.0.1): 30300 TCP+UDP and 30301 (lab_server.py), 30302 (connection-drop socket),
# 30310 to 30315 (nginx), 30320 (echo_backend.py). Only the processes this script starts are stopped.
# Needs network access once, for the three read-only public requests (lab/public.sh).
set -e
WORK="${WORK:?scratch dir}"; NGINX="${NGINX:?nginx binary}"
HERE="$(cd "$(dirname "$0")" && pwd)"; RAW="$HERE/raw"; LAB="$HERE/lab"
mkdir -p "$WORK" "$RAW"
if [ ! -x "$WORK/.venv/bin/python" ]; then
  (cd "$WORK" && UV_PYTHON_INSTALL_BIN=0 uv venv --python 3.13 .venv && UV_PYTHON_INSTALL_BIN=0 uv pip install --python .venv/bin/python \
    h2==4.4.1 hpack==4.2.0 hypercorn==0.18.0 aioquic==1.3.0 'httpx[http2]==0.28.1' h11==0.16.0 anthropic==1.11.0 openai==3.24.0)
fi
PY="$WORK/.venv/bin/python"
[ -f "$WORK/pki/ca.pem" ] || sh "$HERE/../../src/wire/make_ca.sh" "$WORK/pki" >/dev/null
: > "$WORK/server_req.log"; : > "$WORK/echo.jsonl"
SPID=$(sh "$LAB/serve.sh" "$PY" "$WORK/pki" "$WORK")
"$PY" "$LAB/echo_backend.py" 30320 "$WORK/echo.jsonl" > "$WORK/echo.log" 2>&1 & EPID=$!
mkdir -p "$WORK/ngx/ngx_tmp"
sed -e "s#@WORK@#$WORK/ngx#g" -e "s#@PKI@#$WORK/pki#g" "$LAB/nginx.conf.in" > "$WORK/ngx/nginx.conf"
"$NGINX" -p "$WORK/ngx" -c "$WORK/ngx/nginx.conf" > "$WORK/ngx/stdout.log" 2>&1 & NPID=$!
trap 'kill $SPID $EPID $NPID 2>/dev/null' EXIT
sleep 2
cd "$LAB"
"$PY" frames_h2.py "$WORK/pki/ca.pem" 30300 "$RAW/h2_frames.json"
"$PY" frames_h3.py "$WORK/pki/ca.pem" 30300 "$RAW/h3_frames.json"
"$PY" hol_app.py "$WORK/pki/ca.pem" 30300 30301 "$RAW/hol_app.json"
"$PY" flow_h2.py "$WORK/pki/ca.pem" 30300 "$RAW/flow_h2.json"
"$PY" sdk_retries.py 30301 30302 "$WORK/server_req.log" "$RAW/sdk_retries.json"
"$PY" sdk_version.py "$WORK/pki/ca.pem" 30300 "$WORK/server_req.log" "$RAW/sdk_version.json"
"$PY" hpack_sizes.py 30320 "$WORK/echo.jsonl" "$RAW"
"$PY" proxy_runs.py "$WORK/pki/ca.pem" "$WORK/echo.jsonl" "$RAW"
sh conditional.sh 30301 > "$RAW/conditional.txt"
sh public.sh > "$RAW/public_headers.txt"
cd "$HERE"
python3 make_data.py && sh build.sh && python3 recompute.py >/dev/null && python3 check_embed.py | tail -1
