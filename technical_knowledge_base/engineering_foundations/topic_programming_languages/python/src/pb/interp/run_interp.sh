#!/bin/bash
# 1. the sys.path mistake (real error), 2. threads vs processes vs subinterpreters on 3.14 and 3.15.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh; cd $HERE
{ echo '$ python3.14 -u mistake.py'; $PY314 -u mistake.py > $WORK/m.txt 2>&1; rc=$?; grep -E "can import|^Exception:|^concurrent.interpreters" $WORK/m.txt; echo "[exit $rc]"; echo
  echo '$ PYTHONPATH=../ft python3.14 -u mistake.py'; PYTHONPATH=../ft $PY314 -u mistake.py 2>&1; echo "[exit $?]"; } | sed -e "s#$PL#~/pl#g" > ../out/interp_mistake.txt
cat ../out/interp_mistake.txt
{ echo '$ uv run --python 3.14 --with numpy==2.5.3 python numpy_in_sub.py'; uv run -q --no-project --python $PY314 --with numpy==2.5.3 python numpy_in_sub.py 2>&1; echo "[exit $?]"; } > ../out/interp_numpy.txt; cat ../out/interp_numpy.txt
[ "$1" = mistake ] && exit 0
for p in PY314 PY315; do eval I=\$$p; PYTHONPATH=$HERE/../ft $I interp_bench.py $WORK/chat100k.jsonl ../out/interp_$p.json; done
