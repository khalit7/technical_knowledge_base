"""Calibrate the step-time model for Apple M1 Pro (llama.cpp, Metal) on measurements
made on this machine by the Engine bench tab (inputs/m1/ibench_m1.json), then
predict llama-server's closed-loop TTFT and TPOT at 1 to 16 concurrent clients.
Model: Qwen3-0.6B Q4_K_M (weights = GGUF file size), KV cache F16.
Fit 1: em from the KV slope of llama-bench decode against depth (flash attention on).
Fit 2: ovh from decode at depth 0; ec from prefill of 512 tokens.
Fit 3: ovs, the per-sequence step cost, from llama-server TPOT at 2 to 16 clients.
Check: prefill at 16 to 4096 tokens, decode at depth 1024 to 16384, and the server runs."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sim
from presets import model

D = json.load(open(os.path.join(HERE, 'inputs', 'm1', 'ibench_m1.json')))
PEAK, BW = 5.308e12, 200e9  # M1 Pro GPU: 5,308 GFLOPS FP32/FP16 (philipturner/metal-benchmarks), 200 GB/s (Apple)
q4 = [r for r in D['lb_0.6b_ppsweep']['rows'] if 'Q4_K_M' in r['model']]
M = model('cfg_Qwen_Qwen3-0.6B.json', 'Qwen3-0.6B, Q4_K_M weights, F16 KV', 1, 2)
M['wbytes'] = q4[0]['size']
tg = [r for r in D['lb_0.6b_tgdepth']['rows'] if r['flash_attn'] in (1, True)]


def lsq(xs, ys):
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return my - b * mx, b


# decode step at depth d generates 32 tokens: mean context d + 16
xs = [M['kvtok'] * (r['n_depth'] + 16) for r in tg]
ys = [1.0 / r['avg_ts'] for r in tg]
a, b = lsq(xs, ys)
em = 1.0 / (b * BW)
d0 = [r for r in tg if r['n_depth'] == 0][0]
ovh = 1.0 / d0['avg_ts'] - (M['wbytes'] + M['kvtok'] * 16) / (BW * em)
hw = {'peak': PEAK, 'bw': BW, 'em': em, 'ovh': ovh, 'ovs': 0.0, 'ec': 1.0}
p512 = [r for r in q4 if r['n_prompt'] == 512][0]
t512 = 512 / p512['avg_ts']
# solve ec so that one 512-token prefill step takes t512
lo, hi = 0.05, 1.5
for _ in range(60):
    mid = (lo + hi) / 2
    hw['ec'] = mid
    if sim.step_time(hw, M, [(0, 512)]) > t512:
        lo = mid
    else:
        hi = mid
hw['ec'] = (lo + hi) / 2
print('fit: em %.3f ovh %.2f ms ec %.3f' % (em, ovh * 1e3, hw['ec']))
pp = [{'n': r['n_prompt'], 'meas': r['avg_ts'], 'sd': r['stddev_ts'],
       'sim': r['n_prompt'] / sim.step_time(hw, M, [(0, r['n_prompt'])]), 'fit': r['n_prompt'] == 512} for r in q4]
tgr = [{'d': r['n_depth'], 'meas': r['avg_ts'], 'sd': r['stddev_ts'],
        'sim': 1.0 / sim.step_time(hw, M, [(r['n_depth'] + 16, 1)]), 'fit': True} for r in tg]
for x in pp:
    print('pp %5d meas %7.0f sim %7.0f' % (x['n'], x['meas'], x['sim']))
for x in tgr:
    print('tg d%5d meas %6.1f sim %6.1f' % (x['d'], x['meas'], x['sim']))
# llama-server: 16 slots, continuous batching, prompts up to n_batch 2048 per step
ENG = {'mode': 'cont', 'kv': 'contig', 'bs': 16, 'nblocks': 2048, 'pc': False, 'chunk': True,
       'budget': 2048, 'maxseq': 16, 'preempt': 'recompute', 'swapbw': 25e9}
def serve(run, hw):
    C = run['conc']; P = int(round(run['in_tok_per_req']))
    w = {'n': run['n'] + C, 'rate': 0, 'plo': P, 'phi': P, 'olo': run['max_tokens'], 'ohi': run['max_tokens'],
         'maxtok': run['max_tokens'], 'sys': 0, 'share': 0, 'groups': 1, 'turns': 1, 'gap': 0, 'seed': 3, 'closed': C}
    reqs, engs, _ = sim.run({'w': w, 'hw': hw, 'm': M, 'c': ENG, 'slo': [1, 1]})
    return sim.metrics(reqs, engs, [1, 1], skip=C)


# Fit 3: llama.cpp's extra decode cost per sequence in the batch (ovs), from the server runs at 2 to 16 clients (TPOT)
best = None
for k in range(0, 81):
    h2 = dict(hw); h2['ovs'] = k * 1e-4; h2['ovh'] = ovh - h2['ovs']  # keep the one-sequence step unchanged
    err = sum((serve(r, h2)['tpot'][3] / r['tpot_mean'] - 1) ** 2 for r in D['llama_server_closed']['runs'] if r['conc'] > 1)
    if best is None or err < best[0]:
        best = (err, h2['ovs'])
hw['ovs'] = best[1]
hw['ovh'] = ovh - best[1]
print('fit: ovs %.2f ms per sequence' % (hw['ovs'] * 1e3))
srv = []
for run in D['llama_server_closed']['runs']:
    C = run['conc']; P = int(round(run['in_tok_per_req']))
    w = {'n': run['n'] + C, 'rate': 0, 'plo': P, 'phi': P, 'olo': run['max_tokens'], 'ohi': run['max_tokens'],
         'maxtok': run['max_tokens'], 'sys': 0, 'share': 0, 'groups': 1, 'turns': 1, 'gap': 0, 'seed': 3, 'closed': C}
    reqs, engs, _ = sim.run({'w': w, 'hw': hw, 'm': M, 'c': ENG, 'slo': [1, 1]})
    mt = sim.metrics(reqs, engs, [1, 1], skip=C)
    srv.append({'label': run['label'], 'C': C, 'meas': [run['ttft_mean'], run['tpot_mean'], run['out_tok_per_s']],
                'sim': [mt['ttft'][3], mt['tpot'][3], mt['tps']], 'load': (run.get('load_before') or {}).get('loadavg')})
    print('%s C=%2d TTFT %.0f/%.0f ms TPOT %.2f/%.2f ms tps %.0f/%.0f' % (run['label'], C, mt['ttft'][3] * 1e3, run['ttft_mean'] * 1e3, mt['tpot'][3] * 1e3, run['tpot_mean'] * 1e3, mt['tps'], run['out_tok_per_s']))
json.dump({'hw': hw, 'model': M, 'eng': ENG, 'pp': pp, 'tg': tgr, 'server': srv}, open(os.path.join(HERE, 'out', 'calib_m1.json'), 'w'), indent=1)
