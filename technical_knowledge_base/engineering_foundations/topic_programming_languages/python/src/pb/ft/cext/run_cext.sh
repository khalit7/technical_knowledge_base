#!/bin/bash
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../../env.sh
B=$WORK/cext; rm -rf $B; mkdir -p $B; cp $HERE/*.c $HERE/setup.py $HERE/check.py $B/; cd $B
uv run --no-project --python 3.14t --with setuptools==80.9.0 python setup.py -q build_ext --inplace > build.log 2>&1 || cat build.log
{ echo '$ python3.14t -u check.py'; uv run --no-project --python 3.14t python -u check.py 2>&1; echo "[exit $?]"; echo; echo '$ python3.14t -u -X gil=0 check.py'; uv run --no-project --python 3.14t python -u -X gil=0 check.py 2>&1; echo "[exit $?]"; } | sed -e "s#$B/##g" -e "s#$PL#~/pl#g" > $HERE/../../out/cext.txt
cat $HERE/../../out/cext.txt
