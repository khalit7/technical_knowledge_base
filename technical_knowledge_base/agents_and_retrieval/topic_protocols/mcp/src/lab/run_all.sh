#!/bin/sh
# Re-run every recording on this page (about 3 minutes). Writes out/*.json.
# Usage: sh run_all.sh <scratch dir>   (venvs, the throwaway CA and the signing key live there, never in the repo)
# Ports 30710-30761 on 127.0.0.1. No model is called anywhere; the user's consent and "yes" are scripted.
set -e
S="${1:?scratch dir}"; H="$(cd "$(dirname "$0")" && pwd)"; O="$H/out"; mkdir -p "$O" "$S"
export UV_PYTHON_INSTALL_BIN=0
[ -x "$S/.venv/bin/python" ] || { uv venv -q -p 3.13 "$S/.venv"; uv pip install -q -p "$S/.venv/bin/python" "mcp==2.3.0" pyjwt cryptography httpx; }
[ -x "$S/.venv1/bin/python" ] || { uv venv -q -p 3.13 "$S/.venv1"; uv pip install -q -p "$S/.venv1/bin/python" "mcp==1.30.0"; }
[ -f "$S/pki/ca.pem" ] || sh "$H/../../../src/wire/make_ca.sh" "$S/pki" > /dev/null
P="$S/.venv/bin/python"
"$P" "$H/replicas.py" "$O/replicas.json" 20
"$P" "$H/transports.py" "$O/transports.json" 300 > "$S/transports.log"
"$P" "$H/compat.py" "$P" "$S/.venv1/bin/python" "$O/compat.json" > "$S/compat.log"
"$P" "$H/auth_run.py" "$S/pki" "$S/keys" "$O/auth.json" > "$S/auth.log" 2>&1
"$P" "$H/wire_checks.py" "$O/wire_checks.json"
{ date -u +%Y-%m-%dT%H:%MZ; uname -sr; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'
  "$P" -c "import sys;print('python',sys.version.split()[0])"
  "$P" -c "import importlib.metadata as m;print(' '.join(p+' '+m.version(p) for p in ['mcp','mcp_types','httpx2','starlette','uvicorn','pyjwt']))"
  "$S/.venv1/bin/python" -c "import importlib.metadata as m;print('legacy venv: mcp',m.version('mcp'))"; } > "$O/versions.txt"
# redaction: scratch paths and the home directory never enter the repository
python3 "$H/redact.py" "$O" "$S"
