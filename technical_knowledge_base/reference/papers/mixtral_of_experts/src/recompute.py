"""Recompute every derived number the page shows, from the paper's tables and the released configs.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc).

  python3 recompute.py

1. Parameter counts of Mixtral 8x7B, Mistral 7B, Llama 2 13B and Llama 2 70B from their configurations
   (Table 1 of the paper; Hugging Face config.json files, inputs/configs.json): total, active, the
   47B and 13B of the abstract, the "5x fewer active parameters" ratio.
2. The decode cost model behind "faster inference at low batch sizes, higher throughput at large
   batch sizes" (Introduction) and "more suitable for batched workloads" (Section 3): expected experts
   read per layer at batch B with uniform top-2 routing, weight bytes per decode step, the batch at
   which each model turns compute-bound on an idealised roofline.
3. Table 5's random baselines; differences and checks on Tables 2 to 4 and Figure 5.
"""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
CF = json.load(open(os.path.join(HERE, 'inputs', 'configs.json')))
TB = json.load(open(os.path.join(HERE, 'tables.json')))


def count(c):
    d, L, V, H, KV = c['hidden_size'], c['num_hidden_layers'], c['vocab_size'], c['num_attention_heads'], c['num_key_value_heads']
    hd = c.get('head_dim') or d // H
    ff = c['intermediate_size']; n = c.get('num_local_experts', 1); k = c.get('num_experts_per_tok', 1)
    emb = V * d * (1 if c.get('tie_word_embeddings') else 2)
    attn = d * H * hd + 2 * d * KV * hd + H * hd * d
    expert = 3 * d * ff
    router = d * n if n > 1 else 0
    norms = 2 * d
    total = emb + L * (attn + n * expert + router + norms) + d
    active = emb + L * (attn + k * expert + router + norms) + d
    return dict(total=total, active=active, emb=emb, attn_layer=attn, expert=expert, n=n, k=k, layers=L,
                shared=total - L * n * expert, kv_bytes_per_token=2 * L * KV * hd * 2)


R = {}
P = {m: count(c) for m, c in CF.items() if not m.startswith('_')}
R['params'] = P
R['cfg_url'] = {m: c['_url'] for m, c in CF.items() if not m.startswith('_')}
mx, l70, l13, m7 = P['mixtral_8x7b'], P['llama2_70b'], P['llama2_13b'], P['mistral_7b']
R['ratio_active_70b'] = round(l70['total'] / mx['active'], 2)          # "5x fewer active parameters"
R['ratio_total_active'] = round(mx['total'] / mx['active'], 2)
R['naive_8x7'] = 8 * m7['total']                                         # what "8x7B" would suggest
R['expert_share_total'] = round(mx['layers'] * mx['n'] * mx['expert'] / mx['total'], 4)
R['bf16_gb_total'] = round(mx['total'] * 2 / 1e9, 1)
R['bf16_gb_l70'] = round(l70['total'] * 2 / 1e9, 1)

# ---- 2. decode cost model ----
# Uniform top-2 routing over n = 8 experts, B tokens from B different sequences routed independently:
# P(an expert is not picked by one token) = (n - k) / n, so E[experts read per layer] = n (1 - ((n-k)/n)^B).
def touched(B, n=8, k=2): return n * (1 - ((n - k) / n) ** B)
HW = dict(name='2 x H100 SXM (idealised)', bw=2 * 3.35e12, flops=2 * 989e12,
          src='https://www.nvidia.com/en-us/data-center/h100/')
def step(m, B):
    p = P[m]
    read = p['shared'] + (p['layers'] * touched(B, p['n'], p['k']) * p['expert'] if p['n'] > 1 else 0)
    if p['n'] == 1: read = p['total']
    byts = 2 * read; fl = 2 * p['active'] * B
    t = max(byts / HW['bw'], fl / HW['flops'])
    return dict(B=B, experts=round(touched(B, p['n'], p['k']), 3) if p['n'] > 1 else None, bytes=byts, flops=fl,
                t=t, tok_s=B / t, bound='compute' if fl / HW['flops'] > byts / HW['bw'] else 'memory')
BS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
R['hw'] = HW
R['decode'] = {m: [step(m, B) for B in BS] for m in ('mixtral_8x7b', 'llama2_70b', 'llama2_13b', 'mistral_7b')}
R['touched'] = {B: round(touched(B), 3) for B in BS}
# batch where each model turns compute-bound: 2 * active * B / F = bytes / BW
def crossover(m):
    lo, hi = 1, 1 << 16
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if step(m, mid)['bound'] == 'compute': hi = mid
        else: lo = mid
    return hi
R['crossover'] = {m: crossover(m) for m in R['decode']}
R['speedup_vs_70b'] = {B: round(step('llama2_70b', B)['t'] / step('mixtral_8x7b', B)['t'], 2) for B in BS}
R['ratio_vs_13b'] = {B: round(step('mixtral_8x7b', B)['t'] / step('llama2_13b', B)['t'], 2) for B in BS}

# ---- 3. Table 5 baselines and checks ----
R['t5_first_random'] = 1 / 8
R['t5_either_random'] = round(1 - (6 / 8) * (5 / 7), 4)                 # paper: "~46%"
R['t5_either_random_comb'] = round(1 - math.comb(6, 2) / math.comb(8, 2), 4)
t5 = TB['t5']['rows']
for col, name in ((1, 'l0'), (2, 'l15'), (3, 'l31'), (4, 'e0'), (5, 'e15'), (6, 'e31')):
    v = [float(r[col].rstrip('%')) for r in t5]
    R['t5_range_' + name] = [min(v), max(v)]

# Table 2: Mixtral minus Llama 2 70B, per benchmark; count of wins
t2 = TB['t2']; cols = t2['cols'][2:]
row = {r[0]: [float(x.rstrip('%')) for x in r[2:]] for r in t2['rows']}
d = {c: round(a - b, 1) for c, a, b in zip(cols, row['Mixtral 8x7B'], row['LLaMA 2 70B'])}
R['t2_delta_vs_l70'] = d
R['t2_wins'] = sum(1 for v in d.values() if v > 0); R['t2_n'] = len(d)
R['t2_losses'] = [c for c, v in d.items() if v < 0]
# Table 3 deltas
t3 = TB['t3']['rows']
R['t3'] = {r[0]: {'l70': r[2], 'gpt35': r[3], 'mixtral': r[4]} for r in t3}
# Table 4: Mixtral minus Llama 2 70B per language and benchmark
t4 = TB['t4']; r4 = {r[0]: [float(x.rstrip('%')) for x in r[2:]] for r in t4['rows']}
R['t4_delta'] = [round(a - b, 1) for a, b in zip(r4['Mixtral 8x7B'], r4['LLaMA 2 70B'])]
R['t4_min_delta'] = min(R['t4_delta']); R['t4_max_delta'] = max(R['t4_delta'])
# Figure 5 (the text calls it Table 5): BOLD means and standard deviations
f5 = TB['f5']['rows'][1:]
lower_std = [r[0] for r in f5 if float(r[2].split()[2]) < float(r[1].split()[2])]
higher_mean = [r[0] for r in f5 if float(r[2].split()[0]) > float(r[1].split()[0])]
R['f5_lower_std'] = lower_std; R['f5_higher_mean'] = higher_mean; R['f5_groups'] = len(f5)
# LMSys Elo: win probability implied by a 4-point gap
R['elo_gap_4_winprob'] = round(1 / (1 + 10 ** (-4 / 400)), 4)
R['elo_gap_44_winprob'] = round(1 / (1 + 10 ** (-44 / 400)), 4)
# magnet tweet time from its snowflake id
tid = 1733150512395038967
import datetime
R['magnet_utc'] = datetime.datetime.utcfromtimestamp(((tid >> 22) + 1288834974657) / 1000).strftime('%Y-%m-%d %H:%M UTC')
R['days_magnet_to_arxiv'] = (datetime.date(2024, 1, 8) - datetime.date(2023, 12, 8)).days

# ---- 4. Mixtral's own Figures 7, 9, 10, decoded by decode_figs.py ----
FG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
NM = ['ArXiv', 'DM Mathematics', 'Github', 'Gutenberg', 'PhilPapers', 'PubMed Abstracts', 'StackExchange', 'Wikipedia (en)']
tv7 = []
for p in FG['fig7']:
    v = p['values']; avg = [sum(v[n][e] for n in NM) / len(NM) for e in range(8)]
    tv7.append({'title': p['title'], 'tv': {n: round(.5 * sum(abs(v[n][e] - avg[e]) for e in range(8)), 4) for n in NM},
                'maxpair': round(max(.5 * sum(abs(v[a][e] - v[b][e]) for e in range(8)) for a in NM for b in NM), 4),
                'maxshare': round(max(max(x) for x in v.values()), 4), 'minshare': round(min(min(x) for x in v.values()), 4)})
R['fig7_tv'] = tv7
# first-choice repeat rate expected from each domain's own (uneven) first-choice use, if consecutive tokens were independent: sum p_i^2
adj = {}
for p in FG['fig9']:
    if 'First choice' in p['title']:
        L = int(re.search(r'Layer (\d+)', p['title']).group(1))
        adj[L] = {n: round(sum(x * x for x in p['values'][n]), 4) for n in NM}
R['t5_first_usage_baseline'] = adj
R['t5_first_excess_over_usage'] = {L: {r[0]: round(float(r[1 + i].rstrip('%')) / 100 - adj[L][r[0]], 4) for r in TB['t5']['rows']} for i, L in enumerate((0, 15, 31))}
R['fig10_vs_table5'] = FG['fig10_vs_table5_max_abs_diff_points']

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    print('Mixtral total %.3fB active %.3fB  (paper 47B / 13B; blog 46.7B / 12.9B)' % (mx['total'] / 1e9, mx['active'] / 1e9))
    print('Llama 2 70B %.3fB, 13B %.3fB, Mistral 7B %.3fB; 70B/Mixtral active = %.2f' % (l70['total'] / 1e9, l13['total'] / 1e9, m7['total'] / 1e9, R['ratio_active_70b']))
    print('experts read per layer by batch', R['touched'])
    print('crossover batch', R['crossover'])
    print('speedup vs 70B by batch', R['speedup_vs_70b'])
    print('Mixtral time / Llama 2 13B time', R['ratio_vs_13b'])
    print('Table 2 deltas', d, 'wins', R['t2_wins'], 'of', R['t2_n'])
    print('Table 4 deltas', R['t4_delta'])
    print('Fig 5 lower std', lower_std, 'higher mean', higher_mean)
    print('either baseline', R['t5_either_random'], R['t5_either_random_comb'], 'ranges', {k: v for k, v in R.items() if k.startswith('t5_range')})
    print('fig7 tv', [(t['title'], max(t['tv'].values()), t['tv']['DM Mathematics'], t['tv']['Github']) for t in R['fig7_tv']])
    print('usage baseline', R['t5_first_usage_baseline'])
    print('excess', R['t5_first_excess_over_usage'])
    print('magnet', R['magnet_utc'], R['days_magnet_to_arxiv'], 'days before arXiv v1')
