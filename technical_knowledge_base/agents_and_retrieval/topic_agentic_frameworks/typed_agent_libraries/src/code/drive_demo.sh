#!/bin/sh
# Mechanism demos, one at a time through proxy 8292 (shared lock). Each task run gets a fresh task-repo copy.
cd "$(dirname "$0")"; OUT=$PWD/out; mkdir -p $OUT runs
fresh() { rm -rf runs/$1; cp -R ../../task_repo runs/$1; echo runs/$1; }
check() { (cd runs/$1 && python3 tests/test_core.py > ../$1.tests.txt 2>&1; echo "exit $?" >> ../$1.tests.txt); cmp -s runs/$1/tests/test_core.py ../../task_repo/tests/test_core.py && echo same >> runs/$1.tests.txt || echo CHANGED >> runs/$1.tests.txt; (cd runs/$1 && diff -ru ../../../../task_repo/textstats textstats > ../$1.diff 2>&1); }
for spec in "greedy 0.0" "t07_1 0.7" "t07_2 0.7" "t07_3 0.7"; do
  set -- $spec
  [ -f STOP ] && exit 0
  d=$(fresh adk_task_$1); (cd $d && ../../../adkenv/bin/python ../../adk_demo.py 8292 task $1 $2 $OUT > ../adk_task_$1.out 2>&1); check adk_task_$1
done
[ -f STOP ] && exit 0
d=$(fresh adk_transfer_greedy); (cd $d && ../../../adkenv/bin/python ../../adk_demo.py 8292 transfer greedy 0.0 $OUT > ../adk_transfer_greedy.out 2>&1); check adk_transfer_greedy
for spec in "greedy 0.0" "t07_1 0.7"; do
  set -- $spec
  [ -f STOP ] && exit 0
  d=$(fresh oai_handoff_$1); (cd $d && ../../../env/bin/python ../../oai_demo.py 8292 handoff $1 $2 $OUT > ../oai_handoff_$1.out 2>&1); check oai_handoff_$1
done
for w in guard_par guard_seq session tracing; do
  [ -f STOP ] && exit 0
  d=$(fresh oai_$w); (cd $d && ../../../env/bin/python ../../oai_demo.py 8292 $w greedy 0.0 $OUT > ../oai_$w.out 2>&1); check oai_$w
done
echo DEMODONE
