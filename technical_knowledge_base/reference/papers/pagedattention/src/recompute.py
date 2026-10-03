"""Recompute every derived number the page shows, from the paper's text, Table 1, the OPT configurations and the
figure data read from the vector graphics (inputs/figs.json, made by extract_figs.py).
Writes inputs/recompute.json; the page reads it through mk_paper.py (window.PAPER.rc).
usage: python3 recompute.py"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
T = json.load(open(os.path.join(HERE, 'tables.json')))
GiB = 2 ** 30
out = {}

# ---- KV cache per token (paper §3; OPT Table 1 and the Hugging Face configs) ----
M = {'OPT-13B': (5120, 40), 'OPT-66B': (9216, 64), 'OPT-175B': (12288, 96), 'LLaMA-13B': (5120, 40)}
kv = {m: 2 * h * L * 2 for m, (h, L) in M.items()}  # key and value, hidden, layers, fp16 bytes
out['kv_per_token_bytes'] = kv
out['kv_13b_kib'] = kv['OPT-13B'] / 1024                       # 800 KiB, the paper's "800 KB"
out['kv_2048_gib'] = kv['OPT-13B'] * 2048 / GiB                 # 1.5625, the paper's "1.6 GB"

# ---- Table 1: slots = KV memory / KV per token; parameters at 2 bytes each ----
t1 = []
for r in T['table1']['rows']:
    m = 'OPT-' + r['model']
    slots = r['kv_gb'] * GiB / kv[m]
    t1.append(dict(model=r['model'], printed_slots_k=r['slots_k'], slots_k=round(slots / 1000, 2), params_gb_2bytes=r['params_b'] * 2,
                   printed_params_gb=r['params_gb'], left_after_params=r['mem_gb'] - r['params_gb'], printed_kv_gb=r['kv_gb'],
                   kv_gb_for_printed_slots=round(r['slots_k'] * 1000 * kv[m] / GiB, 2)))
out['table1'] = t1
slots13 = 12 * GiB / kv['OPT-13B']
out['slots_13b'] = slots13                                      # 15,728.6
out['orca_max_batch'] = math.floor(slots13 / 2048)               # 7, Fig. 13's 7.00 in both traces
out['orca_max_free_pct'] = 100 * (slots13 - 7 * 2048) / slots13  # 8.85, Fig. 2's 8.9 "external frag. & others"

# ---- Figure 3: the two requests' slots ----
out['fig3'] = dict(a_never_used=2048 - 7 - 1 - 2, b_never_used=512 - 3 - 1 - 1)  # 2038 and 507, as printed

# ---- Figure 2 (printed labels) and its sums ----
f2 = T['fig2']['rows']
out['fig2_sums'] = {r['sys']: round(sum(v for v in (r['token'], r['resv'], r['internal'], r['external']) if v is not None), 1) for r in f2}
out['fig2_vector_vllm'] = [b[1:] for b in F['fig2_waste']['bars'] if abs(b[0] - 377.50108) < 1e-3]

# ---- Figure 13 and Figure 15 ratios ----
f13 = T['fig13']
out['fig13_ratios'] = {d: dict(vs_oracle=f13[d]['vLLM'] / f13[d]['Orca (Oracle)'], vs_max=f13[d]['vLLM'] / f13[d]['Orca (Max)'], vs_pow2=f13[d]['vLLM'] / f13[d]['Orca (Pow2)']) for d in ('ShareGPT', 'Alpaca')}

# ---- Figure 11: means of the histograms against the printed means ----
def hist_mean(b): return sum((l + r) / 2 * d * (r - l) for l, r, d in b) / sum(d * (r - l) for l, r, d in b)
out['fig11'] = {}
for d in ('sharegpt', 'alpaca'):
    H = F['fig11_' + d]['bins']
    out['fig11'][d] = dict(input_mean=hist_mean(H['input']), output_mean=hist_mean(H['output']), input_mass=sum(x[2] * (x[1] - x[0]) for x in H['input']))
out['fig11_ratio_printed'] = dict(input=161.31 / 19.31, output=337.99 / 58.45)  # "8.4x longer input prompts and 5.8x longer outputs"

# ---- Figure 12, 14, 16, 17: the request rate at which normalized latency first crosses a threshold ----
def crossing(pts, thr):
    """First rate where the drawn line reaches thr (linear between drawn points); None if it never does in the plot."""
    for (x0, y0, *_), (x1, y1, *_) in zip(pts, pts[1:]):
        if y0 < thr <= y1:
            return x0 + (thr - y0) * (x1 - x0) / (y1 - y0)
    return None

def caps(fig, thr):
    res = []
    for pan in F[fig]:
        res.append({s: crossing(sorted(max(v, key=len), key=lambda p: p[0]), thr) for s, v in pan['series'].items()})
    return res

THR = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
out['capacity'] = {fig: {str(t): caps(fig, t) for t in THR} for fig in ('fig12_sharegpt', 'fig12_alpaca', 'fig14_parallel', 'fig14_beam', 'fig16_prefix', 'fig17_chat')}

def ratio(fig, t, a, b):
    r = []
    for pan in out['capacity'][fig][str(t)]:
        r.append(pan[a] / pan[b] if pan.get(a) and pan.get(b) else None)
    return r
out['ratios_at_0.5'] = {
    'sharegpt_vs_oracle': ratio('fig12_sharegpt', 0.5, 'vLLM', 'Orca (Oracle)'), 'sharegpt_vs_max': ratio('fig12_sharegpt', 0.5, 'vLLM', 'Orca (Max)'),
    'sharegpt_vs_ft': ratio('fig12_sharegpt', 0.5, 'vLLM', 'FasterTransformer'),
    'alpaca_vs_oracle': ratio('fig12_alpaca', 0.5, 'vLLM', 'Orca (Oracle)'), 'alpaca_vs_max': ratio('fig12_alpaca', 0.5, 'vLLM', 'Orca (Max)'),
    'alpaca_vs_ft': ratio('fig12_alpaca', 0.5, 'vLLM', 'FasterTransformer'),
    'parallel_vs_oracle': ratio('fig14_parallel', 0.5, 'vLLM', 'Orca (Oracle)'), 'beam_vs_oracle': ratio('fig14_beam', 0.5, 'vLLM', 'Orca (Oracle)'),
    'prefix_vs_oracle': ratio('fig16_prefix', 0.5, 'vLLM', 'Orca (Oracle)'), 'chat_vs_oracle': ratio('fig17_chat', 0.5, 'vLLM', 'Orca (Oracle)'),
    'chat_vs_max': ratio('fig17_chat', 0.5, 'vLLM', 'Orca (Max)')}

# ---- Figure 18a: the paged kernel's overhead over FasterTransformer's ----
k = F['fig18a_kernel'][0]['series']
ov = []
for lv, lf in zip(sorted(k['vLLM'], key=lambda s: s[0][1]), sorted(k['FasterTransformer'], key=lambda s: s[0][1])):
    for (c, v), (_, f) in zip(lv, lf):
        ov.append(dict(ctx=c, vllm_us=v, ft_us=f, overhead_pct=100 * (v / f - 1), bs=8 if lv[0][1] < 50 else 32))
out['fig18a'] = ov

# ---- Figure 19a: recomputation against swapping ----
s = F['fig19a_swap'][0]['series']
rec = dict((int(x), y) for x, y, *_ in s['Recompute'][0]); sw = dict((int(x), y) for x, y, *_ in s['Swap in + out'][0])
out['fig19a'] = [dict(block=b, recompute_ms=rec[b], swap_ms=sw[b], recompute_over_swap=rec[b] / sw[b]) for b in sorted(rec)]

# ---- Figure 1: memory per extra request (slopes) ----
b = F['fig1_batch'][1]['series']
ex = sorted(max(b['Existing systems'], key=len)); vl = sorted(max(b['vLLM'], key=len))
out['fig1'] = dict(existing_last=ex[-1][:2], vllm_last=vl[-1][:2], existing_gb_per_req=(ex[-1][1] - ex[0][1]) / (ex[-1][0] - ex[0][0]), vllm_gb_per_req=(vl[-1][1] - vl[0][1]) / (vl[-1][0] - vl[0][0]))
th = sorted(max(F['fig1_batch'][0]['series']['Throughput'], key=len))
out['fig1_throughput'] = [[round(x, 2), round(y, 1)] for x, y, *_ in th]

# ---- sharing savings in the text ----
out['fig15'] = dict(parallel=[b[3] for b in F['fig15_parallel']['bars']], beam=[b[3] for b in F['fig15_beam']['bars']])

json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, default=float)
if __name__ == '__main__':
    print('KV/token OPT-13B', kv['OPT-13B'], 'bytes =', out['kv_13b_kib'], 'KiB; 2048 tokens', round(out['kv_2048_gib'], 4), 'GiB')
    for r in t1: print('Table 1', r)
    print('slots 13B', round(slots13, 1), 'Orca(Max) batch', out['orca_max_batch'], 'free %', round(out['orca_max_free_pct'], 2))
    print('fig2 sums', out['fig2_sums'], 'vector vLLM', out['fig2_vector_vllm'])
    print('fig13', out['fig13_ratios'])
    print('fig11', out['fig11'], out['fig11_ratio_printed'])
    for kk, v in out['ratios_at_0.5'].items(): print(kk, [round(x, 2) if x else x for x in v])
    for o in ov: print('fig18a', o)
    for o in out['fig19a']: print('fig19a', o)
    print('fig1', out['fig1'])
