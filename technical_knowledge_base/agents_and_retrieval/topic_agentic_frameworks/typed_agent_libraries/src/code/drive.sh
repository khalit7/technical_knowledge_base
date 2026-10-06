#!/bin/sh
# Runs every library mode on the ten cases: greedy, then two sampled passes at 0.7. One request at a time
# (the proxy holds the shared lock). Stop early with: touch STOP
cd "$(dirname "$0")"
OUT=$PWD/out; mkdir -p $OUT
for spec in "greedy 0.0" "t07_1 0.7" "t07_2 0.7"; do
  set -- $spec; TAG=$1; T=$2
  for m in tool native prompted; do
    [ -f STOP ] && exit 0
    ../env/bin/python run_lib.py pai $m $TAG $T $OUT
  done
  [ -f STOP ] && exit 0
  ../env/bin/python run_lib.py oai output_type $TAG $T $OUT
  [ -f STOP ] && exit 0
  ../adkenv/bin/python run_adk.py $TAG $T $OUT
done
echo ALLDONE
