#!/bin/sh
# Re-run every recording on this page (under a minute). Writes out/a2a.json and out/mcp_job.json.
# Usage: sh run_all.sh <scratch dir>   (the venv and the card-signing private key live there, never in the repo)
# Ports 30801-30842 on 127.0.0.1. No model is called anywhere: both agents and the user's answers are scripted.
set -e
S="${1:?scratch dir}"; H="$(cd "$(dirname "$0")" && pwd)"; O="$H/out"; mkdir -p "$O" "$S"
export UV_PYTHON_INSTALL_BIN=0
[ -x "$S/venv/bin/python" ] || { uv venv -q -p 3.12 "$S/venv"; uv pip install -q -p "$S/venv/bin/python" "a2a-sdk[http-server,grpc]==1.2.2" "mcp==2.3.0" uvicorn httpx pyjwt cryptography; }
P="$S/venv/bin/python"
cd "$H"
"$P" run_a2a.py "$O/a2a.json" "$S/keys" > "$S/run_a2a.log" 2>&1
"$P" mcp_same_job.py "$O/mcp_job.json" > "$S/mcp_job.log" 2>&1
{ date -u +%Y-%m-%dT%H:%MZ; uname -sr; sysctl -n machdep.cpu.brand_string
  "$P" -c "import sys;print('python',sys.version.split()[0])"
  "$P" -c "import importlib.metadata as m;print(' '.join(p+' '+m.version(p) for p in ['a2a-sdk','mcp','httpx','starlette','uvicorn','sse-starlette','protobuf','pyjwt']))"; } > "$O/versions.txt"
python3 "$H/redact.py" "$O" "$S"
