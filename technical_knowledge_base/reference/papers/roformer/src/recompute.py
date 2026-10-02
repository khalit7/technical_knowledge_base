"""Recompute every derived number the page shows, from the paper's equations and tables (tables.json).
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc). Plain Python 3, no dependencies.

  python3 recompute.py        (build.sh runs it)
"""
import cmath, json, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
out = {}


def pct(s): return float(s.rstrip('%'))


# ---- Figure 2: the long-term decay bound of §3.4.3 -------------------------------------------------
# (1/(d/2)) * sum_{j=1..d/2} |S_j|, S_j = sum_{i=0..j-1} e^{i r theta_i}, theta_i = 10000^(-2i/d) (§3.3 indexing).
# The paper does not state d for Figure 2; d = 128 reproduces the plotted start (about 19.8 at distance 8) and end (about 6.5).
def bound(d, r, base=10000.0):
    S, tot = 0j, 0.0
    for i in range(d // 2):
        S += cmath.exp(1j * r * base ** (-2 * i / d)); tot += abs(S)
    return tot / (d // 2)


out['fig2'] = {'d': 128, 'r': list(range(0, 257)), 'bound': [round(bound(128, r), 4) for r in range(0, 257)]}
out['fig2_check'] = {d: [round(bound(d, 8), 2), round(bound(d, 250), 2)] for d in (64, 128, 256)}


# What the bound does not say (Barbero et al. 2024, Proposition 3.2 and Figure 2): the actual score q^T R_r k
# for all-ones q = k decays like the bound; for independent Gaussian q, k its mean is 0 at every distance.
def score(q, k, r, d, base=10000.0):
    s = 0.0
    for i in range(d // 2):
        a = r * base ** (-2 * i / d); c, sn = math.cos(a), math.sin(a)
        q1, q2, k1, k2 = q[2 * i], q[2 * i + 1], k[2 * i], k[2 * i + 1]
        # (R_m q)^T (R_n k) with n - m = r equals q^T R_r k
        s += q1 * (c * k1 - sn * k2) + q2 * (sn * k1 + c * k2)
    return s


d = 128
ones = [1.0] * d
rng = random.Random(7)
G = [([rng.gauss(0, 1) for _ in range(d)], [rng.gauss(0, 1) for _ in range(d)]) for _ in range(400)]
rs = list(range(0, 257, 4))
out['decay_check'] = {
    'r': rs,
    'ones': [round(score(ones, ones, r, d), 3) for r in rs],
    'gauss_mean': [round(sum(score(q, k, r, d) for q, k in G) / len(G), 3) for r in rs],
    'gauss_meanabs': [round(sum(abs(score(q, k, r, d)) for q, k in G) / len(G), 3) for r in rs],
    'n_samples': len(G)}

# ---- Toy model spectrum: head dimension 8, base 10000, trained at length 32 --------------------------
dh, L = 8, 32
out['toy_pairs'] = [{'i': i, 'theta': 10000 ** (-2 * i / dh), 'wavelength': round(2 * math.pi * 10000 ** (2 * i / dh), 2),
                     'max_angle_seen': round((L - 1) * 10000 ** (-2 * i / dh), 4)} for i in range(dh // 2)]

# ---- Table 1 ----
t1 = TB['t1']['rows']
out['t1_delta'] = round(float(t1[1]['bleu']) - float(t1[0]['bleu']), 2)

# ---- Table 2: deltas; wins and losses ----
b, r = [float(x) for x in TB['t2']['rows'][0]['v']], [float(x) for x in TB['t2']['rows'][1]['v']]
deltas = [round(y - x, 1) for x, y in zip(b, r)]
out['t2'] = {'delta': deltas, 'wins': [c for c, dl in zip(TB['t2']['cols'], deltas) if dl > 0],
             'losses': [c for c, dl in zip(TB['t2']['cols'], deltas) if dl < 0],
             'mean_delta_7cols': round(sum(deltas) / len(deltas), 2),
             'mean_delta_6tasks_mnli_avg': round((sum(deltas[:5]) + (deltas[5] + deltas[6]) / 2) / 6, 2)}

hf = [float(x) for x in TB['hf_dev']['row']['v']]
out['t2']['delta_vs_hf_dev'] = [round(y - x, 2) for x, y in zip(hf, r)]
out['t2']['wins_vs_hf_dev'] = [c for c, x, y in zip(TB['t2']['cols'], hf, r) if y > x]

# ---- Pretraining budgets (§4.2.2 against BERT's Appendix A.2) ----
rof = 100_000 * 64 * 512
bert = 1_000_000 * 256 * 512
out['budget'] = {'roformer_tokens': rof, 'bert_tokens_max': bert, 'ratio': round(bert / rof, 1),
                 'note': 'BERT trained 90% of its steps at length 128, so its real token count is lower: 0.9*128 + 0.1*512 per sequence',
                 'bert_tokens_actual': int(1_000_000 * 256 * (0.9 * 128 + 0.1 * 512)),
                 'ratio_actual': round(1_000_000 * 256 * (0.9 * 128 + 0.1 * 512) / rof, 1)}

# ---- Table 5: gains and their noise ----
t5 = {x['m']: (pct(x['val']), pct(x['test'])) for x in TB['t5']['rows']}
gain_vs_wobert = round(t5['RoFormer-1024'][1] - t5['WoBERT-512'][1], 2)
gain_vs_rof512 = round(t5['RoFormer-1024'][1] - t5['RoFormer-512'][1], 2)
se = {}
for label, n in (('v1_test_1536', 1536), ('v5_ratio_1793', round(8964 * 0.2))):
    p1, p2 = t5['RoFormer-1024'][1] / 100, t5['WoBERT-512'][1] / 100
    s = math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n) * 100   # independent-samples SE of the difference (upper bound for a paired test)
    se[label] = {'n': n, 'se_diff_pts': round(s, 2), 'z': round(gain_vs_wobert / s, 2)}
out['t5'] = {'gain_vs_wobert_test': gain_vs_wobert, 'gain_vs_roformer512_test': gain_vs_rof512,
             'gain_vs_wobert_val': round(t5['RoFormer-1024'][0] - t5['WoBERT-512'][0], 2),
             'paper_says': '1.5% absolute over WoBERT', 'se': se,
             'v1_split_total': sum(x['n'] for x in TB['v1split']['rows'] if x['s'] != 'Total'), 'v5_total': 8964}

# ---- Table 4: is accuracy tracking length or training order? ----
t4 = TB['t4']['rows']
xs = [math.log2(x['len']) for x in t4]; ys = [pct(x['acc']) for x in t4]
mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
corr = sum((a - mx) * (b_ - my) for a, b_ in zip(xs, ys)) / math.sqrt(sum((a - mx) ** 2 for a in xs) * sum((b_ - my) ** 2 for b_ in ys))
out['t4'] = {'corr_log2len_acc': round(corr, 3),
             'max_len_seen_before_cail': max(x['len'] for x in t4),
             'note': 'RoFormer-1024 in Table 5 runs at 1,024 tokens, inside the 1,536 of stages 2 and 5: interpolation, not extrapolation'}

# ---- Then and now: frequency spectrum under each later method, d_head = 128 ----
def turns(base, d, L, scale=1.0):
    return [L * scale * base ** (-2 * i / d) / (2 * math.pi) for i in range(d // 2)]


D = 128
ntk_base = 10000 * 16 ** (D / (D - 2))      # YaRN Appendix A.2, Eq. 19: b' = b * s^(|D|/(|D|-2)), s = 16 (2,048 to 32,768)
out['then'] = {
    'roformer_turns_512': [round(t, 4) for t in turns(10000, D, 512)],
    'pairs_under_one_turn': {
        'base10000_L2048': sum(1 for t in turns(10000, D, 2048) if t < 1),
        'base500000_L8192': sum(1 for t in turns(500000, D, 8192) if t < 1),
        'toy_base10000_L32_d8': sum(1 for t in turns(10000, 8, 32) if t < 1)},
    'ntk_base_s16': round(ntk_base), 'yarn_temp_s16': round(0.1 * math.log(16) + 1, 4),
    'llama3_lowest_wavelength': round(2 * math.pi * 500000 ** ((D - 2) / D)),
    'base10000_longest_wavelength': round(2 * math.pi * 10000 ** ((D - 2) / D))}

json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), separators=(',', ':'))
if __name__ == '__main__':
    show = {k: v for k, v in out.items() if k not in ('fig2', 'decay_check')}
    show['then'] = {k: v for k, v in out['then'].items() if k != 'roformer_turns_512'}
    print(json.dumps(show, indent=1))
    print('fig2 at 8, 50, 100, 250:', [out['fig2']['bound'][i] for i in (8, 50, 100, 250)])
    print('ones at 0, 64, 128, 256:', [out['decay_check']['ones'][i] for i in (0, 16, 32, 64)],
          'gauss mean:', out['decay_check']['gauss_mean'][:4], 'gauss |.|:', out['decay_check']['gauss_meanabs'][:4], out['decay_check']['gauss_meanabs'][-3:])
