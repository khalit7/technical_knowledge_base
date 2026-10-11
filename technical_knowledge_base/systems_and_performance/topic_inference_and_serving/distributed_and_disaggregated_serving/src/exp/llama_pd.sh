#!/bin/sh
# usage: INF_DIR=... DD_WORK=... sh llama_pd.sh <run-index>   (the caller holds the bench lock)
# Two llama-server processes (Homebrew build 11146, Metal), Qwen3-1.7B Q8_0, ports 8151 (prefill) and 8152 (decode).
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; W=${DD_WORK:?}; k=$1
O=$W/out/lpd; S=$W/slots; mkdir -p $O $S
M=$I/models/gguf/Qwen3-1.7B-Q8_0.gguf
sysctl -n vm.loadavg > $O/load_before_$k.txt
for p in 8151 8152; do
  llama-server -m $M -ngl 99 -fa on -np 2 -c 16384 --cache-ram 0 --slot-save-path $S/ --port $p --host 127.0.0.1 > $O/server_${p}_$k.log 2>&1 &
  echo $! > $O/pid_$p
done
for p in 8151 8152; do for i in $(seq 1 120); do curl -sf http://127.0.0.1:$p/health >/dev/null 2>&1 && break; sleep 1; done; done
python3 -I $H/llama_pd.py 8151 8152 $S $O/lpd_$k.json $k > $O/lpd_$k.log 2>&1
for p in 8151 8152; do kill $(cat $O/pid_$p); done; wait
sysctl -n vm.loadavg > $O/load_after_$k.txt
