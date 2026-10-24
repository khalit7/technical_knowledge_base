#!/bin/sh
# Rerun every capture behind the On the wire tab into raw/ (then: python build_data.py; python check_wire.py).
# Usage: sh run_all.sh <scratch dir> [section ...]   sections: env pki local h3 netem tls hol public dns certs  (default: all)
# The scratch dir holds the venv (.venv with h2 hypercorn aioquic httpx cryptography dnspython) and the private keys (pki/).
# Ports: server 8443 (TCP+UDP) and 8080; netem proxy 18443 (TCP+UDP). Public hosts get only read-only GETs, a few per host.
set -u
S="${1:?scratch dir}"; shift; W="$(cd "$(dirname "$0")" && pwd)"; R="$W/raw"; PY="$S/.venv/bin/python"; CA="$S/pki/ca.pem"
SECTIONS="${*:-env pki local h3 netem tls hol public dns certs}"
mkdir -p "$R"
has() { case " $SECTIONS " in *" $1 "*) return 0;; esac; return 1; }
CURLW='%{http_version}\t%{time_namelookup}\t%{time_connect}\t%{time_appconnect}\t%{time_pretransfer}\t%{time_starttransfer}\t%{time_total}\t%{size_download}\t%{remote_ip}\n'
CURLH='http_version\ttime_namelookup\ttime_connect\ttime_appconnect\ttime_pretransfer\ttime_starttransfer\ttime_total\tsize_download\tremote_ip'
post() { curl -sS -o /dev/null -N --cacert "$CA" -H 'content-type: application/json' -H 'x-api-key: sk-wirelab-not-a-real-key' --data-binary @"$W/request.json" -w "$CURLW" "$@"; }

if has env; then
  { echo "date_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; echo "machine: $(sysctl -n machdep.cpu.brand_string) $(sysctl -n hw.ncpu) cores"; echo "os: $(sw_vers -productName) $(sw_vers -productVersion) ($(uname -sr))"
    echo "load_avg: $(sysctl -n vm.loadavg)"; echo "curl: $(curl --version | head -1)"; echo "openssl_cli: $(openssl version)"; echo "dig: $(dig -v 2>&1 | head -1)"
    "$PY" -c "import sys,ssl,h2,aioquic,httpx;from importlib.metadata import version as v;print('python:',sys.version.split()[0]);print('python_ssl:',ssl.OPENSSL_VERSION);print('hypercorn:',v('hypercorn'),'h2:',h2.__version__,'aioquic:',aioquic.__version__,'httpx:',httpx.__version__)"
  } > "$R/env.txt"
fi

if has pki; then [ -f "$S/pki/server.key" ] || sh "$W/make_ca.sh" "$S/pki"; cp "$S/pki/ca.pem" "$S/pki/server.pem" "$R/"; fi

# the server for this run (stopped at the end)
sh "$W/serve.sh" "$PY" "$S/pki" > "$S/run_all_server.log" 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null; pkill -f "netem.py --(tcp|udp) 18443" 2>/dev/null' EXIT
sleep 3
netem() { "$PY" "$W/netem.py" "$@" & NP=$!; sleep 0.8; }
stopnetem() { kill $NP 2>/dev/null; wait $NP 2>/dev/null; sleep 0.3; }

if has local; then
  "$PY" "$W/raw_h1.py" > /dev/null
  curl -sS -v --http2 -N --cacert "$CA" --resolve api.llm.test:8443:127.0.0.1 https://api.llm.test:8443/v1/messages -H 'content-type: application/json' -H 'x-api-key: sk-wirelab-not-a-real-key' --data-binary @"$W/request.json" > "$R/curl_local_h2_body.txt" 2> "$R/curl_local_h2_verbose.txt"
  { printf "run\tpath\t$CURLH\n"; for i in $(seq 1 20); do for v in --http1.1 --http2; do printf "$i\tdirect\t"; post $v --resolve api.llm.test:8443:127.0.0.1 https://api.llm.test:8443/v1/messages; done; done; } > "$R/curl_local.tsv"
  "$PY" "$W/wire_client.py" --proto h1 --ca "$CA" --runs 10 --out "$R/client_h1.json" > /dev/null
  "$PY" "$W/wire_client.py" --proto h2 --ca "$CA" --runs 10 --out "$R/client_h2.json" > /dev/null
fi

if has h3; then
  rm -rf "$R/qlog_h3"; "$PY" "$W/h3_client.py" --ca "$CA" --qlog "$R/qlog_h3" --json --out "$R/h3_local.json" > /dev/null
  "$PY" "$W/h3_client.py" --ca "$CA" --runs 10 --json --out "$R/h3_local_runs.json" > /dev/null
fi

if has netem; then  # the same request with a 50 ms round trip added (25 ms each way)
  netem --tcp 18443:8443 --delay-ms 25
  { printf "run\tpath\t$CURLH\n"; for i in $(seq 1 10); do for v in --http1.1 --http2; do printf "$i\tnetem50\t"; post $v --resolve api.llm.test:18443:127.0.0.1 https://api.llm.test:18443/v1/messages; done; done; } > "$R/curl_netem.tsv"
  "$PY" "$W/wire_client.py" --proto h1 --port 18443 --ca "$CA" --runs 10 --out "$R/client_h1_netem.json" > /dev/null
  "$PY" "$W/wire_client.py" --proto h2 --port 18443 --ca "$CA" --runs 10 --out "$R/client_h2_netem.json" > /dev/null
  "$PY" "$W/wire_client.py" --proto h2 --port 18443 --ca "$CA" --runs 3 --keepalive --out "$R/keepalive_netem.json" > /dev/null
  "$PY" "$W/wire_client.py" --proto h2 --port 18443 --ca "$CA" --runs 3 --resume --out "$R/resume_netem.json" > /dev/null
  stopnetem
  netem --udp 18443:8443 --delay-ms 25
  rm -rf "$R/qlog_h3_netem"; "$PY" "$W/h3_client.py" --ca "$CA" --port 18443 --runs 10 --json --out "$R/h3_netem.json" > /dev/null
  "$PY" "$W/h3_client.py" --ca "$CA" --port 18443 --runs 3 --resume --json --out "$R/h3_resume_netem.json" > /dev/null
  "$PY" "$W/h3_client.py" --ca "$CA" --port 18443 --runs 3 --resume --early --qlog "$R/qlog_h3_0rtt" --json --out "$R/h3_0rtt_netem.json" > /dev/null 2> "$R/h3_0rtt_netem.err"
  stopnetem
fi

if has tls; then  # TLS 1.2 against 1.3, cold and resumed, over the emulated 50 ms path
  netem --tcp 18443:8443 --delay-ms 25
  for v in 1.2 1.3; do "$PY" "$W/wire_client.py" --proto h1 --port 18443 --ca "$CA" --tls $v --runs 4 --resume --out "$R/tls${v}_netem.json" > /dev/null; done
  stopnetem
  openssl s_client -connect 127.0.0.1:8443 -servername api.llm.test -CAfile "$CA" -msg -tls1_3 < /dev/null > "$R/s_client_local_tls13.txt" 2>&1
  openssl s_client -connect 127.0.0.1:8443 -servername api.llm.test -CAfile "$CA" -msg -tls1_2 < /dev/null > "$R/s_client_local_tls12.txt" 2>&1
fi

if has hol; then  # head-of-line blocking: base runs, then one loss (QUIC first, its measured stall reused for TCP)
  H="$R/hol"; rm -rf "$H"; mkdir -p "$H"
  sh "$W/hol.sh" "$PY" "$CA" "$H" base "" "" "" > /dev/null 2>&1
  sh "$W/hol.sh" "$PY" "$CA" "$H" probe "--match-bytes 147 --hold-ms 1" "--match-bytes 150 --hold-ms 1" "--match-bytes 155" > /dev/null 2>&1
  STALL=$("$PY" -c "import json;b=json.load(open('$H/base_h3.json'));l=json.load(open('$H/probe_h3.json'));print(round(l['token_ms']['0'][1]-b['token_ms']['0'][1]))")
  echo "$STALL" > "$H/quic_stall_ms.txt"
  sh "$W/hol.sh" "$PY" "$CA" "$H" loss "--match-bytes 147 --hold-ms $STALL" "--match-bytes 150 --hold-ms $STALL" "--match-bytes 155" > /dev/null 2>&1
  rm -rf "$H"/qlog_base "$H"/qlog_probe
fi

if has public; then  # read-only GETs to public hosts, no credentials; 5 cold connections each
  { printf "run\thost\t$CURLH\n"
    for i in 1 2 3 4 5; do for u in https://api.anthropic.com/ https://api.openai.com/ https://www.google.com/generate_204 https://www.cloudflare.com/cdn-cgi/trace https://huggingface.co/api/whoami-v2; do
      printf "$i\t$u\t"; curl -sS -o /dev/null --http2 -A 'wire-lab/1 (read-only timing)' -w "$CURLW" "$u"; done; sleep 1; done; } > "$R/public_curl.tsv"
  for v in 1.2 1.3; do "$PY" "$W/wire_client.py" --proto h1 --host www.cloudflare.com --port 443 --sni www.cloudflare.com --get /cdn-cgi/trace --tls $v --runs 3 --resume --nowire --out "$R/public_tls${v}_cloudflare.json" > /dev/null; done
  "$PY" "$W/wire_client.py" --proto h1 --host www.cloudflare.com --port 443 --sni www.cloudflare.com --get /cdn-cgi/trace --runs 1 --out "$R/public_wire_cloudflare.json" > /dev/null
fi

if has dns; then
  for n in api.anthropic.com api.openai.com huggingface.co; do dig "$n" A > "$R/dig_$n.txt" 2>&1; done
  dig api.anthropic.com A +trace > "$R/dig_trace_api.anthropic.com.txt" 2>&1
  # a root server (a.root-servers.net, 198.41.0.4) never answers for api.anthropic.com and never recurses: an answer means port-53 traffic is intercepted on the way
  dig @198.41.0.4 api.anthropic.com A +norecurse > "$R/dig_root_norecurse.txt" 2>&1
  # the same question over DNS-over-HTTPS (RFC 8484, JSON API), which an on-path resolver cannot answer for
  # by IP literal it works; by name, on this managed laptop, the name is answered by a device-management DNS filter whose block page
  # presents a certificate from the filter's own CA: the symptom is a certificate error, the cause is DNS (vendor name redacted)
  curl -sS -H 'accept: application/dns-json' 'https://1.1.1.1/dns-query?name=api.anthropic.com&type=A' > "$R/doh_api.anthropic.com.json"
  { echo "\$ dig +short cloudflare-dns.com A"; dig +short cloudflare-dns.com A
    echo "\$ curl -sS -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=api.anthropic.com&type=A'"; curl -sS -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=api.anthropic.com&type=A' 2>&1 | head -1
    echo "\$ openssl s_client -connect cloudflare-dns.com:443 -servername cloudflare-dns.com | grep -E 'subject=|issuer=|Verify return'"
    openssl s_client -connect cloudflare-dns.com:443 -servername cloudflare-dns.com < /dev/null 2>/dev/null | grep -E 'subject=|issuer=|Verify return' | head -3
  } > "$R/doh_by_name_blocked.txt" 2>&1
  perl -pi -e 's/^issuer=.*$/issuer=(the DNS filter'"'"'s own block-page CA; vendor name redacted)/' "$R/doh_by_name_blocked.txt"
  { printf "run\tname\tquery_ms\n"; for i in 1 2 3; do for n in api.anthropic.com example.org; do printf "$i\t$n\t%s\n" "$(dig $n A | sed -n 's/;; Query time: \([0-9]*\) msec/\1/p')"; done; done; } > "$R/dig_repeat.tsv"
fi

if has certs; then  # the real certificate chain of a real LLM API (subjects, issuers, dates only), and the local one
  for f in "$R/server.pem" "$R/ca.pem"; do openssl x509 -in "$f" -noout -subject -issuer -dates; openssl x509 -in "$f" -noout -text | grep -E 'Public-Key:|Signature Algorithm' | sort -u; openssl x509 -in "$f" -noout -text | grep -A1 'Subject Alternative Name' | tail -1 | cut -c1-160; echo "--"; done > "$R/chain_local.txt"
  for h in api.anthropic.com api.openai.com; do
    openssl s_client -connect $h:443 -servername $h -showcerts < /dev/null 2>/dev/null | awk '/BEGIN CERT/{n++;f="'"$S"'/chain_'"$h"'_"n".pem"} f{print > f} /END CERT/{f=""}'
    for f in "$S"/chain_${h}_*.pem; do openssl x509 -in "$f" -noout -subject -issuer -dates; openssl x509 -in "$f" -noout -text | grep -E 'Public-Key:|Signature Algorithm' | sort -u; openssl x509 -in "$f" -noout -text | grep -A1 'Subject Alternative Name' | tail -1 | cut -c1-160; echo "--"; done > "$R/chain_$h.txt"
    rm -f "$S"/chain_${h}_*.pem
  done
fi
# the resolver dig used is this machine's home router: keep its role, drop its address
for f in "$R"/dig_*.txt; do [ -f "$f" ] && perl -pi -e 's/^;; SERVER: (?!198\.41\.0\.4).*$/;; SERVER: (local network resolver, address redacted)/; s/from ([0-9a-f:.]+)#53\(\1\)/from (local network resolver, address redacted)/' "$f"; done
# redact anything secret-looking from every text capture
grep -rlE 'glpat-|sk-ant-|Bearer [A-Za-z0-9]' "$R" 2>/dev/null | while read f; do perl -pi -e 's/(glpat-|sk-ant-)[A-Za-z0-9_-]+/$1REDACTED/g; s/Bearer [A-Za-z0-9._-]+/Bearer REDACTED/g' "$f"; done
echo "done: $SECTIONS"
