#!/bin/sh
# Train every toy model one after another (2 threads each), then evaluate. Logs: model/train_stdout_<name>.txt
cd "$(dirname "$0")"
export OMP_NUM_THREADS=2 AE_STEPS=${AE_STEPS:-2500} DM_STEPS=${DM_STEPS:-8000}
R="uv run --with torch --with numpy python"
for f in ${AES:-4 8 16 2}; do [ -f model/ae$f.pt ] || $R train.py ae $f > model/train_stdout_ae$f.txt 2>&1; done
for d in ${DMS:-f4 pix f8 f2 f16}; do [ -f model/dm_${d}_done ] || { $R train.py dm $d > model/train_stdout_dm_$d.txt 2>&1 && touch model/dm_${d}_done; }; done
echo ALL DONE > model/run_all_done.txt
