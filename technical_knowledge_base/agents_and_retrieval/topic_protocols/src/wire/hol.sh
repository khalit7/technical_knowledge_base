#!/bin/sh
# Head-of-line blocking runs: 3 requests over h1/h2/h3 through netem.py (25 ms each way).
# Usage: sh hol.sh <python> <ca.pem> <outdir> <tag> ["netem args for h1"] ["for h2"] ["for h3"]
# Ports: proxy 18443 (TCP and UDP) in front of the server on 8443.
PY=$1; CA=$2; OUT=$3; TAG=$4; X_h1=$5; X_h2=$6; X_h3=$7; W="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
for pr in h1 h2 h3; do
  rm -f "$OUT/nt_${TAG}_$pr.log"
  eval X=\$X_$pr
  if [ $pr = h3 ]; then M="--udp 18443:8443 $X"; else M="--tcp 18443:8443 $X"; fi
  "$PY" "$W/netem.py" $M --delay-ms 25 --log "$OUT/nt_${TAG}_$pr.log" & NP=$!
  sleep 0.8
  Q=""; [ $pr = h3 ] && Q="--qlog $OUT/qlog_${TAG}"
  "$PY" "$W/hol_client.py" --proto $pr --port 18443 --ca "$CA" --out "$OUT/${TAG}_$pr.json" $Q | cut -c1-400
  kill $NP; sleep 0.4
done
