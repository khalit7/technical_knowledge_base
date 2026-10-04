"""Every closed-form number the page prints, recomputed (stdlib only).
Run from src/: python3 recompute.py  -> inputs/recompute.json
The page's JavaScript (parts/21_js_engine.js) is checked against this file by check_engine.mjs.
"""
import json, math

out = {}

def grpo(r, ddof=0):
    G = len(r); m = sum(r) / G
    sd = math.sqrt(sum((x - m) ** 2 for x in r) / (G - ddof))
    return m, sd, [((x - m) / sd if sd > 0 else 0.0) for x in r]

def rloo(r):
    G = len(r); s = sum(r)
    return [x - (s - x) / (G - 1) for x in r]

# Worked example: one group of four (old page)
m, sd, A = grpo([1, 0, 0, 0])
out['ex4'] = dict(mean=m, var=sd ** 2, std=sd, A_pos=A[0], A_neg=A[1], sumA=sum(A))
# clip on one token, rho = 1.3, eps = 0.2
eps = 0.2; rho = 1.3
out['clip_pos'] = dict(unclipped=rho * A[0], clipped=(1 + eps) * A[0], taken=min(rho * A[0], (1 + eps) * A[0]))
out['clip_neg'] = dict(unclipped=rho * A[1], clipped=(1 + eps) * A[1], taken=min(rho * A[1], (1 + eps) * A[1]))
# k3 at x = 0.5
x = 0.5
out['k3_half'] = x - math.log(x) - 1
# Dr. GRPO length bias: per-token weight of a wrong answer of 100 and 1,000 tokens
out['len_bias'] = dict(w100=A[1] / 100, w1000=A[1] / 1000)
# difficulty bias: 1 of 16 against 8 of 16
m1, sd1, A1 = grpo([1] + [0] * 15)
m8, sd8, A8 = grpo([1] * 8 + [0] * 8)
out['diff_bias'] = dict(mean1=m1, std1=sd1, A1=A1[0], std8=sd8, A8=A8[0], ratio=A1[0] / A8[0])
# Dr. GRPO advantages for the same groups (no std division)
out['drgrpo'] = dict(A1=1 - m1, A8=1 - m8, ex4_pos=1 - 0.25, ex4_neg=-0.25)
# RLOO: baseline = mean of the others; equals G/(G-1) times the mean-centred reward
R = rloo([1, 0, 0, 0])
out['rloo_ex4'] = dict(pos=R[0], neg=R[1], factor=4 / 3)
# std with G-1 (sample) instead of G
_, sds, As = grpo([1, 0, 0, 0], ddof=1)
out['ex4_sample_std'] = dict(std=sds, A_pos=As[0], A_neg=As[1])
# DAPO clip-higher: a token at p = 0.01 can rise to p (1 + eps) in one update
out['cliphigh'] = dict(sym=0.01 * 1.2, high=0.01 * 1.28, p09_cap=min(1.0, 0.9 * 1.2))
# DAPO soft overlong punishment, L_max = 16,384, L_cache = 4,096
def overlong(y, Lmax=16384, Lc=4096):
    if y <= Lmax - Lc: return 0.0
    if y <= Lmax: return ((Lmax - Lc) - y) / Lc
    return -1.0
out['overlong'] = {str(y): overlong(y) for y in (12288, 14336, 16384, 16385)}
# GSPO: sequence ratio of a 3-token response with token ratios 1.1, 0.9, 1.0
ml = (math.log(1.1) + math.log(0.9) + math.log(1.0)) / 3
out['gspo3'] = dict(mean_log=ml, s=math.exp(ml))
# TIS: w = min(pi_train / pi_rollout, C), C = 2
out['tis'] = dict(a=min(0.25 / 0.20, 2), b_raw=0.25 / 0.05, b=min(0.25 / 0.05, 2))
# InstructGPT RL compute share: 60 of 3,640 petaflop/s-days
out['igpt_share'] = 60 / 3640
# R1 post-training bill: 147K H800 GPU-hours at $2 per hour
out['r1_cost'] = 147e3 * 2
# R1-Zero length growth 500 -> 14,200 tokens
out['r1z_len_x'] = 14200 / 500
# Cognition SWE-2: 53 against 127 steps
out['swe2_turns'] = 1 - 53 / 127
# Mercor: 16.11% -> 27.29% Pass@1
out['mercor_rel'] = 27.29 / 16.11 - 1
# DAPO: 50 of DeepSeek's steps = 50%; CISPO matches DAPO in 50% of the steps (2x)

# ---- the page's toys, recomputed independently of the JavaScript ----
def rare_token(p0, mode, eta, steps, A=1.0):
    z = math.log(p0 / (1 - p0)); ehi = 0.2 if mode == 'ppo' else 0.28; elo = 0.2; out = []
    for k in range(steps + 1):
        p = 1 / (1 + math.exp(-z)); r = p / p0
        if mode == 'none': w = r
        elif mode == 'cispo': w = min(r, 1 + ehi)
        else: w = r if ((r < 1 + ehi) if A > 0 else (r > 1 - elo)) else 0.0
        out.append(dict(p=p, w=w))
        if k == steps: break
        z += eta * A * w * (1 - p)
    return out
out['rare'] = {m: dict(p=rare_token(0.01, m, 0.05, 16)[-1]['p'], active=sum(1 for x in rare_token(0.01, m, 0.05, 16)[:16] if x['w'] != 0)) for m in ('ppo', 'dapo', 'cispo', 'none')}
def pk_problems(): return [0 if i < 8 else min(0.9, 0.004 * 1.17 ** (i - 7)) for i in range(40)]
def sharpen(p): return 1 - (1 - p) * 0.15 if p > 0.15 else p * 0.3
def expand(p, i): return (0.03 if i % 4 == 0 else 0) if p == 0 else sharpen(p)
def curve(P, ks): return [sum(1 - (1 - p) ** k for p in P) / len(P) for k in ks]
B = pk_problems()
out['passk'] = dict(base=curve(B, [1, 1024]), sharp=curve([sharpen(p) for p in B], [1, 1024]), expand=curve([expand(p, i) for i, p in enumerate(B)], [1, 1024]))
def gae(r, V, gamma, lam):
    A = [0.0] * len(r); g = 0.0
    for t in range(len(r) - 1, -1, -1):
        vn = V[t + 1] if t + 1 < len(r) else 0.0; d = r[t] + gamma * vn - V[t]; g = d + gamma * lam * g; A[t] = g
    return A
out['gae_toy'] = dict(lam1=gae([0, 0, 0, 1.0], [0.2, 0.4, 0.5, 0.7], 1, 1), lam095=gae([0, 0, 0, 1.0], [0.2, 0.4, 0.5, 0.7], 1, 0.95))
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
for k, v in out.items(): print(k, v)
