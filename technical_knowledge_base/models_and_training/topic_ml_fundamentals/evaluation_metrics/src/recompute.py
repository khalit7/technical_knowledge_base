# Every number the page shows by default, recomputed independently in Python from the same shipped data
# (parts/30_js_data.js), to inputs/recompute.json. check_core.mjs compares the page's JavaScript with it.
# Run from src/:  uv run --with scikit-learn --with numpy python recompute.py
import json, math
import numpy as np
from sklearn import metrics as M

js = open('parts/30_js_data.js').read()
EM = json.loads(js[js.index('=') + 1:].rstrip().rstrip(';'))
S = EM['sst2']
y_all = np.array([int(c) for c in S['y']])
P = {k: 1 / (1 + np.exp(-np.array(v) / 1000)) for k, v in S['logit'].items()}
rare_idx, k = [], 0
for i, c in enumerate(S['y']):
    if c == '1':
        if k % 10 == 0: rare_idx.append(i)
        k += 1
    else:
        rare_idx.append(i)
rare_idx = np.array(rare_idx)

def ece(y, p, nb=10):
    b = np.minimum(nb - 1, np.floor(p * nb).astype(int)); e = 0
    for j in range(nb):
        m = b == j
        if m.any(): e += m.sum() / len(y) * abs(p[m].mean() - y[m].mean())
    return e

out = {'sst2': {}}
for subset, idx in [('all', np.arange(len(y_all))), ('rare', rare_idx)]:
    y = y_all[idx]; out['sst2'][subset] = {'n': int(len(y)), 'pos': int(y.sum())}
    for m, p in P.items():
        p = p[idx]; yh = (p >= 0.5).astype(int)
        tn, fp, fn, tp = M.confusion_matrix(y, yh, labels=[0, 1]).ravel()
        out['sst2'][subset][m] = dict(tp=int(tp), fp=int(fp), tn=int(tn), fn=int(fn), acc=M.accuracy_score(y, yh), prec=M.precision_score(y, yh, zero_division=0),
            rec=M.recall_score(y, yh), f1=M.f1_score(y, yh), mcc=M.matthews_corrcoef(y, yh), spec=tn / (tn + fp), bacc=M.balanced_accuracy_score(y, yh),
            auc=M.roc_auc_score(y, p), ap=M.average_precision_score(y, p), brier=M.brier_score_loss(y, p),
            logloss=M.log_loss(y, np.clip(p, 1e-15, 1 - 1e-15)), ece=ece(y, p))
    # the always-negative and always-positive baselines on this subset
    out['sst2'][subset]['always_neg_acc'] = float((y == 0).mean())

# Glass: averages from the shipped confusion matrix, rebuilt into label vectors so scikit-learn computes them
cm = np.array(EM['glass']['cm']); yt, yp = [], []
for i in range(len(cm)):
    for j in range(len(cm)):
        yt += [i] * cm[i, j]; yp += [j] * cm[i, j]
out['glass'] = {a: {'p': M.precision_score(yt, yp, average=a, zero_division=0), 'r': M.recall_score(yt, yp, average=a, zero_division=0),
                    'f': M.f1_score(yt, yp, average=a, zero_division=0)} for a in ['macro', 'micro', 'weighted']}
out['glass']['acc'] = M.accuracy_score(yt, yp)
out['glass']['per_class_f1'] = M.f1_score(yt, yp, average=None, zero_division=0).tolist()

# Perplexity table: per-token perplexity, bits per byte, per-word perplexity, from the shipped log-probabilities
out['ppl'] = {}
for mk, m in EM['ppl']['models'].items():
    for tk, sc in m['scores'].items():
        nll = -sum(sc['lp']); T = EM['ppl']['texts'][tk]
        out['ppl'][mk + '/' + tk] = {'n': len(sc['lp']), 'ppl_token': math.exp(nll / len(sc['lp'])), 'bpb': nll / math.log(2) / T['bytes'],
                                     'ppl_word': math.exp(nll / T['words']), 'bits': nll / math.log(2)}

# Accuracy standard errors and a numpy bootstrap for the bootstrap section (the page's own resampler is seeded differently,
# so its interval is compared with this one to a tolerance, and the normal-approximation interval exactly)
rs = np.random.default_rng(0); out['boot'] = {}
perm = np.array(S['perm'])
for n in [100, 300, 872]:
    idx = perm[:n]; y = y_all[idx]
    a = (P['lr'][idx] >= .5) == y; b = (P['nb'][idx] >= .5) == y
    d = b.astype(float) - a.astype(float)
    bs = [d[rs.integers(0, n, n)].mean() for _ in range(4000)]
    out['boot'][n] = {'acc_lr': a.mean(), 'acc_nb': b.mean(), 'diff': d.mean(), 'se_lr': math.sqrt(a.mean() * (1 - a.mean()) / n),
                      'diff_ci': [float(np.quantile(bs, .025)), float(np.quantile(bs, .975))], 'diff_se_paired': d.std(ddof=0) / math.sqrt(n)}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
for s in ['all', 'rare']:
    for m in ['lr', 'nb', 'nbc']:
        print(s, m, {k: round(v, 4) if isinstance(v, float) else v for k, v in out['sst2'][s][m].items()})
print('glass', out['glass'])
for k, v in out['ppl'].items(): print(k, {a: round(b, 3) for a, b in v.items()})
print('boot', json.dumps(out['boot'], indent=0))

# Numbers quoted in the Reading prose
y = y_all[rare_idx]; p = P['lr'][rare_idx]; best = max(((M.matthews_corrcoef(y, (p >= t).astype(int)), t) for t in np.unique(p)))
yh = (p >= best[1]).astype(int)
nbb = np.minimum(9, np.floor(P['nb'] * 10).astype(int))
prose = {'rare_lr_best_mcc': best[0], 'rare_lr_best_t': best[1], 'rare_lr_best_acc': M.accuracy_score(y, yh), 'rare_lr_best_recall': M.recall_score(y, yh),
         'always_neg_rare_acc': float((y == 0).mean()),
         'nb_top_bin': {'n': int((nbb == 9).sum()), 'conf': float(P['nb'][nbb == 9].mean()), 'frac': float(y_all[nbb == 9].mean())},
         'nb_bottom_bin': {'n': int((nbb == 0).sum()), 'conf': float(P['nb'][nbb == 0].mean()), 'frac': float(y_all[nbb == 0].mean())},
         'se_acc_80_872_points': 100 * math.sqrt(.8 * .2 / 872)}
out['prose'] = prose; json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
print('prose', prose)
