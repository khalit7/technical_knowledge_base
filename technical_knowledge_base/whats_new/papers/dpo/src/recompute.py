"""Every derived number the page quotes about the paper's own evidence, recomputed.
usage: python3 recompute.py   (build.sh runs it; writes inputs/recompute.json)
Inputs: inputs/figs.json (decode_figs.py: the figures' data read from the arXiv HTML's vector SVGs,
calibrated on their own tick marks), tables.json (Tables 1 and 2 as printed), inputs/toy.json (toy_sweep.mjs)."""
import json, math, os
H = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(H, 'inputs', 'figs.json')))
TB = json.load(open(os.path.join(H, 'tables.json')))
out = {}
se = lambda p, n: math.sqrt(p * (1 - p) / n)
lab = lambda f: {s['label']: s for s in f['series'].values()}
# --- Figure 2 right (TL;DR): win rates are multiples of 1/256, and the bars are one binomial SE at n = 256 ---
T = lab(F['tldr_winrate_vs_temp']); vals = [p[1] for s in T.values() for p in s['line']]
out['tldr_n'] = 256
out['tldr_grid_err'] = max(abs(v * 256 - round(v * 256)) for v in vals)
ratios = []
for s in T.values():
    for (x, lo, hi), (_, p) in zip(s['bars'], s['line']): ratios.append(((hi - lo) / 2) / se(p, 256))
out['tldr_bar_over_se'] = [min(ratios), max(ratios)]
temps = [0, 0.25, 0.5, 0.75, 1.0]
out['tldr'] = {k: [round(p[1] * 256) for p in s['line']] for k, s in T.items()}  # wins out of 256
d0 = T['DPO']['line'][0][1]; p0 = T['PPO']['line'][0][1]
out['tldr_dpo_t0'] = d0; out['tldr_ppo_t0'] = p0
out['tldr_gap_t0'] = d0 - p0; out['tldr_gap_se'] = math.sqrt(se(d0, 256) ** 2 + se(p0, 256) ** 2)
out['tldr_gap_z'] = out['tldr_gap_t0'] / out['tldr_gap_se']
bo = T['Best of 128']['line']; out['tldr_bo128_max'] = max(p[1] for p in bo); out['tldr_bo128_argmax'] = temps[max(range(5), key=lambda i: bo[i][1])]
out['tldr_dpo_max'] = max(p[1] for p in T['DPO']['line'])
g = out['tldr_dpo_max'] - out['tldr_bo128_max']; out['tldr_dpo_vs_bo_z'] = g / math.sqrt(se(out['tldr_dpo_max'], 256) ** 2 + se(out['tldr_bo128_max'], 256) ** 2)
out['tldr_ppo_t1'] = T['PPO']['line'][4][1]; out['tldr_gptj_max'] = max(p[1] for p in T['GPT-J']['line'])
out['tldr_sft_t0'] = T['SFT']['line'][0][1]; out['tldr_pft'] = [p[1] for p in T['Preferred-FT']['line']]
# --- Figure 3 left (Anthropic-HH) and Figure 4 (Best of N) ---
D = lab(F['dialogue_winrate_vs_temp']); dt = [0.25, 0.7, 1.0]
out['hh'] = {k: [round(p[1], 4) for p in s['line']] for k, s in D.items()}
hr = []
for s in D.values():
    for (x, lo, hi), (_, p) in zip(s['bars'], s['line']): hr.append(p * (1 - p) / ((hi - lo) / 2) ** 2)
out['hh_n_implied'] = [min(hr), max(hr)]
dm = max(D['DPO']['line'], key=lambda p: p[1]); bm = max(D['Best of 128']['line'], key=lambda p: p[1])
out['hh_dpo_max'] = dm[1]; out['hh_bo128_max'] = bm[1]; n = 250
out['hh_dpo_vs_bo_z'] = (dm[1] - bm[1]) / math.sqrt(se(dm[1], n) ** 2 + se(bm[1], n) ** 2)
out['hh_dpo_t025'] = D['DPO']['line'][0][1]; out['hh_bo_t025'] = D['Best of 128']['line'][0][1]
S = lab(F['dialogue_winrate_vs_steps']); out['hh_steps'] = {k: [[round(p[0] / 10) * 10 if k.endswith('1.0)') else round((p[0] - 10) / 10) * 10, round(p[1], 4)] for p in s['line']] for k, s in S.items()}
B = lab(F['dialogue_winrate_vs_temp_rerank']); out['hh_bon'] = {k: [round(p[1], 4) for p in s['line']] for k, s in B.items()}
B2 = lab(F['tldr_rerank_vs_temp']); out['tldr_bon'] = {k: [round(p[1] * 256) for p in s['line']] for k, s in B2.items()}
# --- Figure 2 left (IMDb frontier): 177 evaluation points ---
FR = lab(F['frontier']); out['frontier_counts'] = {k: len(s['points']) for k, s in FR.items()}
def env(pts):
    pts = sorted(pts); e = []; best = -1
    for kl, r in pts:
        if r > best: e.append((kl, r)); best = r
    return e
dpo = FR['DPO (Ours)']['points']
dom = {}
for k, s in FR.items():
    if k.startswith('DPO'): continue
    c = sum(1 for kl, r in s['points'] if any(k2 <= kl and r2 >= r for k2, r2 in dpo))
    dom[k] = [c, len(s['points'])]
out['frontier_dominated'] = dom
out['frontier_max'] = {k: [max(p[1] for p in s['points']), min(p[0] for p in s['points'] if p[1] == max(q[1] for q in s['points']))] for k, s in FR.items()}
out['frontier_dpo_klmax'] = max(p[0] for p in dpo)
def best_at(pts, k): c = [r for kl, r in pts if kl <= k]; return max(c) if c else None
out['frontier_at'] = {str(k): {m: best_at(s['points'], k) for m, s in FR.items()} for k in (2, 5, 10)}
# --- Table 1 and Table 2 ---
t2 = {r[0]: r[1:] for r in TB['t2']['rows']}
out['t2_se'] = {m: round(100 * se(int(t2['Human win %'][i]) / 100, int(t2['N respondents'][i])), 1) for i, m in enumerate(TB['t2']['cols'])}
out['t2_dpo_human_z_vs_half'] = (0.58 - 0.5) / se(0.58, 272)
out['t1_gap'] = [0.36 - 0.26, 0.31 - 0.23]
for nn in (100, 256, 500): out['t1_z_n%d' % nn] = (0.36 - 0.26) / math.sqrt(se(.36, nn) ** 2 + se(.26, nn) ** 2)
# --- the toy (toy_sweep.mjs) summary numbers used in the prose ---
if os.path.exists(os.path.join(H, 'inputs', 'toy.json')):
    Y = json.load(open(os.path.join(H, 'inputs', 'toy.json')))
    out['toy'] = {'ref_reward': Y['ref']['reward'], 'pairs': Y['data']['pairs'], 'distinct': Y['data']['distinct'], 'rm_acc': Y['rm']['valAcc'],
                  'byMethod': Y['byMethod'], 'frontierAt1': Y['frontierAt1']}
json.dump(out, open(os.path.join(H, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for k, v in out.items():
        if k not in ('toy', 'hh_steps'): print(k, v)
