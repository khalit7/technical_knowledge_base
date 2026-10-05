#!/bin/sh
# Rerun every recording on this page (about 8 minutes). Needs Docker; everything runs in containers named proto-dns-*
# (each --cpus 1 --memory 1g --rm) on one internal network, proto-dns-net, that has no route out. Only exp_public.py
# reaches the internet: about 25 read-only lookups over DNS over TLS to 1.1.1.1, plus two HTTPS downloads below.
# Usage: DNS_WORK=<scratch dir> sh run_all.sh
set -e
cd "$(dirname "$0")"
: "${DNS_WORK:?set DNS_WORK to a scratch directory}"
export DNS_WORK
mkdir -p "$DNS_WORK/img/tools" "$DNS_WORK/img/glibc"
printf 'FROM python:3.13-alpine\nRUN apk add --no-cache unbound bind-tools iproute2-tc drill tcpdump && pip install --no-cache-dir dnspython==2.8.0 cryptography\n' > "$DNS_WORK/img/tools/Dockerfile"
printf 'FROM python:3.13-slim\nRUN apt-get update && apt-get install -y --no-install-recommends dnsutils iproute2 && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir dnspython==2.8.0\n' > "$DNS_WORK/img/glibc/Dockerfile"
docker image inspect proto-dns-tools:1 >/dev/null 2>&1 || docker build -q -t proto-dns-tools:1 "$DNS_WORK/img/tools"
docker image inspect proto-dns-glibc:1 >/dev/null 2>&1 || docker build -q -t proto-dns-glibc:1 "$DNS_WORK/img/glibc"
docker pull -q coredns/coredns:1.12.4 >/dev/null
# the root zone (InterNIC) and the root trust anchors (IANA), for exp_public.py
curl -sS -o "$DNS_WORK/root.zone" https://www.internic.net/domain/root.zone
curl -sS -o "$DNS_WORK/root-anchors.xml" https://data.iana.org/root-anchors/root-anchors.xml
cp "$DNS_WORK/root-anchors.xml" ../inputs/root-anchors.xml
docker run --rm --name proto-dns-gen --cpus 1 --memory 1g -v "$PWD:/lab:ro" -v "$DNS_WORK:/work" proto-dns-tools:1 python3 /lab/gen_zones.py /work/zones
python3 exp_walk.py
python3 exp_wire.py
python3 exp_pod.py
python3 exp_cache.py
python3 exp_sec.py
python3 exp_public.py
# tidy up: only this lab's own containers and network
for c in $(docker ps -a --format '{{.Names}}' | grep '^proto-dns-'); do docker rm -f "$c" >/dev/null; done
docker network rm proto-dns-net >/dev/null 2>&1 || true
echo done
