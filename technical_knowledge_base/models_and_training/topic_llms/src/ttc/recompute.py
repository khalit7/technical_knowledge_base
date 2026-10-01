"""Recompute every default the "Deeper: test-time compute" tab reproduces (parts/34_tab_ttc.html, parts/34_js_ttc*.js).
Run from src/ttc/: python3 recompute.py. Pure standard library; reads no files. inputs/ holds the fetched sources the figures were read from."""
from math import comb, log, sqrt, exp, factorial
from itertools import product

def passk(p, k): return 1 - (1 - p) ** k
def chen(n, c, k): return 1 - comb(n - c, k) / comb(n, k) if n - c >= k else 1.0
def maj2(p, n):  # one correct answer against one wrong answer, n odd
    return sum(comb(n, j) * p**j * (1 - p)**(n - j) for j in range(n // 2 + 1, n + 1))
def plurality(p, n, m):
    """Exact: correct answer prob p, m wrong answers each (1-p)/m; ties broken uniformly at random."""
    q = (1 - p) / m; tot = 0.0
    for c in range(n + 1):
        pc = comb(n, c) * p**c * (1 - p)**(n - c)
        r = n - c
        # distribute r wrong samples over m answers uniformly (multinomial), count how many reach c
        f = {(0, 0): 1.0}
        for _ in range(m):
            g = {}
            for (s, t), v in f.items():
                for k in range(0, min(c, r - s) + 1) if c > 0 else range(0, r - s + 1):
                    if c > 0 and k > c: continue
                    key = (s + k, t + (1 if k == c else 0))
                    g[key] = g.get(key, 0) + v / factorial(k)
            f = g
        for (s, t), v in f.items():
            if s != r: continue
            if c == 0: continue  # correct answer absent: vote wrong
            tot += pc * (v * factorial(r) / m**r) / (1 + t)
    return tot
def kl_bon(n): return log(n) - (n - 1) / n
def r_bon(n, a, b): d = sqrt(kl_bon(n)); return d * (a - b * d)

print('pass@k p=0.2:', [round(passk(0.2, k), 4) for k in (1, 5, 10)])
print('Chen n=10 c=2 k=5:', comb(8, 5), comb(10, 5), round(chen(10, 2, 5), 4))
print('majority 2-answer p=0.6 n=5:', round(maj2(0.6, 5), 5), ' p=0.4:', round(maj2(0.4, 5), 5))
print('  terms p=.6:', round(10*.6**3*.4**2,4), round(5*.6**4*.4,4), round(.6**5,4))
print('plurality p=0.4 m=4: n=5', round(plurality(0.4, 5, 4), 4), ' n=15', round(plurality(0.4, 15, 4), 4))
print('plurality check m=1 equals maj2 (odd n):', round(plurality(0.6, 5, 1), 5))
print('plurality p=0.6 m=4 n=5:', round(plurality(0.6, 5, 4), 4))
# brute force check of plurality for small n
def brute(p, n, m):
    probs = [p] + [(1 - p) / m] * m; tot = 0
    for seq in product(range(m + 1), repeat=n):
        pr = 1
        for x in seq: pr *= probs[x]
        cnt = [seq.count(a) for a in range(m + 1)]; mx = max(cnt)
        win = [a for a in range(m + 1) if cnt[a] == mx]
        if 0 in win: tot += pr / len(win)
    return tot
print('brute plurality p=0.4 m=4 n=5:', round(brute(0.4, 5, 4), 4))
print('BoN n=16:', round(kl_bon(16), 4), round(sqrt(kl_bon(16)), 4), round(r_bon(16, 1, .25), 4))
# n at the peak d=2 (KL=4)
lo, hi = 1, 1e6
for _ in range(200):
    mid = (lo + hi) / 2
    if kl_bon(mid) < 4: lo = mid
    else: hi = mid
print('n at KL=4:', round(lo, 2), ' R(4096)=', round(r_bon(4096, 1, .25), 4), ' R(147)=', round(r_bon(147, 1, .25), 4))
# GRPO
r = [1, 0, 0, 0]; mu = sum(r) / 4; sd = sqrt(sum((x - mu)**2 for x in r) / 4)
print('GRPO adv:', round(mu, 3), round(sd, 4), round((1 - mu) / sd, 3), round((0 - mu) / sd, 3))
# share of groups with zero signal: p^G + (1-p)^G
for p in (0.05, 0.5, 0.95):
    print('  zero-signal share G=16 p=%.2f:' % p, round(p**16 + (1 - p)**16, 4), ' G=4:', round(p**4 + (1 - p)**4, 4))
# KV
per = 2 * 60 * 8 * 128 * 2
print('KV per token:', per, per / 1024, 'KiB; 32768 tokens:', per * 32768 / 2**30, 'GiB')
print('serial depth 60x1, 60x10000:', 60, 60 * 10000, ' latency 10000/50 =', 10000 / 50, 's')
# animation: same 10,000-token budget, one chain vs five chains of 2,000
print('anim serial KV 10,000 tokens:', per * 10000 / 2**30, 'GiB; each parallel 2,000:', per * 2000 / 2**30, 'GiB')
print('anim 5-vote p=0.6, 1 wrong answer:', round(maj2(0.6, 5), 4), ' m=4:', round(plurality(0.6, 5, 4), 4), ' verifier pass@5:', round(passk(0.6, 5), 4))
# Brown et al. 2024 coverage law c = exp(a k^b): check the fits against the numbers the text states
B={'SWE-bench Lite, DeepSeek-Coder-V2':(-1.74,-0.21,[(1,.159),(250,.56)]),
   'MATH, Llama-3-8B-Instruct':(-1.33,-0.43,[(100,.829),(10000,.9844)]),
   'CodeContests, Gemma-2B':(-8.54,-0.14,[(1,.0002),(10000,.071)])}
for k,(a,b,pts) in B.items():
    print('Brown',k,[(n,round(exp(a*n**b),4),obs) for n,obs in pts])
# Sampling lab: benchmark p ~ Beta(a, b); mean pass@k = 1 - B(a, b+k)/B(a, b); Brown MATH preset solved from two stated points
from math import lgamma
def passB(a, b, k): return 1 - exp(lgamma(a + b) + lgamma(b + k) - lgamma(b) - lgamma(a + b + k))
print('Beta preset a=0.5239 b=3.786: pass@100', round(passB(.5239, 3.786, 100), 4), ' pass@10000', round(passB(.5239, 3.786, 1e4), 5), ' implied pass@1', round(.5239 / (.5239 + 3.786), 4))
print('power-law slope 1e3..1e4 at a=0.3,b=1.5:', round((log(1 - passB(.3, 1.5, 1e4)) - log(1 - passB(.3, 1.5, 1e3))) / log(10), 4))
