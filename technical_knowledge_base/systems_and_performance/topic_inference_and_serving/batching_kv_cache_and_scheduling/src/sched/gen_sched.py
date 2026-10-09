"""Every Scheduling lab result (t-sch), computed with bksched.py (the root simulator plus policies); writes
out/sched.json. Presets: hardware efficiencies fitted by the root page's Serving simulator (src/sim/out/*.json:
H100 fitted on NVIDIA NIM measurements, vendor; M1 Pro fitted on llama.cpp runs made on this machine), model
shapes from config.json files. usage: python3 -I gen_sched.py [measured chunk summary json]"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bksched as S
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'src', 'sim'))
sys.path.insert(0, ROOT)
from presets import MODELS


def model_from(cfgfile, name, wbytes, kvb):
    """The root presets.model() formula, for a config.json kept in this page's inputs/."""
    c = json.load(open(cfgfile))
    h, ff, L = c['hidden_size'], c['intermediate_size'], c['num_hidden_layers']
    nq, nkv = c['num_attention_heads'], c['num_key_value_heads']
    hd = c.get('head_dim') or h // nq
    V = c['vocab_size']
    tied = c.get('tie_word_embeddings', False)
    layer = h * nq * hd + 2 * h * nkv * hd + nq * hd * h + 3 * h * ff
    norms = L * 2 * h + h + L * 2 * hd
    P = L * layer + V * h * (1 if tied else 2) + norms
    return {'name': name, 'L': L, 'nq': nq, 'nkv': nkv, 'hd': hd, 'P': P, 'Pact': L * layer + V * h, 'Plm': V * h,
            'wbytes': wbytes, 'kvtok': 2 * L * nkv * hd * kvb, 'wb': wbytes / P, 'kvb': kvb}


H = json.load(open(os.path.join(ROOT, 'out', 'calib_h100_optimistic_0.json')))['hw']
M1 = json.load(open(os.path.join(ROOT, 'out', 'calib_m1.json')))['hw']
HW = {'h100_bf16': dict(H, peak=989.5e12), 'h100_fp8': dict(H, peak=1979e12), 'm1': dict(M1)}
# Qwen3-1.7B Q4_K_M as measured here: weights = the GGUF file (unsloth @ d7f544ee, 1,107,409,472 bytes), F16 KV
MOD = {'l8_bf16': MODELS['l8_bf16'], 'l8_fp8': MODELS['l8_fp8'],
       'q17_q4': model_from(os.path.join(HERE, '..', 'inputs', 'cfg_Qwen_Qwen3-1.7B.json'), 'Qwen3-1.7B, Q4_K_M, F16 KV', 1107409472, 2)}
ENG = {'mode': 'cont', 'kv': 'paged', 'bs': 16, 'nblocks': 59375, 'pc': False, 'chunk': True, 'budget': 8192,
       'maxseq': 256, 'preempt': 'recompute', 'swapbw': 25e9, 'admit': 'optimistic', 'policy': 'fcfs'}
r4 = lambda x: float('%.4g' % x)


def run(cfg, keep=False):
    reqs, engs, log = S.run(json.loads(json.dumps(cfg)), keep_log=keep)
    return reqs, engs, log, S.metrics(reqs, engs, cfg['slo'])


def gaps(q):
    t = q['times']
    return [b - a for a, b in zip(t, t[1:])]


out = {'hw': {k: {kk: r4(vv) for kk, vv in v.items()} for k, v in HW.items()}, 'models': MOD}

# ---- 1. chunked prefill: the per-step token budget -------------------------------------------------------------
BUD = [128, 256, 512, 1024, 2048, 4096, 8192, 16384]


def stall_case(hwk, mk, dec, long, budgets, nblocks, maxseq, long_at):
    rows = []
    for b in budgets + [0]:
        reqs = [{'id': i, 'arr': 0.0, 'P': dec[0], 'O': dec[1], 'M': dec[1], 'g': -1, 'S': 0, 'conv': i, 'turn': 0}
                for i in range(dec[2])]
        reqs.append({'id': dec[2], 'arr': long_at, 'P': long[0], 'O': long[1], 'M': long[1], 'g': -1, 'S': 0, 'conv': 99, 'turn': 0})
        c = dict(ENG, nblocks=nblocks, maxseq=maxseq, budget=b if b else max(long[0] + dec[2], 16384), chunk=bool(b))
        rq, engs, log, mt = run({'reqs': reqs, 'w': {}, 'hw': HW[hwk], 'm': MOD[mk], 'c': c, 'slo': [2, 0.1]})
        L = [q for q in rq if q['P'] == long[0]][0]
        ttft = L['first'] - L['arr']
        g_in, g_all = [], []
        for q in rq:
            if q is L:
                continue
            t = q['times']
            for a, bb in zip(t, t[1:]):
                g_all.append(bb - a)
                if bb > L['arr'] and a < L['first']:
                    g_in.append(bb - a)
        rows.append({'budget': b, 'long_ttft': r4(ttft), 'max_gap': r4(max(g_in) if g_in else 0),
                     'mean_gap_during': r4(sum(g_in) / len(g_in) if g_in else 0), 'p50_gap': r4(S.pct(g_all, 50)),
                     'p99_gap': r4(S.pct(g_all, 99)), 'span': r4(mt['span']), 'steps': mt['steps']})
    return rows


out['chunk_h100'] = {'desc': 'Llama 3.1 8B BF16 on one H100 (simulated): 8 users decoding (500-token prompts, 400 tokens out) when a 12,000-token prompt arrives at 0.2 s',
                     'rows': stall_case('h100_bf16', 'l8_bf16', (500, 400, 8), (12000, 20), BUD, 2000, 256, 0.2)}
LONG_AT = float(os.environ.get('M1_LONG_AT', '0.62'))
out['chunk_m1'] = {'desc': 'Qwen3-1.7B Q4_K_M on the M1 Pro preset (simulated), the measured experiment: 4 users decoding (163-token prompts, 500 tokens out), a 6,011-token prompt arrives at %.2f s' % LONG_AT,
                   'rows': stall_case('m1', 'q17_q4', (163, 500, 4), (6011, 8), [128, 256, 512, 1024, 2048, 8192], 2560, 5, LONG_AT)}

# chunk budget under Poisson traffic with long and short prompts (the knob in production)
pois = []
for b in [512, 1024, 2048, 4096, 8192, 16384]:
    cfg = {'w': {'seed': 5, 'maxtok': 512, 'clients': [
        {'n': 600, 'rate': 20, 'plo': 100, 'phi': 800, 'olo': 50, 'ohi': 400},
        {'n': 60, 'rate': 2, 'plo': 6000, 'phi': 16000, 'olo': 20, 'ohi': 200}]},
        'hw': HW['h100_fp8'], 'm': MOD['l8_fp8'], 'c': dict(ENG, budget=b), 'slo': [2, 0.05]}
    rq, engs, log, mt = run(cfg)
    pois.append({'budget': b, 'ttft_p50': r4(mt['ttft'][0]), 'ttft_p99': r4(mt['ttft'][2]), 'itl_p50': r4(mt['itl'][0]),
                 'itl_p99': r4(mt['itl'][2]), 'itl_max': r4(mt['itl'][4]), 'tps': r4(mt['tps']), 'goodput': r4(mt['goodput'])})
out['chunk_poisson'] = {'desc': 'Llama 3.1 8B FP8 on one H100 (simulated, calibrated preset): 20 chat requests/s (100 to 800-token prompts) plus 2 document requests/s (6,000 to 16,000 tokens), 30 s',
                        'rows': pois}

# ---- 2. fairness: two clients ----------------------------------------------------------------------------------
def service_series(rq, log, ncl, dt=1.0, wp=1.0, wq=2.0):
    by = {q['id']: q for q in rq}
    T = max(s['t'] + s['dt'] for s in log)
    nb = int(math.ceil(T / dt))
    ser = [[0.0] * nb for _ in range(ncl)]
    for s in log:
        k = min(nb - 1, int((s['t'] + s['dt']) / dt))
        for rid, c0, n, kind in s['rows']:
            q = by[rid]
            ser[q['cl']][k] += (wq if kind == 'd' else wp * n) / dt
    return [[round(x) for x in a] for a in ser]


def fair_case(name, clients, pols, dur=30):
    res = {'name': name, 'clients': clients, 'pol': {}}
    for pol in pols:
        cl = [dict(c, n=int(c['rate'] * dur)) for c in clients]
        prio = pol == 'priority'
        cfg = {'w': {'seed': 11, 'maxtok': 512, 'clients': cl}, 'hw': HW['h100_fp8'], 'm': MOD['l8_fp8'],
               'c': dict(ENG, policy=pol, nokv=True), 'slo': [2, 0.1]}
        rq, engs, log, mt = run(cfg, keep=True)
        per = []
        for k in range(len(cl)):
            qs = [q for q in rq if q['cl'] == k and q['done'] >= 0]
            tt = [q['first'] - q['arr'] for q in qs]
            per.append({'n': len(qs), 'ttft_p50': r4(S.pct(tt, 50)), 'ttft_p99': r4(S.pct(tt, 99)),
                        'ttft_mean': r4(sum(tt) / len(tt)), 'service': r4(sum(q['P'] + 2 * q['O'] for q in qs)),
                        'pts': [[round(q['arr'], 3), round(q['first'] - q['arr'], 3)] for q in qs][::max(1, len(qs) // 150)]})
        res['pol'][pol] = {'per': per, 'series': service_series(rq, log, len(cl)), 'tps': r4(mt['tps']), 'span': r4(mt['span'])}
    return res


A = {'rate': 60, 'plo': 300, 'phi': 1500, 'olo': 50, 'ohi': 400, 'pr': 1}
out['fair'] = [
    fair_case('One client floods the server, the other sends a normal load', [A, dict(A, rate=4, pr=0)], ['fcfs', 'vtc', 'priority']),
    fair_case('Both clients send more than half the capacity', [A, dict(A, rate=30, pr=0)], ['fcfs', 'vtc', 'priority']),
]

# ---- 3. shortest job first (oracle) against FCFS ---------------------------------------------------------------
sjf = []
for rate in [20, 34, 40, 42, 46, 50]:
    for pol in ['fcfs', 'sjf']:
        cfg = {'w': {'seed': 21, 'maxtok': 2048, 'clients': [{'n': int(rate * 40), 'rate': rate, 'plo': 200, 'phi': 1000, 'olo': 10, 'ohi': 600}]},
               'hw': HW['h100_fp8'], 'm': MOD['l8_fp8'], 'c': dict(ENG, policy=pol), 'slo': [2, 0.1]}
        rq, engs, log, mt = run(cfg)
        e2e = sorted(q['done'] - q['arr'] for q in rq if q['done'] >= 0)
        long = [q['done'] - q['arr'] for q in rq if q['done'] >= 0 and q['O'] >= 500]
        sjf.append({'rate': rate, 'pol': pol, 'ttft_mean': r4(mt['ttft'][3]), 'ttft_p99': r4(mt['ttft'][2]),
                    'e2e_mean': r4(mt['e2e'][3]), 'e2e_p99': r4(mt['e2e'][2]), 'long_e2e_p99': r4(S.pct(long, 99)),
                    'tps': r4(mt['tps'])})
out['sjf'] = {'desc': 'Llama 3.1 8B FP8 on one H100 (simulated): Poisson arrivals, 200 to 1,000-token prompts, answers 10 to 600 tokens (uniform), 40 s', 'rows': sjf}

# ---- 4. preemption: recompute against swap ---------------------------------------------------------------------
pre = []
for nb in [1000, 2000, 3000]:
    for mode, bw, adm in [('recompute', 25e9, 'optimistic'), ('swap', 25e9, 'optimistic'), ('swap', 6e9, 'optimistic'),
                          ('recompute', 25e9, 'reserve')]:
        cfg = {'w': {'seed': 31, 'maxtok': 1024, 'clients': [{'n': 240, 'rate': 6, 'plo': 200, 'phi': 1200, 'olo': 100, 'ohi': 1000}]},
               'hw': HW['h100_bf16'], 'm': MOD['l8_bf16'], 'c': dict(ENG, nblocks=nb, preempt=mode, swapbw=bw, admit=adm), 'slo': [2, 0.1]}
        rq, engs, log, mt = run(cfg)
        pre.append({'nblocks': nb, 'mode': mode, 'swapbw': bw, 'admit': adm, 'npre': mt['npre'], 'tps': r4(mt['tps']),
                    'ttft_p50': r4(mt['ttft'][0]), 'ttft_p99': r4(mt['ttft'][2]), 'tpot_p50': r4(mt['tpot'][0]),
                    'e2e_p99': r4(mt['e2e'][2]), 'steps': mt['steps']})
out['preempt'] = {'desc': 'Llama 3.1 8B BF16 on one H100 (simulated) with a deliberately small KV cache (1,000 to 3,000 blocks of 16 tokens): 6 requests/s for 40 s, 200 to 1,200-token prompts, 100 to 1,000 tokens out',
                  'rows': pre}

# ---- 5. checks recorded elsewhere --------------------------------------------------------------------------------
vp = json.load(open(os.path.join(HERE, 'out', 'vllm_prio.json')))
out['vllm_prio'] = [{'name': c['name'], 'steps': c['steps_vllm'], 'identical': c['identical'], 'pre': c['preemptions_vllm'],
                     'pre_sim': c['preemptions_sim'], 'tokens': c['sched_tokens_vllm']} for c in vp]
json.dump(out, open(os.path.join(HERE, 'out', 'sched.json'), 'w'))
print('ok', len(json.dumps(out)))
