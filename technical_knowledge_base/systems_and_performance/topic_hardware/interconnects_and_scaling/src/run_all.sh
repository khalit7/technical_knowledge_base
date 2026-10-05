#!/bin/sh
# Reproduce every measured and derived number on this page.
# 1. Collectives measured on this laptop (N CPU processes, torch.distributed Gloo over loopback TCP):
#    three runs of meas/coll_bench.py, 20 s apart. Needs a Python with torch (any recent CPU build), outside the repo, e.g.
#      TORCHPY="uv run --no-project --python 3.12 --with torch==2.14.1 python" sh run_all.sh
#    SKIP_MEASURE=1 skips this step and reuses meas/out/.
# 2. recompute.py (stdlib only): the alpha-beta model, the step-by-step collective simulator, the fabric loads,
#    the parallelism ratios, fits to the measurements; writes out/expected.json and parts/22_js_ic_data.js.
# 3. build.sh, then check_embed.py: the page embeds exactly these outputs and the prose numbers match.
set -e
cd "$(dirname "$0")"
PY=${TORCHPY:-python3}
if [ "${SKIP_MEASURE:-0}" != 1 ]; then
  for i in 1 2 3; do
    uptime | sed 's/.*load/load/' > meas/out/load_$i.txt
    $PY meas/coll_bench.py meas/out/run_$i.json 2>/dev/null | grep "^done" > meas/out/run_$i.log
    uptime | sed 's/.*load/load/' >> meas/out/load_$i.txt
    sleep 20
  done
fi
python3 -B recompute.py
sh build.sh
python3 -B check_embed.py
