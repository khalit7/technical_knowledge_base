#!/bin/sh
# llama-server start-to-ready time and resident memory, GGUF mapped (--load-mode mmap) or read (--load-mode none).
# Usage: sh mmap_bench.sh <model.gguf> <reps> <port>   (prints one line per run)
# Warm page cache (the file was just read); ready = /health returns 200. RSS from ps after ready.
M=$1; N=$2; P=$3
for r in $(seq 1 $N); do
  for mode in mmap none; do
    s=$(python3 -c 'import time;print(time.time())')
    llama-server -m "$M" --port $P -ngl 99 -c 2048 -np 1 --load-mode $mode > /dev/null 2>&1 &
    pid=$!
    while ! curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$P/health 2>/dev/null | grep -q 200; do
      kill -0 $pid 2>/dev/null || break; sleep 0.05; done
    e=$(python3 -c 'import time;print(time.time())')
    rss=$(ps -o rss= -p $pid)
    echo "run=$r mode=$mode ready_s=$(python3 -c "print(round($e-$s,3))") rss_kib=$rss load=$(sysctl -n vm.loadavg | tr -d '{}')"
    kill $pid; wait $pid 2>/dev/null
  done
done
