"""Model collapse on a categorical distribution (the discrete case Shumailov et al. analyse).
A "model" is a probability for each of V word types. Generation 0 is a Zipf distribution (the shape of word
frequencies). Each generation draws n samples from the current model and refits by counting (maximum likelihood).
Workflows (Gerstgrasser et al. 2024; Kazdan et al. 2024):
  replace     fit on this generation's n synthetic samples only
  accumulate  fit on the n real samples plus every synthetic batch so far
  subsample   accumulate the pool, but fit on n samples drawn (with replacement) from the pool: fixed compute
  fresh       fit on n samples of which a fraction pi are fresh real samples, the rest synthetic
The page's JavaScript (parts/32_sy_col.js) runs the same algorithm with the same PRNG (mulberry32); check_collapse.mjs
asserts that both give identical numbers for the defaults. Usage: python3 collapse_categorical.py > ../data/collapse_ref.json
"""
import json, math, sys

def mulberry32(a):
    a &= 0xFFFFFFFF
    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r

def zipf(V, s):
    w = [1 / (k ** s) for k in range(1, V + 1)]; z = sum(w)
    return [x / z for x in w]

def draw(p, n, rnd):
    """n samples from probabilities p by inverse CDF (binary search); returns counts."""
    cdf = []; c = 0.0
    for x in p: c += x; cdf.append(c)
    cnt = [0] * len(p); last = len(p) - 1
    for _ in range(n):
        u = rnd() * c; lo, hi = 0, last
        while lo < hi:
            m = (lo + hi) >> 1
            if cdf[m] > u: hi = m
            else: lo = m + 1
        cnt[lo] += 1
    return cnt

def norm(c):
    s = sum(c); return [x / s for x in c]

def metrics(p, p0):
    alive = sum(1 for x in p if x > 0)
    tail = sum(p[k] for k in range(100, len(p)))  # mass on types ranked 101 and below in the real distribution
    tv = 0.5 * sum(abs(a - b) for a, b in zip(p, p0))
    ent = -sum(x * math.log2(x) for x in p if x > 0)
    return dict(alive=alive, tail=round(tail, 6), tv=round(tv, 6), ent=round(ent, 6))

def run(mode, V=1000, s=1.1, n=2000, G=30, pi=0.1, seed=1):
    rnd = mulberry32(seed); p0 = zipf(V, s)
    real = draw(p0, n, rnd)          # the real data every workflow starts from
    pool = real[:]; p = norm(real); out = [metrics(p, p0)]
    for g in range(1, G + 1):
        syn = draw(p, n, rnd)
        if mode == 'replace': fit = syn
        elif mode == 'accumulate':
            pool = [a + b for a, b in zip(pool, syn)]; fit = pool
        elif mode == 'subsample':
            pool = [a + b for a, b in zip(pool, syn)]; fit = draw(norm(pool), n, rnd)
        elif mode == 'fresh':
            k = round(pi * n); fr = draw(p0, k, rnd); sy = draw(p, n - k, rnd)
            fit = [a + b for a, b in zip(fr, sy)]
        p = norm(fit); out.append(metrics(p, p0))
    return out

if __name__ == '__main__':
    V, s, n, G = 1000, 1.1, 2000, 30
    p0 = zipf(V, s)
    # expected number of types seen at least once in n draws: sum_k 1-(1-p_k)^n
    exp_alive = sum(1 - (1 - x) ** n for x in p0)
    runs = {m: run(m, V, s, n, G) for m in ('replace', 'accumulate', 'subsample', 'fresh')}
    # median over 50 seeds of types alive at generation G, per mode (seed spread)
    spread = {}
    for m in ('replace', 'accumulate', 'subsample', 'fresh'):
        a = sorted(run(m, V, s, n, G, seed=k)[-1]['alive'] for k in range(1, 51))
        spread[m] = dict(min=a[0], median=(a[24] + a[25]) / 2, max=a[-1])
    json.dump(dict(params=dict(V=V, s=s, n=n, G=G, pi=0.1, seed=1), expected_alive_gen0=round(exp_alive, 2),
                   runs=runs, alive_at_G_50_seeds=spread), sys.stdout, indent=0)
