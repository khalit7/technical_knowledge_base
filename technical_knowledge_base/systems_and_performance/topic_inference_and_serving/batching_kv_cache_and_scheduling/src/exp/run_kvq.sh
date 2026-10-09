#!/bin/sh
# KV cache quantization quality on llama.cpp (Metal, M1 Pro): perplexity on WikiText-2 test with the cache stored as
# f16, q8_0 and q4_0 (keys and values both; flash attention on, which quantized V needs). Holds the bench lock.
# usage: INF_DIR=<scratch>/inf sh run_kvq.sh <model.gguf> <tag> <ctx> <chunks>
I=${INF_DIR:?set INF_DIR}
M=$1; tag=$2; ctx=${3:-2048}; ch=${4:-30}
R=$I/bk/results; mkdir -p $R
load(){ sysctl -n vm.loadavg | tr -d '{}' | awk '{printf "[%s,%s,%s]", $1,$2,$3}'; }
[ -n "$HAVE_LOCK" ] || $I/lock.sh acquire bench bk 5400 || exit 1
for t in f16 q8_0 q4_0; do
  lb=$(load)
  llama-perplexity -m "$M" -f $I/data/wiki.test.raw -c $ctx --chunks $ch -ngl 99 -fa on -ctk $t -ctv $t > $R/${tag}_$t.log 2>&1
  la=$(load)
  echo "{\"type\":\"$t\",\"ctx\":$ctx,\"chunks\":$ch,\"load_before\":$lb,\"load_after\":$la}" > $R/${tag}_$t.load.json
  $I/lock.sh touch bench bk >/dev/null
done
[ -n "$HAVE_LOCK" ] || $I/lock.sh release bench bk
echo done
