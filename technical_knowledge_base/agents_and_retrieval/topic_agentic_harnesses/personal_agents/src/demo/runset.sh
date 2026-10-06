#!/bin/sh
# runset.sh BACKEND MODEL then lines "scenario gate steer history label" on stdin
cd "$(dirname "$0")"
B=$1; M=$2
while read sc g st hi lab; do
  [ -z "$sc" ] && continue
  out=../runs/$lab.jsonl; rm -f $out $out.raw
  echo "start $lab $(date +%T)"
  HP_EMPTY=$PWD/../empty HP_BACKEND=$B HP_MODEL=$M HP_GATE=$g HP_STEER=$st HP_HISTORY=$hi python3 resident.py scen/$sc.json $out || echo "FAILED $lab"
  echo "end $lab $(date +%T)"
done
