#!/bin/sh
# Timed compile-time runs (fresh process each), under the shared bench lock. Writes ../inputs/time_compile.jsonl.
# usage: sh time_compile.sh <python> <scratch dir> <lock.sh>
PY=$1; SCR=$2; LOCK=$3; OUT=../inputs/time_compile.jsonl
cd "$(dirname "$0")"; : > $OUT
run() { # label cache_dir args...
  lab=$1; dir=$2; shift 2
  line=$(TORCHINDUCTOR_CACHE_DIR=$dir $PY ct_one.py "$@" 2>/dev/null | grep '^RESULT ' | sed 's/^RESULT //')
  echo "{\"label\": \"$lab\", \"r\": $line}" >> $OUT; echo "$lab $line" | cut -c1-160
}
for r in 1 2 3; do
  for L in 4 8; do
    for v in whole regional nested; do
      d=$SCR/ct_${v}_${L}_$r; rm -rf $d; run "cold_${v}_$L" $d $v $L --steps 20
    done
  done
  a=$SCR/cache_a_$r; b=$SCR/cache_b_$r; rm -rf $a $b
  run cold_whole_4_save $a whole 4 --save-mega $SCR/mega_$r.bin
  run warm_whole_4 $a whole 4
  run mega_whole_4 $b whole 4 --load-mega $SCR/mega_$r.bin
  sh $LOCK touch bench tcp >/dev/null
done
