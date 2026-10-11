#!/bin/sh
# usage: qladder.sh <INF> <tag> <base.gguf> <calib.txt> <chunks> ITEM...   ITEM = TYPE or TYPE+i (with imatrix)
# Holds the bench lock for the whole ladder. Writes $INF/lo/runs/<tag>/<item>.{bench.json,ppl.log,size} and deletes each quant after measuring (unless listed in KEEP).
INF=$1; TAG=$2; BASE=$3; CAL=$4; CH=$5; shift 5
INF_DIR=$INF; . $INF/ibench/env.sh
O=$INF/lo/runs/$TAG; Q=$INF/lo/q; mkdir -p $O
W=$INF/data/wiki.test.raw
$INF/lock.sh acquire bench lo 5400 || exit 1
echo "start $(date '+%H:%M:%S')" >> $O/progress.log
if [ ! -f $O/base.kld ]; then
  echo "{\"before\":$(load)," > $O/F16.load
  llama-perplexity -m $BASE -f $W -c 512 --chunks $CH -ngl 99 -fa on --kl-divergence-base $O/base.kld > $O/F16.ppl.log 2>&1
  llama-bench -m $BASE -p 512 -n 128 -r 5 -ngl 99 -fa 1 -o json > $O/F16.bench.json 2> $O/F16.bench.err
  echo "\"after\":$(load)}" >> $O/F16.load; stat -f %z $BASE > $O/F16.size
  echo "F16 done $(date '+%H:%M:%S')" >> $O/progress.log
fi
$INF/lock.sh touch bench lo >/dev/null
if [ ! -f $O/imatrix.gguf ]; then
  llama-imatrix -m $BASE -f $CAL -o $O/imatrix.gguf -c 512 -ngl 99 > $O/imatrix.log 2>&1
  echo "imatrix done rc=$? $(date '+%H:%M:%S')" >> $O/progress.log
fi
for it in "$@"; do
  [ -f $O/$it.ppl.log ] && grep -q 'Same top' $O/$it.ppl.log && continue
  $INF/lock.sh touch bench lo >/dev/null
  T=${it%+i}; IM=""; [ "$T" != "$it" ] && IM="--imatrix $O/imatrix.gguf"
  F=$Q/$TAG-$it.gguf
  [ -f $F ] || llama-quantize $IM $BASE $F $T 8 > $O/$it.quant.log 2>&1
  stat -Lf %z $F > $O/$it.size
  echo "{\"before\":$(load)," > $O/$it.load
  llama-bench -m $F -p 512 -n 128 -r 5 -ngl 99 -fa 1 -o json > $O/$it.bench.json 2> $O/$it.bench.err
  llama-perplexity -m $F -f $W -c 512 --chunks $CH -ngl 99 -fa on --kl-divergence-base $O/base.kld --kl-divergence > $O/$it.ppl.log 2>&1
  echo "\"after\":$(load)}" >> $O/$it.load
  case " $KEEP " in *" $it "*) ;; *) rm -f $F;; esac
  echo "$it done $(date '+%H:%M:%S') $(grep -E 'Mean +KLD' $O/$it.ppl.log | head -1)" >> $O/progress.log
done
$INF/lock.sh release bench lo
echo "end $(date '+%H:%M:%S')" >> $O/progress.log
