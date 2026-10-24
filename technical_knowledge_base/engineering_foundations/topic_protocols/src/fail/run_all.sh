#!/bin/sh
# Failure lab: rerun every reproduction and rewrite out/*.json, then regenerate the page data.
# Usage: FAIL_WORK=<scratch dir> [FAIL_REDACT='pat=rep;...'] sh run_all.sh [module ...]   (see README: Redaction)   (modules: conn dns tls http h2 tcp auth agent)
# Everything runs on 127.0.0.1 (ports 27080-27500, DNS on UDP 27353-27355), except four labelled, read-only
# public lookups (a TEST-NET address for the connect timeout, api.anthropic.com's TTL, an .invalid name).
# Needs: uv, curl, dig, nc, node, a C compiler (to build nginx with the poll event module: the conda-forge
# build spins on kevent() errors after failed TLS handshakes on macOS 27). Nothing is installed outside FAIL_WORK.
set -e
: "${FAIL_WORK:?set FAIL_WORK to a scratch directory}"
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1 UV_PYTHON_INSTALL_BIN=0
W="$FAIL_WORK"; mkdir -p "$W"
# 1. Python 3.13 venv with the libraries the clients and servers use
[ -x "$W/.venv/bin/python" ] || { uv venv -q -p 3.13 "$W/.venv"; uv pip install -q -p "$W/.venv/bin/python" \
  httpx requests grpcio cryptography dnspython "mcp==2.3.0" pyjwt h2 hypercorn aioquic; }
# 2. OpenSSL 3.6 command-line tool and libraries from conda-forge (micromamba, inside FAIL_WORK)
if [ ! -x "$W/mm/ngx/bin/openssl" ]; then
  mkdir -p "$W/mm"; curl -sSL -o "$W/mm/mm.tar.bz2" https://micro.mamba.pm/api/micromamba/osx-arm64/latest
  tar -xjf "$W/mm/mm.tar.bz2" -C "$W/mm" bin/micromamba
  MAMBA_ROOT_PREFIX="$W/mm/root" "$W/mm/bin/micromamba" create -y -q -p "$W/mm/ngx" -c conda-forge nginx openssl
fi
# 3. nginx 1.31.6 from source, with the poll event module, against those libraries
if [ ! -x "$W/ngxb/sbin/nginx" ]; then
  mkdir -p "$W/ngxsrc"; curl -sSfL https://nginx.org/download/nginx-1.31.6.tar.gz | tar xz -C "$W/ngxsrc"
  (cd "$W/ngxsrc/nginx-1.31.6" && ./configure --prefix="$W/ngxb" --with-poll_module --without-select_module \
     --with-http_ssl_module --with-http_v2_module --with-stream --without-http_rewrite_module \
     --with-cc-opt="-I$W/mm/ngx/include" --with-ld-opt="-L$W/mm/ngx/lib -Wl,-rpath,$W/mm/ngx/lib" >/dev/null && make -j4 >/dev/null && make install >/dev/null)
fi
# 4. Certificates: the On the wire tab's local CA (../wire/make_ca.sh) plus the broken variants (pki.py)
[ -f "$W/pki/ca.pem" ] || sh ../wire/make_ca.sh "$W/pki" >/dev/null
"$W/.venv/bin/python" pki.py "$W/pki"
# 5. Run the cases (each writes out/<case>.json), then build the page data and check it
FAIL_WORK="$W" "$W/.venv/bin/python" run_cases.py "$@" | tee "$W/run_all.log"
python3 make_data.py
