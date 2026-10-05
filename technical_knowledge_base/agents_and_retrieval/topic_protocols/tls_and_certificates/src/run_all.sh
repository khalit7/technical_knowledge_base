#!/bin/sh
# Rerun every recording used by the page into raw/, then make_data.py.
# Needs: WORK=<scratch dir>, PYBIN=<python 3.13 built with OpenSSL 3.5+>, OPENSSL=<openssl 3.5+ binary>,
# NGINX_BIN=<nginx built with OpenSSL 3.5+> (the root Failure lab's builds work), Docker for the ACME step.
# Private keys and the venv stay in WORK; only public certificates and recordings land in raw/.
# Ports 30200-30299 on 127.0.0.1 (this page's range); Docker containers are named proto-tls-* and removed afterwards.
set -e
cd "$(dirname "$0")"
: "${WORK:?}" "${PYBIN:?}" "${OPENSSL:?}" "${NGINX_BIN:?}"
export UV_PYTHON_INSTALL_BIN=0 PYTHONDONTWRITEBYTECODE=1 OPENSSL NGINX_BIN
[ -x "$WORK/.venv/bin/python" ] || { uv venv -q -p "$PYBIN" "$WORK/.venv"; uv pip install -q --python "$WORK/.venv/bin/python" \
  cryptography hypercorn h2 httpx requests truststore certifi acme josepy dnspython aioquic pyopenssl; }
PY="$WORK/.venv/bin/python"
OPENSSL="$OPENSSL" sh lab/pki.sh "$WORK/pki"
mkdir -p raw/certs
for c in root inter leaf leaf_b client rsa_leaf mldsa44_leaf mldsa44_inter mldsa65_leaf; do cp "$WORK/pki/$c.pem" raw/certs/; done
for m in tls13 mtls tls12 rsa mldsa44 mldsa65; do "$PY" lab/hs_record.py "$WORK/pki" 30201 $m raw/hs_$m.json > /dev/null; done
"$PY" lab/zero_rtt.py "$WORK/zr" "$WORK/pki" raw/zero_rtt.json
"$PY" lab/hrr.py "$WORK/pki" raw/hrr.json
"$PY" lab/rotate.py "$WORK/pki" 30220 raw/rotate.json > /dev/null
"$PY" lab/trust_matrix.py "$WORK/pki" 30221 raw/trust_matrix.json
"$PY" lab/hs_cost.py "$WORK/pki" 30222 raw/hs_cost.json
"$PY" lab/public_chains.py "$("$PY" -c 'import certifi;print(certifi.where())')" raw/public_chains.json
"$PY" lab/ct_caa.py raw/public_chains.json raw/ct_caa.json
# crypto speed on this machine (only the result tables are kept: the build banner carries local paths)
{ "$OPENSSL" version; "$OPENSSL" speed -seconds 2 ecdsap256 rsa2048 ecdhx25519 ML-KEM-768 ML-DSA-44 ML-DSA-65 2>/dev/null | grep -E '^ *(rsa|[0-9]+ bits|ML-|sign|keygen|op )'
  "$OPENSSL" speed -seconds 2 -bytes 16384 -evp aes-128-gcm 2>/dev/null | grep -E '^AES|^type'
  "$OPENSSL" speed -seconds 2 -bytes 16384 -evp chacha20-poly1305 2>/dev/null | grep -E '^ChaCha'; } > raw/speed.txt
# ACME against Pebble (Let's Encrypt's test CA) and its challenge test server, in Docker
mkdir -p "$WORK/acme"; docker network create proto-tls-net > /dev/null 2>&1 || true
docker create --name proto-tls-tmp ghcr.io/letsencrypt/pebble:latest > /dev/null && docker cp proto-tls-tmp:/test "$WORK/acme/" && docker rm proto-tls-tmp > /dev/null
docker run -d --rm --name proto-tls-chall --network proto-tls-net --cpus 1 --memory 1g -p 127.0.0.1:30241:8055 ghcr.io/letsencrypt/pebble-challtestsrv:latest -defaultIPv6 "" > /dev/null
sleep 2; CIP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' proto-tls-chall)
curl -s -X POST 127.0.0.1:30241/set-default-ipv4 -d "{\"ip\":\"$CIP\"}" > /dev/null
docker run -d --rm --name proto-tls-pebble --network proto-tls-net --cpus 1 --memory 1g -p 127.0.0.1:30240:14000 -e PEBBLE_VA_NOSLEEP=1 \
  ghcr.io/letsencrypt/pebble:latest -config /test/config/pebble-config.json -dnsserver "$CIP:8053" > /dev/null
sleep 3
"$PY" lab/acme_flow.py https://localhost:30240/dir http://127.0.0.1:30241 "$WORK/acme/test/certs/pebble.minica.pem" "$WORK/acme" raw/acme_flow.json > /dev/null
docker stop proto-tls-pebble proto-tls-chall > /dev/null; docker network rm proto-tls-net > /dev/null 2>&1 || true
python3 make_data.py
