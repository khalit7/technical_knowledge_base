#!/bin/sh
# Rerun every measurement on the page into out/. Usage: sh run_all.sh <python 3.13 with aioquic and certifi> <scratch dir>
# The scratch dir gets a throwaway CA (private keys stay there). Ports used: TCP/UDP 30000-30099 on 127.0.0.1 only.
# Public traffic: about 60 MB from speed.cloudflare.com/__down (Cloudflare's speed-test endpoint) and about 120 pings to 1.1.1.1.
# Takes about 2 minutes. Then: python3 ../make_data.py && sh ../build.sh && python3 ../check_embed.py
set -e
PY="${1:?python}"; S="${2:?scratch dir}"; cd "$(dirname "$0")"; mkdir -p out
[ -f "$S/pki/server.key" ] || sh ../../../src/wire/make_ca.sh "$S/pki" >/dev/null
"$PY" local_sockets.py > out/local_sockets.json
"$PY" quic_migrate.py "$S/pki" > out/quic_migrate.json
"$PY" path_mtu.py > out/path_mtu.json
"$PY" tcp_path.py > out/tcp_path.json
sleep 2
"$PY" loaded_latency.py > out/loaded_latency.json
{ echo "recorded: $(date '+%Y-%m-%d %H:%M %Z')"; sw_vers 2>/dev/null | tr '\t' ' '; uname -sm
  "$PY" -c "import sys,ssl,aioquic;print('python',sys.version.split()[0],'|',ssl.OPENSSL_VERSION,'| aioquic',aioquic.__version__)"
  for k in net.inet.tcp.msl net.inet.ip.portrange.first net.inet.ip.portrange.last kern.ipc.somaxconn net.inet.tcp.keepidle \
           net.inet.tcp.keepintvl net.inet.tcp.keepcnt net.inet.tcp.delayed_ack net.inet.tcp.sack net.inet.tcp.ecn \
           net.inet.tcp.autorcvbufmax net.inet.tcp.recvspace net.inet.tcp.sendspace net.inet.udp.recvspace net.inet.udp.maxdgram \
           kern.ipc.maxsockbuf net.inet.tcp.use_newreno net.inet.tcp.cubic_sockets; do sysctl "$k"; done
} > out/env.txt
echo ok
