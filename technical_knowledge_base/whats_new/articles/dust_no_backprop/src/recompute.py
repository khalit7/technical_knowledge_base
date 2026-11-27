"""The post's numbers, transcribed, and every number this page derives from them. Writes inputs/figures.json (shipped to
the page as window.ARTICLE.fig by mk_article.py) and prints the derived values the prose quotes.

usage (from this src/ folder): python3 recompute.py

Sources (read 27 November 2026):
  - Table 1 (Appendix C) and Table 2 (Appendix D), Tables 3, 4 (Appendix E) and 8 (Appendix G): https://qlabs.sh/research/dust/appendix.html
  - Figure 3 (Adam at 1M tokens) and Figure 4 (model sizes): the post's own SVG data attributes (data-val), https://qlabs.sh/research/dust
  - Noise at 10M tokens, the Dust and backprop rows: https://github.com/qlabs-eng/noise/blob/main/archive/10M/README.md
Derived numbers are calculations, labelled as such on the page; the compute model is ours (stated below), not the post's.
"""
import json, os
from decimal import Decimal as D, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
q = lambda x, p='0.001': float(D(str(x)).quantize(D(p), rounding=ROUND_HALF_UP))

BUDGETS = ['100k', '1M', '10M', '20M']
TOKENS = {'100k': 100_000, '1M': 1_000_000, '10M': 10_000_000, '20M': 20_000_000}
BATCH = 16_384                                   # 8 sequences of 2,048 tokens (Section 3.1)
POPS = [64, 256, 1024, 4096, 16384]
# Table 1: test loss at the validation-selected checkpoint, mean of three seeds
T1 = {'dust': {'100k': [7.240, 7.165, 7.151, 7.164, 7.170], '1M': [6.290, 6.067, 5.934, 5.911, 5.916],
               '10M': [5.397, 5.231, 5.111, 5.072, 5.049], '20M': [5.265, 5.139, 4.960, 4.912, 4.802]},
      'dust_fit': {'100k': 7.161, '1M': 5.892, '10M': 5.013, '20M': 4.431},
      'egg': {'100k': [7.961, 7.605, 7.386, 7.302, 7.263], '1M': [7.428, 7.200, 7.046, 6.892, 6.708],
              '10M': [7.056, 6.906, 6.692, 6.352, 6.033], '20M': [6.987, 6.811, 6.517, 6.200, 5.865]},
      'bp': {'100k': 7.216, '1M': 5.959, '10M': 4.989, '20M': 4.633}}
# Figure 3 (Adam, 1M tokens), from the figure's data attributes, printed at three decimals as its tooltips are
ADAM = {'pops': [64, 256, 1024, 4096, 16384, 65536], 'dust': [6.078, 5.836, 5.594, 5.500, 5.402, 5.368],
        'egg': [7.431, 7.200, 7.042, 6.895, 6.718], 'bp': 5.361, 'limit': 5.248, 'ci': [5.168, 5.304]}
# Figure 4 (10M tokens, four sizes; the earlier protocol of Appendix F)
SIZES = {'names': ['2.0M', '7.3M', '38M', '243M'], 'shape': ['L2/d128', 'L4/d256', 'L8/d512', 'L16/d1024'],
         'dust': [[5.705, 5.556, 5.558, 5.719], [5.486, 5.362, 5.358, 5.419], [5.265, 5.161, 5.158, 5.214],
                  [5.189, 5.095, 5.053, 5.124], [5.171, 5.065, 5.036, 5.086]],
         'bp': [5.180, 5.066, 5.015, 5.048]}
# Table 8: the cosine law at the 100M-token backprop checkpoint
T8 = [['MLP out', 0.8779, 31623], ['MLP in', 0.8577, 48417], ['Attention out', 0.8729, 21627], ['Query', 1.0, 76736],
      ['Key', 1.0, 616595], ['Value', 0.8776, 173780], ['Value gate', 0.6657, 47863], ['Value embedding', 1.0, 495450],
      ['Token embedding', 0.7318, 19498], ['LM head', 1.0, 759]]
# Table 2: EGGROLL's population to match Dust at 64 draws, as a multiple of 64
T2 = [['Power law, all five populations', '23,000', '16,000', '8,100'],
      ['Power law, one population left out', '11,000 to no match', '7,200 to 54,000', '4,700 to 17,000'],
      ['Straight line in log population, top three', '8,200', '3,700', '3,300'],
      ['Straight line in log population, top two', '6,000', '4,100', '3,100']]
# Noise at 10M tokens (validation loss, one run each, 8xH100), the Dust and backprop rows
NOISE = {'dust_sgd': 5.058, 'dust_sgd_time': '1 h 19 min', 'dust_adam': 4.167, 'dust_adam_time': '1 h 46 min',
         'bp_sgd': 5.007, 'bp_adam': 3.769}

# ---- compute per update (ours): multiply-adds per token of the base model (Appendix A: 8 blocks, width 512, MLP 2,048,
# vocabulary 4,096, sequence 2,048, sliding window 1,024 in three blocks of four, full attention in the fourth)
d, ff, V, L, S = 512, 2048, 4096, 8, 2048
ctx_win = sum(min(t, 1024) for t in range(1, S + 1)) / S; ctx_full = sum(range(1, S + 1)) / S
att = [2 * (ctx_full if b % 4 == 3 else ctx_win) * d for b in range(L)]
blk = [4 * d * d + 2 * d * ff + att[b] for b in range(L)]
head = d * V
fwd = sum(blk) + head
rerun = lambda l: (sum(blk[l:]) + head) / fwd                    # a draw at block l reruns blocks l.. and the head
attn_only = [(4 * d * d + att[b]) / fwd for b in range(L)]          # attention internals: their block's attention only
writer = [2432, 2048, 1024, 640, 384, 256, 128, 128]                 # Table 4, 1M and 10M, per block (MLP hidden: same)
attout = [384, 384, 256, 128, 128, 128, 128, 128]
sites = [['Residual writers', sum(w * rerun(i) for i, w in enumerate(writer)), sum(writer)],
         ['MLP hidden layer', sum(w * rerun(i) for i, w in enumerate(writer)), sum(writer)],
         ['Attention output', sum(w * rerun(i) for i, w in enumerate(attout)), sum(attout)],
         ['Token embedding', 640.0, 640],
         ['Attention internals', sum((128 + 1280 + 768) * attn_only[b] for b in range(L)) + sum((384 + 512) * attn_only[b] for b in range(0, L, 2)), 8 * 2176 + 4 * 896],
         ['Residual scalars and clean forwards', 16 + 8, 24]]
per_update = sum(s[1] for s in sites)
BP = 3.0                                                            # forward plus backward, about three forwards (owner page)

if __name__ == '__main__':
    steps = {b: TOKENS[b] / BATCH for b in BUDGETS}
    gap16 = {b: q(T1['dust'][b][-1] - T1['bp'][b]) for b in BUDGETS}
    gap64 = {b: q(T1['dust'][b][0] - T1['bp'][b]) for b in BUDGETS}
    gapE = {b: q(T1['egg'][b][-1] - T1['bp'][b]) for b in BUDGETS}
    best = {b: q(min(T1['dust'][b]) - T1['bp'][b]) for b in BUDGETS}
    size_gap = [[q(SIZES['dust'][i][j] - SIZES['bp'][j]) for j in range(4)] for i in range(5)]
    cos16 = [[n, q(cm / (1 + c / 16384) ** 0.5, '0.01')] for n, cm, c in T8]
    cost = {'fwd_mac_per_token': round(fwd), 'per_update': round(per_update), 'per_draw': q(per_update / 16384, '0.01'),
            'x_bp': {str(K): round(per_update * K / 16384 / BP) for K in POPS},
            'sites': [[n, round(f), dr] for n, f, dr in sites]}
    fig = {'budgets': BUDGETS, 'steps': {b: round(steps[b]) for b in BUDGETS}, 'pops': POPS, 't1': T1, 'adam': ADAM,
           'sizes': SIZES, 't8': T8, 't2': T2, 'noise': NOISE, 'cost': cost, 'cos16': cos16,
           'gap16': gap16, 'gap64': gap64, 'gapE': gapE, 'size_gap': size_gap,
           'noise_gap': {'sgd': q(NOISE['dust_sgd'] - NOISE['bp_sgd']), 'adam': q(NOISE['dust_adam'] - NOISE['bp_adam'])}}
    json.dump(fig, open(os.path.join(HERE, 'inputs', 'figures.json'), 'w'), indent=1)
    print('updates per budget', {b: round(steps[b]) for b in BUDGETS})
    print('gap at 16k', gap16, 'at 64', gap64, 'EGGROLL 16k', gapE)
    print('size gaps (rows 64..16k)', size_gap)
    print('cos at 16k', cos16)
    print('forward MAC/token %.1fM; one update at K=16,384 = %.0f forwards (%.2f per draw); x backprop by K:' % (fwd / 1e6, per_update, per_update / 16384), cost['x_bp'])
    print('sites', cost['sites'])
    print('Noise gaps', fig['noise_gap'], 'Adam 1M best measured gap', q(min(ADAM['dust']) - ADAM['bp']))
    print('6ND for backprop at 10M tokens: %.2e FLOP' % (6 * 37.7e6 * 10e6))
