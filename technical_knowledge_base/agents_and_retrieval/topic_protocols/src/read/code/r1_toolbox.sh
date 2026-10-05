#!/bin/sh
# The debugging toolbox, one tool per layer, all against the local Wire Lab server (src/wire/REQUEST.md).
# Usage: sh r1_toolbox.sh <ca.pem> <tls_port> <plain_port> <request.json> <outdir>
CA="$1"; TP="$2"; PP="$3"; REQ="$4"; O="$5"
# 1. Can I reach the port at all? (TCP layer)
nc -vz 127.0.0.1 "$TP" > "$O/t1_nc.txt" 2>&1
# 2. Is TLS healthy, which certificate, which version? (TLS layer)
openssl s_client -connect 127.0.0.1:"$TP" -servername api.llm.test -CAfile "$CA" -showcerts < /dev/null 2>&1 | grep -E "^depth|verify return|^ *[0-9] s:|^ *i:|Protocol *:|Cipher *:|Verify return code|Server public key|Peer signature|Server Temp Key" > "$O/t2_openssl.txt"
# 3. The whole request with every layer narrated (curl -v), HTTP/1.1 then HTTP/2
curl -sS -v --http1.1 -N --cacert "$CA" --resolve api.llm.test:"$TP":127.0.0.1 https://api.llm.test:"$TP"/v1/messages \
  -H 'content-type: application/json' -H 'x-api-key: sk-wirelab-not-a-real-key' --data-binary @"$REQ" > "$O/t3_curl_h1_body.txt" 2> "$O/t3_curl_h1_v.txt"
curl -sS -v --http2 -N --cacert "$CA" --resolve api.llm.test:"$TP":127.0.0.1 https://api.llm.test:"$TP"/v1/messages \
  -H 'content-type: application/json' -H 'x-api-key: sk-wirelab-not-a-real-key' --data-binary @"$REQ" > "$O/t3_curl_h2_body.txt" 2> "$O/t3_curl_h2_v.txt"
# 4. Where does the time go? (curl's own timers)
curl -sS -o /dev/null --http1.1 --cacert "$CA" --resolve api.llm.test:"$TP":127.0.0.1 https://api.llm.test:"$TP"/v1/messages \
  -H 'content-type: application/json' --data-binary @"$REQ" \
  -w 'namelookup %{time_namelookup}\nconnect %{time_connect}\ntls_done %{time_appconnect}\nfirst_byte %{time_starttransfer}\ntotal %{time_total}\nhttp_version %{http_version}\n' > "$O/t4_curl_timing.txt" 2>&1
# 5. Which sockets are open right now? (macOS has lsof and netstat; Linux has ss)
( curl -sS -N --http1.1 --cacert "$CA" --resolve api.llm.test:"$TP":127.0.0.1 https://api.llm.test:"$TP"/v1/messages \
  -H 'content-type: application/json' --data-binary @"$REQ" > /dev/null & ); sleep 0.15
lsof -nP -iTCP:"$TP" | sed 's/  */ /g' > "$O/t5_lsof.txt" 2>&1
sleep 0.5
