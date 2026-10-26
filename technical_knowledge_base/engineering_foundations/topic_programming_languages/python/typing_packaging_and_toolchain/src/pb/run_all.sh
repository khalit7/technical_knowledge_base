#!/bin/bash
# Reproduce every toolchain output this page displays, then regenerate ../parts/22_js_rd_0data.js.
# Copied from the Python essentials page's src/pb/run_all.sh and trimmed to the toolchain runs (uv, ruff, pytest,
# type checkers, wheels, install speed). Needs the scratch toolchain in env.sh (uv 0.12.23, CPython 3.14.8,
# hyperfine 1.20.0), network access (PyPI), and about 5 minutes. Timings depend on load.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); . $HERE/env.sh; cd $HERE
bash uvwalk/walk_uv.sh                                   # -> out/uv.txt
bash ruff/walk_ruff.sh                                   # -> out/ruff.txt
bash pytest/walk_pytest.sh                               # -> out/pytest.txt
bash types/run_checkers.sh                               # -> out/types.json
(cd pack && python3 wheels.py)                           # -> out/wheels.json
bash types/speed.sh                                      # -> out/typespeed.json
bash pack/install_speed.sh                               # -> out/install_speed.json
python3 build_data.py
sh ../build.sh
python3 check_embed.py
