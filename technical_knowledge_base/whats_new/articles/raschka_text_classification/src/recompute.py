"""Recompute every worked number of the article (and the two figures' inputs) with exact decimals.

  python3 src/recompute.py        (from the page folder; writes src/inputs/recompute.json, which mk_article.py ships
                                   to the page as window.ARTICLE.recompute and check_page.mjs compares with the prose)

Sources: the article's own numbers (Section 3.3 Jev runs, Section 5.2 RLCR rewards and Table 1(a) values it quotes), the
notebooks behind its IMDb accuracies (which test split each used), TypeSafe's documentation (the confidence formula) and
Archer Hume's measurement of Jev's odds when a fifth option is added (17 September 2026). Illustrative inputs are marked.
"""
import json, math, os
from decimal import Decimal as D, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
q = lambda x, p='0.01': float(D(x).quantize(D(p), rounding=ROUND_HALF_UP))

out = {}

# ---- Section 3.3: Jev on the 25,000 IMDb test reviews (one run each, the author's) ----
N = 25000
runs = {'choice': {'correct': 24117, 'tokens': 15456663, 'cost': '0.6492', 'secs': 22 * 60 + 24},
        'noul': {'correct': 24050, 'tokens': 15106663, 'cost': '0.6345', 'secs': 23 * 60 + 3}}
PRICE = D('0.042')  # dollars per million input tokens, output free (TypeSafe launch post, 15 September 2026)
for k, r in runs.items():
    acc = D(r['correct']) / N * 100
    cost = D(r['tokens']) * PRICE / D(10) ** 6
    r['acc'] = q(acc)
    r['cost_recomputed'] = q(cost, '0.0001')
    assert str(D(r['cost_recomputed']).quantize(D('0.0001'))) == r['cost'], (k, cost)
    r['tokens_per_review'] = q(D(r['tokens']) / N, '0.1')
    r['reviews_per_s'] = q(D(N) / r['secs'], '0.1')
    p = r['correct'] / N
    r['se_pp'] = q(D(str(math.sqrt(p * (1 - p) / N) * 100)), '0.01')  # binomial standard error, percentage points
out['jev'] = runs
assert runs['choice']['acc'] == 96.47 and runs['noul']['acc'] == 96.2
out['jev_gap'] = {'reviews': 24117 - 24050, 'pp': q(D(24117 - 24050) / N * 100),
                  'token_gap_per_review': (15456663 - 15106663) // N}  # 14: the example responses show 342 and 328 input tokens
assert out['jev_gap']['token_gap_per_review'] == 14 and 342 - 328 == 14
out['jev_cost_per_1000'] = q(D('0.6492') / 25, '0.001')

# ---- The IMDb ladder: the article's numbers, with the test set each was measured on (from the linked notebooks) ----
# split A: the official 25,000 test reviews; B: 10,000 reviews from the 50,000 reshuffled (35k/5k/10k, seed 123);
# C: the second half (25,000) of the 50,000 shuffled once (the 2014 machine-learning-book chapter 8 notebook).
out['ladder'] = [
    {'m': 'Bag-of-words + logistic regression', 's': 'C', 'a': 89.9, 'trained': 1, 'sec': '1.1'},
    {'m': 'LSTM, trained from scratch', 's': 'A', 'a': 85.66, 'trained': 1, 'sec': '1.2.2'},
    {'m': 'ULMFiT (pretrained LSTM, 2018 paper)', 's': 'A', 'a': 95.4, 'trained': 1, 'sec': '1.2.2'},
    {'m': 'Text CNN', 's': 'B', 'a': 90.07, 'trained': 1, 'sec': '1.2.3'},
    {'m': 'GPT-2 124M, classification head', 's': 'B', 'a': 91.88, 'approx': 92, 'trained': 1, 'sec': '2.2'},
    {'m': 'ModernBERT large', 's': 'B', 'a': 95.07, 'approx': 95, 'trained': 1, 'sec': '2.1'},
    {'m': 'Jev, Choice', 's': 'A', 'a': 96.47, 'trained': 0, 'sec': '3.3'},
    {'m': 'Jev, Noul', 's': 'A', 'a': 96.2, 'trained': 0, 'sec': '3.3'},
    {'m': 'Laya (open Jev-like)', 's': '?', 'a': 92.33, 'trained': 0, 'sec': 'Update 2'},
    {'m': 'Contrastive Language Models', 's': '?', 'a': 82.9, 'trained': 0, 'sec': 'Update 2'},
]
assert q(100 - D('4.6'), '0.1') == 95.4  # ULMFiT's IMDb test error, 4.6% (arXiv 1801.06146)
out['ulmfit_gain_over_lstm'] = q(D('95.4') - D('85.66'))

# ---- TypeSafe's confidence field: (p_max - 1/n) / (1 - 1/n) (docs, Confidence, "How confidence is calculated") ----
conf = lambda pmax, n: (D(pmax) - D(1) / n) / (1 - D(1) / n)
out['confidence'] = {'binary_p1': q(conf('1.0', 2)), 'binary_p074': q(conf('0.74', 2)), 'three_p074': q(conf('0.74', 3), '0.001')}
assert out['confidence']['binary_p1'] == 1.0 and out['confidence']['binary_p074'] == 0.48

# ---- Section 5.2: the RLCR reward R = c - (q - c)^2 ----
R = lambda c, qq: D(c) - (D(qq) - D(c)) ** 2
out['rlcr'] = {'wrong_09': q(R(0, '0.9')), 'wrong_02': q(R(0, '0.2')), 'right_09': q(R(1, '0.9'))}
assert out['rlcr'] == {'wrong_09': -0.81, 'wrong_02': -0.04, 'right_09': 0.99}
# expected reward when the answer is right with probability p and the model states q: p*R(1,q) + (1-p)*R(0,q);
# maximised at q = p, where it equals p^2 (honesty pays); at p = 0.7 compare honest 0.7, overconfident 0.9 and 1.0
ER = lambda p, qq: D(p) * R(1, qq) + (1 - D(p)) * R(0, qq)
out['rlcr_expected'] = {'p': 0.7, 'q07': q(ER('0.7', '0.7')), 'q09': q(ER('0.7', '0.9')), 'q10': q(ER('0.7', '1.0')), 'q05': q(ER('0.7', '0.5'))}
assert out['rlcr_expected']['q07'] == 0.49 and max(out['rlcr_expected'][k] for k in ('q07', 'q09', 'q10', 'q05')) == 0.49
# the values the article quotes from the paper's Table 1(a) (checked against the arXiv 2507.16806 HTML, read 27 November 2026)
out['rlcr_table'] = {'hotpot_ece': [0.37, 0.03], 'hotpot_acc': [63.0, 62.1], 'ood_ece': [0.46, 0.21], 'ood_acc': [53.9, 56.2]}

# ---- Section 4: one shared scoring head per candidate, then a softmax across candidates ----
# Illustrative scores (not measured) for the payout-failure question Archer Hume used; the fifth option is his
# "Bad weather caused it". Under independent scoring the log-odds between two existing options cannot change.
S4 = {'bank': D('0.9'), 'provider': D('1.4'), 'customer': D('0.6'), 'unknown': D('0.3')}
S5 = dict(S4, weather=D('-0.4'))


def softmax(s):
    m = {k: math.exp(float(v)) for k, v in s.items()}
    z = sum(m.values())
    return {k: v / z for k, v in m.items()}


p4, p5 = softmax(S4), softmax(S5)
lo = lambda p: math.log(p['customer'] / p['unknown'])
assert abs(lo(p4) - lo(p5)) < 1e-12 and abs(lo(p4) - 0.3) < 1e-12
out['iia'] = {'scores4': {k: float(v) for k, v in S4.items()}, 'scores5': {k: float(v) for k, v in S5.items()},
              'p4': {k: round(v, 3) for k, v in p4.items()}, 'p5': {k: round(v, 3) for k, v in p5.items()},
              'logodds_toy': 0.3,
              # measured on Jev 1.13.0, ten randomised blocks, pooled (Archer Hume, 17 September 2026, Figure 4)
              'jev_measured': {'before': 0.38, 'after': 0.11, 'mean_change': -0.28, 'ci': [-0.36, -0.19], 'blocks': 10}}
out['passes'] = {'three_class': 3, 'max_options': 255}

# ---- Responses: the numbers the page quotes from them ----
out['btzsc'] = {'n_per_dataset': 100, 'emotion_ece_jev': 0.351, 'emotion_ece_gliner': 0.117, 'emotion_zero_p_true': 16,
                'agnews_acc': [0.910, 0.700], 'banking_acc': [0.870, 0.610]}
out['enterprise'] = {'at_one': 581, 'of': 1000, 'right_at_one': 90.2, 'issue_acc': [46.6, 61.2], 'product_acc': [75.9, 78.8, 73.9]}

json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w', encoding='utf-8'), indent=1)
print('recompute.json written: Jev choice %.2f%% (%s per run, SE %.2f pp), noul %.2f%%; RLCR %s; expected at p=0.7 %s'
      % (runs['choice']['acc'], runs['choice']['cost'], runs['choice']['se_pp'], runs['noul']['acc'], out['rlcr'], out['rlcr_expected']))
