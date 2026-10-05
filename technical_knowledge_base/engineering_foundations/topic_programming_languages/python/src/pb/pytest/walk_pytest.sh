#!/bin/bash
# pytest 9 essentials on a tiny project. Real runs.
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/../env.sh; . $HERE/../uvwalk/rec.sh
P=$WORK/pytestdemo; rm -rf $P; cp -R $HERE/proj $P; cd $P
export TRANSCRIPT=$WORK/pytest_raw.txt; : > $TRANSCRIPT
uv sync -q
rec "uv run pytest tests/test_tokens.py"
rec "uv run pytest tests/test_fails.py"
rec "uv run pytest -k 'per_user or bad_json' --co"
rec "uv run --with pytest-xdist==3.8.0 pytest tests/test_tokens.py -n 4 2>&1 | tail -2"
sed -e "s#$WORK/pytestdemo#~/demo/tokcount#g" -e "s#$PL#~/pl#g" -e "s#$HOME#~#g" $TRANSCRIPT > $HERE/../out/pytest.txt
