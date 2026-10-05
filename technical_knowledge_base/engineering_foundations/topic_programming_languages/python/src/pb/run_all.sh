#!/bin/bash
# Reproduce every output Part 2 (Python in 2026) displays, then regenerate ../parts/40_js_pb_data.js.
# Needs the scratch toolchain described in env.sh (uv 0.12.23 with CPython 3.11.17, 3.12.15, 3.13.16, 3.14.8, 3.14.8t,
# 3.15.0rc3, 3.15.0rc3t; hyperfine 1.20.0), network access (PyPI), and about 15 minutes. Timings depend on load.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/env.sh; cd $HERE
G=$HERE/../../../src/rosetta/data/gen_chat.py            # the root page's data generator
[ -f $WORK/chat100k.jsonl ] || $PY314 $G --lines 100000 --seed 7 > $WORK/chat100k.jsonl
[ -f $WORK/chat40k.jsonl ] || $PY314 $G --lines 40000 --seed 7 > $WORK/chat40k.jsonl
python3 versions/run_versions.py                         # 21 snippets x 5 versions -> out/versions.json
bash uvwalk/walk_uv.sh                                   # -> out/uv.txt
bash ruff/walk_ruff.sh                                   # -> out/ruff.txt
bash pytest/walk_pytest.sh                               # -> out/pytest.txt
bash types/run_checkers.sh                               # -> out/types.json
bash ft/cext/run_cext.sh                                 # -> out/cext.txt
bash interp/run_interp.sh mistake                        # -> out/interp_mistake.txt, out/interp_numpy.txt
(cd pack && python3 wheels.py)                           # -> out/wheels.json
# measurements: run one at a time
for p in PY314 PY314T PY315 PY315T; do eval I=\$$p; $I ft/ft_bench.py $WORK/chat100k.jsonl out/ft_$p.json; done
(cd jit && python3 jit_run.py $WORK/chat40k.jsonl)       # -> out/jit.json
for p in PY314 PY315; do eval I=\$$p; (cd interp && PYTHONPATH=$HERE/ft $I interp_bench.py $WORK/chat100k.jsonl ../out/interp_$p.json); done
bash lazy/run_lazy.sh                                    # -> out/lazy.json
bash types/speed.sh                                      # -> out/typespeed.json
bash pack/install_speed.sh                               # -> out/install_speed.json
python3 build_data.py
bash pack/orjson_ft.sh
sh ../build.sh
python3 check_embed.py
