#!/bin/sh
. "$(dirname "$0")/env.sh"
$I/lock.sh acquire bench ibench 3600 >/dev/null || exit 1
for m in "$@"; do
  before=$(load)
  llama-perplexity -m $G/$m.gguf -f $I/data/wiki.test.raw -c 512 --chunks 60 -ngl 99 -fa on > $R/ppl_$m.log 2>&1
  after=$(load)
  echo "$m $(grep -E 'Final estimate' $R/ppl_$m.log) | $before"
  $I/lock.sh touch bench ibench >/dev/null
done
$I/lock.sh release bench ibench >/dev/null
