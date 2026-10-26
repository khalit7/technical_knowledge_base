#!/bin/bash
# Reproduce every runtime output this page displays (free-threading, subinterpreters, C extension, orjson, wheel survey),
# then regenerate ../parts/22_js_cg_0pb.js and rebuild. Copied from the language page's src/pb/run_all.sh (2026-10-26), trimmed.
# Needs the scratch toolchain described in env.sh (uv with CPython 3.14.8, 3.14.8t, 3.15.0rc3, 3.15.0rc3t), network (PyPI)
# and a few minutes. Timings depend on load.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/env.sh; cd $HERE
# the topic root holds the shared data generator: walk up to it (this folder's depth changed when the page was split)
ROOT=$HERE; while [ "$(basename "$ROOT")" != topic_programming_languages ] && [ "$ROOT" != / ]; do ROOT=$(dirname "$ROOT"); done
G=$ROOT/src/rosetta/data/gen_chat.py                     # the root page's data generator (read-only)
[ -f $G ] || { echo "cannot find $G"; exit 1; }
[ -f $WORK/chat100k.jsonl ] || $PY314 $G --lines 100000 --seed 7 > $WORK/chat100k.jsonl
bash ft/cext/run_cext.sh                                 # -> out/cext.txt
bash interp/run_interp.sh mistake                        # -> out/interp_mistake.txt, out/interp_numpy.txt
(cd pack && python3 wheels.py)                           # -> out/wheels.json
# measurements: run one at a time
for p in PY314 PY314T PY315 PY315T; do eval I=\$$p; $I ft/ft_bench.py $WORK/chat100k.jsonl out/ft_$p.json; done
for p in PY314 PY315; do eval I=\$$p; (cd interp && PYTHONPATH=$HERE/ft $I interp_bench.py $WORK/chat100k.jsonl ../out/interp_$p.json); done
bash pack/orjson_ft.sh
python3 build_data.py
sh ../build.sh
python3 check_embed.py
