#!/bin/sh
# Re-run every exchange the Reading tab shows. Writes code/out/*. About 30 seconds.
# Needs: a Python 3.13 venv with OpenSSL 3.5 (for the post-quantum key share) holding
#   mcp pyjwt cryptography h2 httpx dnspython protobuf hypercorn aioquic
# Usage: sh run_all.sh <venv python> <scratch dir for the throwaway CA>
# Ports: TLS 9443, plain 9080, MCP server 9765, MCP proxy 9766 (the On the wire tab uses 8443/8080).
set -e
PY="${1:?venv python}"; S="${2:?scratch dir}"
H="$(cd "$(dirname "$0")" && pwd)"; W="$H/../../wire"; O="$H/out"; mkdir -p "$O"
[ -f "$S/pki/ca.pem" ] || sh "$W/make_ca.sh" "$S/pki" > /dev/null
TLS_PORT=9443 PLAIN_PORT=9080 sh "$W/serve.sh" "$PY" "$S/pki" > "$S/read_server.log" 2>&1 &
SRV=$!; sleep 3
cp "$S/pki/ca.pem" "$O/ca.pem"
sh "$H/r1_toolbox.sh" "$S/pki/ca.pem" 9443 9080 "$W/request.json" "$O"
"$PY" "$H/r2_tls_wire.py" "$S/pki/ca.pem" 9443 9080 "$W/raw/h1_request.bin" "$O/tls.json" > "$O/tls.txt"
"$PY" "$H/r3_dns.py" "$O/dns.json" > /dev/null
"$PY" "$H/r5_small.py" "$O/small.json" > /dev/null 2>&1
"$PY" "$H/r6_mcp/run.py" 9765 9766 "$O/mcp.json" > /dev/null 2>&1
kill $SRV 2>/dev/null || true; pkill -f "hypercorn llm_server:app.*9443" 2>/dev/null || true
{ date -u +%Y-%m-%dT%H:%MZ; uname -sr; sysctl -n machdep.cpu.brand_string; uptime | sed 's/.*load/load/'
  "$PY" -c "import sys,ssl;print('python',sys.version.split()[0]);print(ssl.OPENSSL_VERSION)"
  "$PY" -c "import importlib.metadata as m;print(' '.join(p+' '+m.version(p) for p in ['mcp','hypercorn','h2','pyjwt','protobuf','dnspython','cryptography']))"
  curl --version | head -1; openssl version; dig -v 2>&1; } > "$O/versions.txt"
# privacy: never keep the local network's addresses (router resolver IPv6/IPv4)
for f in "$O"/*; do perl -0pi -e 's/\b2a0a:[0-9a-f:]+/[local address redacted]/gi' "$f"; done
# redact anything that looks like a real secret (none expected: the API key is a fixed fake)
grep -rlE 'glpat-|sk-ant-|Bearer [A-Za-z0-9]' "$O" && { echo "SECRET-LIKE STRING FOUND"; exit 1; } || true
echo done
