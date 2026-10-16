#!/bin/sh
# Pending runs for the data mixing page (prefix mx2). Run from this folder on the GPU queue, holding the bench lock.
# Needs: DC_SCRATCH=<scratch>/dc (the topic's shared scratch), the shared venv at $DC_SCRATCH/venv.
# Status: steps 1 to 4 run on 2026-10-16 (see data/proxy_runs.json). Original time estimates: CPU throughput was measured (rough, shared machine, 4 threads at low priority): about 6,400 tokens/s
# for the 0.79M-non-embedding proxy. GPU (MPS) speed is NOT measured here; the estimates assume 10 to 20 times the CPU
# figure for the proxy. Re-time the first run and correct this header.
set -e
: "${DC_SCRATCH:?set DC_SCRATCH}"
export MX2_WORK="$DC_SCRATCH/mix2/exp" HF_HOME="$DC_SCRATCH/hf" OMP_NUM_THREADS=4
PY="$DC_SCRATCH/venv/bin/python"; DEV=${DEV:-mps}
mkdir -p "$MX2_WORK"

# 0. CPU smoke test (done 2026-10-14 on the page's own samples; see data/smoke.json):
#    MX2_WORK=$DC_SCRATCH/mix2/smoke $PY proxy_mix.py prep --tokenizer $DC_SCRATCH/data/pc/tok/gpt2.json
#    MX2_WORK=$DC_SCRATCH/mix2/smoke $PY proxy_mix.py train --weights uniform.json --tag smoke_uniform --steps 60 --bs 16 --eval_batches 2 --warmup 5

# 1. Pools: about 25M GPT-2 tokens per domain, streamed (network, CPU; 10 to 20 min; about 0.5 GB on disk). Download lock.
sh "$DC_SCRATCH/../inf/lock.sh" acquire download mx2
$PY fetch_pools.py --tokens 25e6
sh "$DC_SCRATCH/../inf/lock.sh" release download mx2

# 2. Tokenize (CPU, about 3 min).
$PY proxy_mix.py prep --tokenizer "$DC_SCRATCH/data/pc/tok/gpt2.json"

# 3. Natural-share mixture for the DoReMi reference (seconds). The RegMix-style sweep and anchors were dropped
#    (Khalid, 2026-10-15: skip expensive runs that teach little); the page uses RegMix's released runs instead.
$PY - <<'EOF'
import json, os, numpy as np
w = os.environ['MX2_WORK']; names = list(json.load(open(f'{w}/domains.json'))); st = json.load(open(f'{w}/tok/stats.json'))
p = np.array([st[n]['train'] for n in names], float); p /= p.sum()
json.dump(dict(zip(names, p.tolist())), open(f'{w}/mix_natural.json', 'w'))
EOF

# 4. DoReMi (Algorithm 1): reference on the pools' natural shares, Group DRO proxy, 4,000 steps each (ran 2026-10-16 on MPS, see the log timing in data/proxy_runs.json). Bench lock.
$PY proxy_mix.py doremi --device $DEV --ref_weights "$MX2_WORK/mix_natural.json" --steps 4000 --bs 30 --seed 0 --eval_batches 16

# 5. Collect into ../data/proxy_runs.json (CPU, seconds); the rank check was dropped with the sweep.
$PY collect_runs.py
# Then rebuild the page: sh ../build.sh
