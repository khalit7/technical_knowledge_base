#!/bin/sh
# Pending runs for the data mixing page (prefix mx2). Run from this folder on the GPU queue, holding the bench lock.
# Needs: DC_SCRATCH=<scratch>/dc (the topic's shared scratch), the shared venv at $DC_SCRATCH/venv.
# Time estimates: CPU throughput was measured (rough, shared machine, 4 threads at low priority): about 6,400 tokens/s
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

# 3. RegMix-style sweep: 48 mixtures x 2,000 steps x 32 x 256 = 16.4M tokens each, 786M in total.
#    Estimate: 1.7 to 3.4 h on MPS (CPU would be about 34 h).
$PY proxy_mix.py sweep --device $DEV --n_runs 48 --steps 2000 --bs 32 --ctx 256 --sweep_seed 0
#    plus four fixed mixtures as anchors (natural, uniform, temperature 2, the fitted best is step 5)
$PY - <<'EOF'
import json, os, numpy as np
w = os.environ['MX2_WORK']; names = list(json.load(open(f'{w}/domains.json'))); st = json.load(open(f'{w}/tok/stats.json'))
p = np.array([st[n]['train'] for n in names], float); p /= p.sum()
for tag, v in [('natural', p), ('uniform', np.ones(len(p)) / len(p)), ('temp2', p ** 0.5 / (p ** 0.5).sum())]:
    json.dump(dict(zip(names, v.tolist())), open(f'{w}/mix_{tag}.json', 'w'))
EOF
for t in natural uniform temp2; do $PY proxy_mix.py train --device $DEV --weights "$MX2_WORK/mix_$t.json" --tag anchor_$t --steps 2000 --bs 32; done

# 4. DoReMi (Algorithm 1): reference on natural shares, Group DRO proxy, 2,000 steps each. Estimate 0.1 to 0.2 h on MPS.
$PY proxy_mix.py doremi --device $DEV --ref_weights "$MX2_WORK/mix_natural.json" --steps 2000 --bs 30 --seed 0

# 5. Fit and pick (CPU, seconds), then the rank check: two larger models (width 384, 6 layers, 10.6M non-embedding)
#    on 100M tokens each, natural shares against the predicted best. Estimate 2 to 3.5 h on MPS.
$PY collect_runs.py --fit
for t in natural best; do $PY proxy_mix.py train --device $DEV --weights "$MX2_WORK/mix_$t.json" --tag rank_$t --d 384 --layers 6 --heads 6 --steps 12000 --bs 32 --lr 1e-3; done
$PY collect_runs.py
# Total estimate: about 4 to 7 hours on the GPU queue. Then rebuild the page: sh ../build.sh
