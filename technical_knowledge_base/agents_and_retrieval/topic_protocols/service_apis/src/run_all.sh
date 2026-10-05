#!/bin/sh
# Rerun every recording behind the Service APIs page into raw/, then rebuild the data, the page and the checks.
# Usage: WORK=<scratch dir> NGINX=<nginx binary> sh run_all.sh
#   WORK:  scratch directory (venv, generated protobuf code, logs; nothing in it is committed)
#   NGINX: nginx 1.31.x with http_v2 and stream modules (the root Failure lab's build, ../../src/fail/README.md)
# Ports (all 127.0.0.1): 30500-30501 frames, 30520-30522 deadlines, 30530-30534 balancers, 30541-30549 failures.
# Only the processes these scripts start are stopped. No network access is needed.
set -e
WORK="${WORK:?scratch dir}"; NGINX="${NGINX:?nginx binary}"
HERE="$(cd "$(dirname "$0")" && pwd)"; RAW="$HERE/raw"; LAB="$HERE/lab"
mkdir -p "$WORK/gen" "$RAW"
if [ ! -x "$WORK/.venv/bin/python" ]; then
  (cd "$WORK" && UV_PYTHON_INSTALL_BIN=0 uv venv --python 3.13 .venv && UV_PYTHON_INSTALL_BIN=0 uv pip install --python .venv/bin/python \
    grpcio==1.84.0 grpcio-tools==1.84.0 grpcio-health-checking==1.84.0 grpcio-reflection==1.84.0 protobuf==7.36.2 \
    h2==4.4.1 hpack==4.2.0 hyperframe==6.1.0 graphql-core==3.3.0)
fi
PY="$WORK/.venv/bin/python"
"$PY" -m grpc_tools.protoc -I"$LAB" --python_out="$WORK/gen" --grpc_python_out="$WORK/gen" "$LAB/llm.proto" "$LAB/llm_v2.proto"
cd "$WORK"
"$PY" "$LAB/pb_bytes.py" "$WORK/gen" "$RAW/pb.json"
rm -f "$WORK/frames.jsonl"
"$PY" "$LAB/infer_server.py" "$WORK/gen" 30501 infer-1 --health --reflect > /dev/null 2>&1 & S=$!
"$PY" "$LAB/frame_proxy.py" 30500 30501 "$WORK/frames.jsonl" > /dev/null 2>&1 & X=$!
sleep 1.5; "$PY" "$LAB/frames_run.py" "$WORK/gen" 30500 "$WORK/frames.jsonl" "$RAW/frames.json"; kill $S $X
"$PY" "$LAB/deadline_run.py" "$WORK/gen" "$PY" "$LAB" "$WORK" "$RAW/deadline.json"
"$PY" "$LAB/lb_run.py" "$WORK/gen" "$PY" "$LAB" "$NGINX" "$WORK" "$RAW/lb.json"
"$PY" "$LAB/status_run.py" "$WORK/gen" "$PY" "$LAB" "$NGINX" "$WORK" "$RAW/status.json"
"$PY" "$LAB/graphql_run.py" "$RAW/graphql.json"
cd "$HERE"
python3 make_data.py && sh build.sh && python3 check_embed.py | tail -1
