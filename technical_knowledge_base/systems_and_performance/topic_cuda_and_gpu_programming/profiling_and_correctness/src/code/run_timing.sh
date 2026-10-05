#!/bin/sh
# Three runs of the M1 Pro GPU timing experiments (torch MPS), plus three fresh processes per run
# for warm-up. Needs uv; installs torch and numpy into uv's cache, never into the repo.
cd "$(dirname "$0")/.."
UVR="uv run --no-project --with torch==2.14.1 --with numpy python"
for r in 1 2 3; do
  $UVR code/measure_timing.py out/timing_run_$r.json > out/timing_run_$r.log 2>&1
  : > out/warmup_run_$r.jsonl
  for p in 1 2 3; do $UVR code/measure_warmup.py >> out/warmup_run_$r.jsonl 2>/dev/null; done
done

