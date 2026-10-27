"""Replay the paper's released per-task success counts (42 cells x 2 arms x 128 rollouts) into every number the
page shows, and into the compact data the page replays in the browser.

  python3 mk_data.py            (build.sh runs it; needs numpy, which the repo's .venv has)

Input : inputs/outcomes_42cells.csv.gz, the authors' released counts (github.com/changdaeoh/sharpening-tax,
        commit 789ae06c, data/outcomes_42cells.csv.gz, sha256 116b5dae...0ee3; CC BY-NC 4.0).
Output: inputs/replay.json (per cell: pass@k and pass^k curves, A, S, both taxes, task categories, task movement,
        crossover, the paired task bootstrap CI of the coverage gap; plus the Figure 7 split check)
        parts/_gen_cells.js (window.CELLS: per cell, the two arms' counts as two base-36 characters per task).
Estimators: the unbiased pass@k and pass^k of Chen et al. (2021) in the cumulative-product form of the paper's
Appendix A.4; A(K) = sum_{k<K}(pass@K - pass@k), S(K) = A / ((K-1)(1 - pass@1)) (Eqs. 1 and 2).
"""
import csv, gzip, hashlib, json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'inputs', 'outcomes_42cells.csv.gz')
SHA = '116b5daebb249857db9e8b0147bef25f1db944423a30b65da30003b9a5aa0ee3'
assert hashlib.sha256(open(SRC, 'rb').read()).hexdigest() == SHA, 'outcomes file changed'

BENCH = [('bfcl', 'BFCLv4 MT'), ('webshop', 'WebShop'), ('acebench', 'ACEBench')]
PAIRS = ['gemma-4-E4B', 'gemma-4-12B', 'gemma-4-26B-A4B', 'gemma-4-31B', 'Ministral-3-3B', 'Ministral-3-8B', 'Ministral-3-14B',
         'Qwen2.5-3B', 'Qwen2.5-7B', 'Qwen2.5-14B', 'Qwen2.5-32B', 'Qwen3.5-4B', 'Qwen3.5-9B', 'Qwen3.5-35B-A3B']
K = 128

cells = {}
with gzip.open(SRC, 'rt', newline='') as f:
    for r in csv.DictReader(f):
        cells.setdefault((r['benchmark'], r['pair'], r['arm']), {})[r['task_id']] = (int(r['c']), int(r['n']))


def passk(c, n, K):
    """[T, K] unbiased pass@k, k = 1..K: 1 - prod_{j<k} (n-c-j)/(n-j)."""
    c, n, j = c[:, None].astype(float), n[:, None].astype(float), np.arange(K)
    return 1.0 - np.cumprod(np.clip(n - c - j, 0, None) / (n - j), axis=1)


def passhat(c, n, K):
    c, n, j = c[:, None].astype(float), n[:, None].astype(float), np.arange(K)
    return np.cumprod(np.clip(c - j, 0, None) / (n - j), axis=1)


def AS(curve, K):
    A = float(np.sum(curve[K - 1] - curve[:K - 1]))
    return A, A / ((K - 1) * (1 - curve[0]))


def spearman(x, y):
    rk = lambda v: np.argsort(np.argsort(v, kind='mergesort'), kind='mergesort').astype(float)
    a, b = rk(np.asarray(x)), rk(np.asarray(y))
    a -= a.mean(); b -= b.mean()
    return float((a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum()))


out, js = [], []
KS = [1, 2, 4, 8, 16, 32, 64, 128]
for bk, bname in BENCH:
    for p in PAIRS:
        B, P = cells[(bk, p, 'base')], cells[(bk, p, 'rl')]
        tasks = sorted(set(B) & set(P))
        assert len(tasks) == len(B) == len(P)
        cb = np.array([B[t][0] for t in tasks]); nb = np.array([B[t][1] for t in tasks])
        cp = np.array([P[t][0] for t in tasks]); npp = np.array([P[t][1] for t in tasks])
        MB, MP = passk(cb, nb, K), passk(cp, npp, K)
        covB, covP = MB.mean(0), MP.mean(0)
        conB, conP = passhat(cb, nb, K).mean(0), passhat(cp, npp, K).mean(0)
        AB, SB = AS(covB, K); AP, SP = AS(covP, K)
        # paired task bootstrap of the coverage gap at K (the paper's A.4: 1,000 resamples, one draw for both arms)
        rng = np.random.default_rng(0)
        T = len(tasks)
        W = np.stack([np.bincount(rng.integers(0, T, T), minlength=T) for _ in range(1000)]) / T
        gap = W @ MB[:, K - 1] - W @ MP[:, K - 1]
        lo, hi = np.percentile(gap, [2.5, 97.5])
        # crossover: the first k at which base coverage reaches post-trained coverage after trailing at k = 1
        cross = None
        if covB[0] < covP[0]:
            for k in range(K):
                if covB[k] >= covP[k]:
                    cross = k + 1
                    break
        cat = lambda c, n: [round(100 * float(np.mean(c == n)), 1), round(100 * float(np.mean((c > 0) & (c < n))), 1), round(100 * float(np.mean(c == 0)), 1)]
        lost = (cb > 0) & (cp == 0); gained = (cb == 0) & (cp > 0); both = (cb > 0) & (cp > 0)
        # Table 8: Tax_A(128) split into retry value on lost tasks, on gained tasks, and shape on tasks both solve
        aB = (MB[:, K - 1:K] - MB[:, :K - 1]).sum(1); aP = (MP[:, K - 1:K] - MP[:, :K - 1]).sum(1)
        out.append({'bench': bname, 'bk': bk, 'pair': p, 'T': T,
                    'covB': [round(float(covB[k - 1]), 5) for k in KS], 'covP': [round(float(covP[k - 1]), 5) for k in KS],
                    'conB': [round(float(conB[k - 1]), 5) for k in KS], 'conP': [round(float(conP[k - 1]), 5) for k in KS],
                    'p1B': float(covB[0]), 'p1P': float(covP[0]), 'CB': float(covB[K - 1]), 'CP': float(covP[K - 1]),
                    'mB': float(covB.mean()), 'mP': float(covP.mean()), 'AB': AB, 'AP': AP, 'SB': SB, 'SP': SP,
                    'taxA': AB - AP, 'taxS': SB - SP, 'dC': float(covB[K - 1] - covP[K - 1]), 'lo': float(lo), 'hi': float(hi),
                    'taxS8': AS(covB, 8)[1] - AS(covP, 8)[1], 'taxS32': AS(covB, 32)[1] - AS(covP, 32)[1],
                    'cross': cross, 'catB': cat(cb, nb), 'catP': cat(cp, npp),
                    'mov': [round(100 * float(x.mean()), 1) for x in (lost, gained, both, ~(lost | gained | both))],
                    'contrib': [float(aB[lost].sum() / T - aP[lost].sum() / T), float(aB[gained].sum() / T - aP[gained].sum() / T), float(aB[both].sum() / T - aP[both].sum() / T)]})
        enc = lambda c: ''.join(np.base_repr(int(v), 36).rjust(2, '0') for v in c)
        js.append('["%s","%s",%d,"%s","%s"]' % (bk, p, T, enc(cb), enc(cp)))

# Appendix C.1 (Figure 11): mean pass@k over the 12 largest-backbone and the 12 smallest-backbone combinations, and where they cross
full = {}
for bk, _ in BENCH:
    for p in PAIRS:
        cb, nb = np.array([v[0] for v in cells[(bk, p, 'base')].values()]), np.array([v[1] for v in cells[(bk, p, 'base')].values()])
        cp, npp = np.array([v[0] for v in cells[(bk, p, 'rl')].values()]), np.array([v[1] for v in cells[(bk, p, 'rl')].values()])
        full[(bk, p)] = (passk(cb, nb, K).mean(0), passk(cp, npp, K).mean(0))
agg = {}
for name, group in (('largest', ['gemma-4-31B', 'Ministral-3-14B', 'Qwen2.5-32B', 'Qwen3.5-35B-A3B']), ('smallest', ['gemma-4-E4B', 'Ministral-3-3B', 'Qwen2.5-3B', 'Qwen3.5-4B'])):
    mb = np.mean([full[(bk, p)][0] for bk, _ in BENCH for p in group], 0); mp = np.mean([full[(bk, p)][1] for bk, _ in BENCH for p in group], 0)
    cr = next((k + 1 for k in range(K) if mb[k] >= mp[k]), None)
    agg[name] = {'pairs': group, 'cross': cr, 'covB': [round(float(mb[k - 1]), 5) for k in KS], 'covP': [round(float(mp[k - 1]), 5) for k in KS]}

# Figure 7 (left): TaxS(8) from 8 rollouts on half the tasks against TaxS(32) on the held-out half, Spearman over the 42 cells.
# The paper does not say how the 8 rollouts were chosen; here they are a random subset (hypergeometric on the counts), 200 random splits.
rng = np.random.default_rng(7)
rhos, rhos_c = [], []
cache = {}
for (bk, p, arm), d in cells.items():
    t = sorted(d)
    cache[(bk, p, arm)] = (np.array([d[x][0] for x in t]), np.array([d[x][1] for x in t]))
for rep in range(200):
    e8, v32, cons = [], [], []
    for bk, _ in BENCH:
        for p in PAIRS:
            cb, nb = cache[(bk, p, 'base')]; cp, npp = cache[(bk, p, 'rl')]
            T = len(cb); idx = rng.permutation(T); h1, h2 = idx[:T // 2], idx[T // 2:]
            s8b = rng.hypergeometric(cb[h1], nb[h1] - cb[h1], 8); s8p = rng.hypergeometric(cp[h1], npp[h1] - cp[h1], 8)
            eB = AS(passk(s8b, np.full(len(h1), 8), 8).mean(0), 8)[1]; eP = AS(passk(s8p, np.full(len(h1), 8), 8).mean(0), 8)[1]
            vB = AS(passk(cb[h2], nb[h2], 32).mean(0), 32)[1]; vP = AS(passk(cp[h2], npp[h2], 32).mean(0), 32)[1]
            e8.append(eB - eP); v32.append(vB - vP)
    rhos.append(spearman(e8, v32))
rhos = np.array(rhos)
fig7 = {'rho_mean': float(rhos.mean()), 'rho_p5': float(np.percentile(rhos, 5)), 'rho_p95': float(np.percentile(rhos, 95)), 'splits': 200,
        'full_data_rho': spearman([c['taxS8'] for c in out], [c['taxS32'] for c in out])}

json.dump({'source': {'repo': 'https://github.com/changdaeoh/sharpening-tax', 'commit': '789ae06c82728dc40f4f80e855d0f972eff1e5c6', 'file': 'data/outcomes_42cells.csv.gz', 'sha256': SHA, 'licence': 'CC BY-NC 4.0'},
           'KS': KS, 'cells': out, 'fig7': fig7, 'agg': agg}, open(os.path.join(HERE, 'inputs', 'replay.json'), 'w'), indent=0)
open(os.path.join(HERE, 'parts', '_gen_cells.js'), 'w').write(
    '// Generated by mk_data.py from inputs/outcomes_42cells.csv.gz (the authors\' released counts); do not edit by hand.\n'
    '// One row per cell: [benchmark, pair, tasks, base counts, post-trained counts], each count c (successes of 128) as two base-36 digits, tasks in task_id order.\n'
    'window.CELLS=[\n' + ',\n'.join(js) + '];\n')
print('replay.json: 42 cells; Figure 7 split check rho mean %.3f (5-95%%: %.3f to %.3f); bytes of _gen_cells.js: %d'
      % (fig7['rho_mean'], fig7['rho_p5'], fig7['rho_p95'], os.path.getsize(os.path.join(HERE, 'parts', '_gen_cells.js'))))
