#!/bin/sh
# Capacity planner (tab t-plan): rebuild every number from the inputs, then check.
# python3 (no packages) and node; the M1 fit reads its snapshot inputs/m1_bench_src.json unless given the bench tab's results folder.
set -e
cd "$(dirname "$0")"
python3 calibrate.py      # fits the GPU engine constants to MLPerf v5.1 (a few minutes): out/calib.json
python3 validate.py       # seed spread of the simulation: out/validate.json
python3 m1_fit.py         # M1 Pro constants from the Engine bench measurements: inputs/m1_bench.json
python3 gen_data.py       # parts/33_js_plan_0data.js and out/plan_ref.json
node check_plan.mjs       # the page's JavaScript against the Python reference
python3 check_embed.py    # embedded data and prose numbers
sh ../build.sh
