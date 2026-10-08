"""Calibrate the step-time model on NVIDIA's published NIM table (vendor), then
predict every other row of that table with no further fitting.
Fit 1: em and ovh from the 5 concurrency-1 ITL rows (linear least squares,
  ITL = ovh + (W + kvtok * mean context) / (bw * em)).
Fit 2: ec and api from the 5 concurrency-1 TTFT rows (grid over ec, api solved).
Fit 3: ovs (per-sequence step overhead) from the 200/200 rows at concurrency 5 to 250 (ITL).
Fit 4: KV capacity (tokens) from the 20000/2000 rows at concurrency 5 to 250 (TTFT).
Predict: the 21 rows of the other three length profiles (500/2000, 1000/1000, 5000/500) at concurrency 5 to 250, closed loop, as genai-perf runs them.
Writes out/calib_h100.json."""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sim
from presets import MODELS

T = json.load(open(os.path.join(HERE, 'inputs', 'nim_llama31_8b_h100.json')))
M = MODELS['l8_fp8']
PEAK, BW, MEM = 1979e12, 3.35e12, 80e9  # H100 SXM FP8 dense, HBM3 (https://www.nvidia.com/en-us/data-center/h100/)


def lsq(xs, ys):
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs); sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    b = sxy / sxx
    return my - b * mx, b


c1 = [r for r in T['rows'] if r[2] == 1]
xs = [M['wbytes'] + M['kvtok'] * (r[0] + r[1] / 2.0) for r in c1]
ys = [r[4] / 1e3 for r in c1]
ovh, a = lsq(xs, ys)
em = 1.0 / (a * BW)
# KV capacity: 0.9 of memory left after weights (TensorRT-LLM's default kv_cache_free_gpu_mem_fraction),
# less an assumed 2 GB for activations and runtime (assumption, labelled)
kvbytes = 0.9 * (MEM - M['wbytes'] - 2e9)
BS = 16
nblocks = int(kvbytes // (M['kvtok'] * BS))
# Engine: TensorRT-LLM v1.2.1 defaults (llmapi/llm_args.py): capacity_scheduler_policy
# GUARANTEED_NO_EVICT (line 1468), enable_chunked_prefill False (line 2006),
# free_gpu_memory_fraction 0.9 (line 1650). NIM's own profile settings are not published
# on the benchmark page: max tokens per step 8192 (or the prompt if longer) and 256
# sequences are assumptions.
ADMIT = os.environ.get('ADMIT', 'reserve')
SKIP = os.environ.get('SKIP', '1') == '1'
ENG = {'mode': 'cont', 'kv': 'paged', 'bs': BS, 'nblocks': nblocks, 'pc': False,
       'chunk': ADMIT != 'reserve', 'budget': 8192, 'maxseq': 256, 'preempt': 'recompute',
       'swapbw': 25e9, 'admit': ADMIT}


def simrow(r, hw, api, nreq=None, eng=None):
    isl, osl, C = r[0], r[1], r[2]
    n = nreq or max(4 * C, 8)
    w = {'n': n, 'rate': 0, 'plo': isl, 'phi': isl, 'olo': osl, 'ohi': osl, 'maxtok': osl, 'sys': 0,
         'share': 0, 'groups': 1, 'turns': 1, 'gap': 0, 'seed': 7, 'closed': C}
    e = dict(eng or ENG)
    e['budget'] = max(e['budget'], isl)
    reqs, engs, _ = sim.run({'w': w, 'hw': hw, 'm': M, 'c': e, 'api': api, 'slo': [1, 1]})
    mt = sim.metrics(reqs, engs, [1, 1], skip=C if (SKIP and not nreq) else 0)
    # genai-perf reports means; throughput = output tokens / benchmark duration
    return mt['ttft'][3] * 1e3, mt['itl'][3] * 1e3, mt['tps']


best = None
for k in range(30, 91):
    ec = k / 100.0
    hw = {'peak': PEAK, 'bw': BW, 'ec': ec, 'em': em, 'ovh': ovh, 'ovs': 0.0}
    pre = [simrow(r, hw, 0.0, 4)[0] / 1e3 for r in c1]
    api = sum(r[3] / 1e3 - p for r, p in zip(c1, pre)) / len(c1)
    if api < 0:
        api = 0.0
    err = sum(((p + api) / (r[3] / 1e3) - 1) ** 2 for r, p in zip(c1, pre))
    if best is None or err < best[0]:
        best = (err, ec, api)
_, ec, api = best
fitrows = [r for r in T['rows'] if r[0] == 200 and r[2] > 1]
bo = None
for k in range(0, 61, 2):
    ovs = k * 1e-6
    hw = {'peak': PEAK, 'bw': BW, 'ec': ec, 'em': em, 'ovh': ovh, 'ovs': ovs}
    err = sum((simrow(r, hw, api)[1] / r[4] - 1) ** 2 for r in fitrows)
    if bo is None or err < bo[0]:
        bo = (err, ovs)
hw = {'peak': PEAK, 'bw': BW, 'ec': ec, 'em': em, 'ovh': ovh, 'ovs': bo[1]}
# Fit 4: KV capacity from the 20000/2000 rows, where TTFT explodes once the cache is full
capf = []
for ktok in range(300, 1001, 50):
    e2 = dict(ENG); e2['nblocks'] = ktok * 1000 // BS
    err = sum((simrow(r, hw, api, None, e2)[0] / r[3] - 1) ** 2 for r in T['rows'] if r[0] == 20000 and r[2] > 1)
    capf.append((err, ktok))
capf.sort()
ENG['nblocks'] = capf[0][1] * 1000 // BS
nblocks = ENG['nblocks']
print('fit: em %.3f ovh %.3f ms ec %.2f api %.2f ms ovs %.0f us nblocks %d (%.0f tokens)' % (em, ovh * 1e3, ec, api * 1e3, hw['ovs'] * 1e6, nblocks, nblocks * BS))
rows = []
for r in T['rows']:
    t0 = time.time()
    tt, it, tp = simrow(r, hw, api)
    rows.append({'isl': r[0], 'osl': r[1], 'C': r[2], 'pub': [r[3], r[4], r[5]], 'sim': [round(tt, 2), round(it, 3), round(tp, 1)], 'fit': r[2] == 1 or r[0] == 200 or r[0] == 20000})
    print(r[0], r[1], r[2], 'TTFT %.1f/%.1f ITL %.2f/%.2f tps %.0f/%.0f  (%.1fs)' % (tt, r[3], it, r[4], tp, r[5], time.time() - t0), flush=True)
json.dump({'admit': ADMIT, 'skip_first_wave': SKIP, 'source': T['source'], 'fetched': T['fetched'], 'label': T['label'], 'hw': hw, 'api': api, 'eng': ENG,
           'kv_gb_mem': kvbytes / 1e9, 'kv_tokens_fit': nblocks * BS, 'kv_fit_err': capf[:5], 'model': 'l8_fp8', 'rows': rows}, open(os.path.join(HERE, 'out', 'calib_h100_%s_%d.json' % (ADMIT, SKIP)), 'w'), indent=1)
