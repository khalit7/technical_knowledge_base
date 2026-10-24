#!/bin/sh
# Rerun every measurement on this page, then rebuild the page data.
# Usage: WORK=<scratch dir> sh run_all.sh
#   WORK holds the venv (pyjwt 2.15.1, cryptography, mcp 2.3.0), the keys and the raw wire log; nothing secret enters src/.
# Setup once: UV_PYTHON_INSTALL_BIN=0 uv venv --python 3.13 $WORK/.venv && uv pip install --python $WORK/.venv/bin/python pyjwt==2.15.1 cryptography mcp==2.3.0
set -e
cd "$(dirname "$0")"
: "${WORK:?set WORK to a scratch directory}"
export KEYDIR=$WORK/keys PY=$WORK/.venv/bin/python
mkdir -p lab/out
python3 lab/fetch_inputs.py
python3 lab/small_calcs.py lab/out/small.json
(cd lab && $PY jwt_cases.py out/jwt.json)
rm -rf "$KEYDIR"
sh lab/start.sh "$WORK/wire.jsonl"
trap 'sh lab/stop.sh' EXIT
(cd lab && $PY run_sdk_flow.py "$WORK/wire.jsonl" out/sdk_flow.json)
(cd lab && $PY run_flows.py "$WORK/wire.jsonl" out/flows.json)
sh lab/stop.sh; trap - EXIT
python3 make_data.py "$WORK/wire.jsonl"
sh build.sh
