"""Checks for the Estimator lab (parts/32_js_lab_a.js).

1. A line-by-line Python port of the page's engine, run on the same seeds as dump_js.mjs: every number must match the JavaScript exactly
   (same mulberry32 streams, same order of floating-point operations).
2. Independent checks: Figure 4.1's printed values, true values of both random walks by linear solve, the batch fixed points against
   repeated batch presentation with a small step, the lambda-return recursion against equation (12.3), the special cases where
   methods coincide, and the cliff's exact epsilon-greedy returns by linear solve.
3. The book's stated claims tested on the page's full default runs (from js_dump.json).

usage (from src/lab): node dump_js.mjs && uv run --with numpy python check.py
"""
import json, math, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF
fails = []
def ok(cond, what):
    print(('ok   ' if cond else 'FAIL ') + what)
    if not cond: fails.append(what)

# ---------------- port of the engine ----------------
def imul(a, b): return (a * b) & M32
def rng(seed):
    st = [seed & M32]
    def f():
        st[0] = (st[0] + 0x6D2B79F5) & M32
        t = st[0]
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return f
def hs(seed, a, b): return (seed * 7919 + a * 104729 + b * 15485863 + 13) % 2**32

GA = [(-1, 0), (1, 0), (0, 1), (0, -1)]
def gw_next(s, a):
    r, c = s // 4, s % 4; nr, nc = r + GA[a][0], c + GA[a][1]
    return s if (nr < 0 or nr > 3 or nc < 0 or nc > 3) else nr * 4 + nc
def gw_term(s): return s == 0 or s == 15
def gw_eval(V, pi):
    W = V[:]
    for s in range(1, 15):
        v = 0
        for a in range(4): v += pi[s][a] * (-1 + V[gw_next(s, a)])
        W[s] = v
    return W
def gw_vi(V):
    W = V[:]
    for s in range(1, 15):
        m = -math.inf
        for a in range(4):
            q = -1 + V[gw_next(s, a)]
            if q > m: m = q
        W[s] = m
    return W
def gw_greedy(V, tol=1e-9):
    out = []
    for s in range(16):
        if gw_term(s): out.append([]); continue
        q = [-1 + V[gw_next(s, a)] for a in range(4)]; m = max(q)
        out.append([a for a in range(4) if q[a] >= m - tol])
    return out
RPI = [[0.25] * 4 for _ in range(16)]
class GwMethod:
    def __init__(self, kind, seed=1, alpha=0.1):
        self.kind = kind; self.V = [0.0] * 16; self.done = False; self.al = alpha
        self.pi = RPI; self.mode = 'eval'
        if kind in ('td', 'mc'):
            self.r = rng(hs(seed, 11, 0)); self.sum = [0] * 16; self.cnt = [0] * 16; self.s = -1; self.ep = []
    def step(self):
        k = self.kind
        if k in ('eval', 'vi', 'pi') and self.done: return
        if k == 'eval' or (k == 'pi' and self.mode == 'eval'):
            W = gw_eval(self.V, self.pi if k == 'pi' else RPI)
            d = max(abs(W[s] - self.V[s]) for s in range(16)); self.V = W
            if d < 1e-4:
                if k == 'eval': self.done = True
                else: self.mode = 'improve'
        elif k == 'vi':
            W = gw_vi(self.V); d = max(abs(W[s] - self.V[s]) for s in range(16)); self.V = W
            if d < 1e-4: self.done = True
        elif k == 'pi':
            g = gw_greedy(self.V); np_ = []; same = True
            for s in range(16):
                row = [0, 0, 0, 0]
                cur = self.pi[s].index(1) if 1 in self.pi[s] else -1
                if not gw_term(s): row[cur if cur >= 0 and cur in g[s] else g[s][0]] = 1
                else: row = [0.25] * 4
                np_.append(row)
                if row != self.pi[s]: same = False
            if same: self.done = True
            else: self.pi = np_; self.mode = 'eval'
        else:
            r = self.r
            for _ in range(56):
                if self.s < 0: self.s = 1 + int(r() * 14); self.ep = []
                s = self.s; a = int(r() * 4); s2 = gw_next(s, a)
                if k == 'td': self.V[s] += self.al * (-1 + self.V[s2] - self.V[s])
                else: self.ep.append(s)
                self.s = s2
                if gw_term(s2):
                    if k == 'mc':
                        ep = self.ep; T = len(ep); first = [-1] * 16
                        for t in range(T):
                            if first[ep[t]] < 0: first[ep[t]] = t
                        for t in range(T - 1, -1, -1):
                            if first[ep[t]] == t:
                                q = ep[t]; self.sum[q] += -(T - t); self.cnt[q] += 1; self.V[q] = self.sum[q] / self.cnt[q]
                    self.s = -1

def walk(r, n):
    s = (n + 1) // 2; S = [s]
    while 0 < s < n + 1:
        s += -1 if r() < 0.5 else 1; S.append(s)
    return S
TV5 = [0, 1/6, 2/6, 3/6, 4/6, 5/6, 0]
def rms5(V):
    q = 0
    for i in range(1, 6): d = V[i] - TV5[i]; q += d * d
    return math.sqrt(q / 5)
def td0(V, S, a):
    for t in range(len(S) - 1):
        s, s2 = S[t], S[t + 1]; rw = 1 if s2 == 6 else 0
        V[s] += a * (rw + V[s2] - V[s])
def mcA(V, S, a):
    G = 1 if S[-1] == 6 else 0
    for t in range(len(S) - 1):
        s = S[t]; V[s] += a * (G - V[s])
def batch_state(): return dict(sumG=[0]*7, cnt=[0]*7, n=[0]*7, N=[0]*49, R=[0]*7)
def batch_add(st, S):
    G = 1 if S[-1] == 6 else 0
    for t in range(len(S) - 1):
        s, s2 = S[t], S[t + 1]
        st['sumG'][s] += G; st['cnt'][s] += 1; st['n'][s] += 1; st['N'][s * 7 + s2] += 1
        if s2 == 6: st['R'][s] += 1
def batch_mc(st):
    V = [0, .5, .5, .5, .5, .5, 0]
    for i in range(1, 6):
        if st['cnt'][i] > 0: V[i] = st['sumG'][i] / st['cnt'][i]
    return V
def batch_td(st):
    vis = [i for i in range(1, 6) if st['n'][i] > 0]; m = len(vis)
    A = [[(st['n'][s] if i == j else 0) - st['N'][s * 7 + vis[j]] for j in range(m)] for i, s in enumerate(vis)]
    A = [[float(x) if False else x for x in row] for row in A]
    b = [st['R'][s] for s in vis]
    for k in range(m):
        for i in range(k + 1, m):
            f = A[i][k] / A[k][k]
            if f == 0: continue
            for j in range(k, m): A[i][j] -= f * A[k][j]
            b[i] -= f * b[k]
    x = [0] * m
    for i in range(m - 1, -1, -1):
        s = b[i]
        for j in range(i + 1, m): s -= A[i][j] * x[j]
        x[i] = s / A[i][i]
    V = [0, .5, .5, .5, .5, .5, 0]
    for i in range(m): V[vis[i]] = x[i]
    return V
def walks5(seed, run, E):
    r = rng(hs(seed, 21, run)); return [walk(r, 5) for _ in range(E)]
def rw5_job(cfg):
    E, R, ms = cfg['episodes'], cfg['runs'], cfg['methods']; acc = [[0] * (E + 1) for _ in ms]
    for run in range(R):
        W = walks5(cfg['seed'], run, E)
        for mi, m in enumerate(ms):
            V = [0, .5, .5, .5, .5, .5, 0]; st = batch_state(); acc[mi][0] += rms5(V)
            for e in range(E):
                S = W[e]
                if m['k'] == 'td': td0(V, S, m['a'])
                elif m['k'] == 'mc': mcA(V, S, m['a'])
                else:
                    batch_add(st, S); V = batch_td(st) if m['k'] == 'btd' else batch_mc(st)
                acc[mi][e + 1] += rms5(V)
    return [[v / R for v in a] for a in acc]
def rw5_trace(seed, E, aTD, aMC):
    W = walks5(seed, 0, E); Vt = [0, .5, .5, .5, .5, .5, 0]; Vm = Vt[:]; F = [[Vt[:], Vm[:]]]
    for e in range(E):
        S = W[e]; T = len(S) - 1
        for t in range(T):
            s, s2 = S[t], S[t + 1]; rw = 1 if s2 == 6 else 0
            Vt[s] += aTD * (rw + Vt[s2] - Vt[s])
            if t == T - 1:
                G = 1 if s2 == 6 else 0
                for k in range(T):
                    q = S[k]; Vm[q] += aMC * (G - Vm[q])
            F.append([Vt[:], Vm[:]])
    return F

TV19 = [0] + [(i - 10) / 10 for i in range(1, 20)] + [0]
def rms19(V):
    q = 0
    for i in range(1, 20): d = V[i] - TV19[i]; q += d * d
    r = math.sqrt(q / 19) if q == q else float('nan')
    return r if r == r else math.inf
def walks19(seed, run, E):
    r = rng(hs(seed, 31, run)); return [walk(r, 19) for _ in range(E)]
def R19(S): return 1 if S[-1] == 20 else -1
def nstep(V, S, n, a):
    T = len(S) - 1; RT = R19(S)
    for tau in range(T):
        G = V[S[tau + n]] if tau + n < T else RT; s = S[tau]; V[s] += a * (G - V[s])
def lret(V, S, l, a):
    T = len(S) - 1; RT = R19(S); G = [0] * T; G[T - 1] = RT
    for t in range(T - 2, -1, -1): G[t] = (1 - l) * V[S[t + 1]] + l * G[t + 1]
    for t in range(T):
        s = S[t]; V[s] += a * (G[t] - V[s])
def tdl(V, S, l, a):
    T = len(S) - 1; z = [0] * 21
    for t in range(T):
        s, s2 = S[t], S[t + 1]
        for i in range(1, 20): z[i] *= l
        z[s] += 1
        d = (1 if s2 == 20 else -1 if s2 == 0 else 0) + (0 if s2 in (0, 20) else V[s2]) - V[s]; ad = a * d
        for i in range(1, 20): V[i] += ad * z[i]
FAM = {'nstep': (nstep, [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]), 'lret': (lret, [0, 0.4, 0.8, 0.9, 0.95, 0.975, 0.99, 1]), 'tdl': (tdl, [0, 0.4, 0.8, 0.9, 0.95, 0.975, 0.99, 1])}
def alphas(step):
    A = []; k = 0
    while k * step <= 1 + 1e-12:
        A.append(round_half_up(k * step * 1000) / 1000); k += 1
    return A
def round_half_up(x): return math.floor(x + 0.5)  # JS Math.round
def rw19_job(fam, seed, runs, as_, E=10):
    f, ps = FAM[fam]; W = [walks19(seed, r, E) for r in range(runs)]; out = []
    with np.errstate(all='ignore'):
        for p in ps:
            row = []
            for a in as_:
                acc = 0
                for run in range(runs):
                    V = [0.0] * 21
                    for e in range(E):
                        f(V, W[run][e], p, a); acc += rms19(V)
                row.append(acc / (runs * E))
            out.append(row)
    return out

CW, CS, CG = 12, 36, 47
def cl_step(s, a):
    r, c = s // CW, s % CW; nr, nc = r + GA[a][0], c + GA[a][1]
    if nr < 0 or nr >= 4 or nc < 0 or nc >= CW: nr, nc = r, c
    n = nr * CW + nc
    if nr == 3 and 0 < nc < 11: return CS, -100, False
    return n, -1, n == CG
def cl_cliff(s): return s // CW == 3 and 0 < s % CW < 11
def eps_greedy(Q, s, eps, r):
    if r() < eps: return int(r() * 4)
    b = -math.inf; ties = []
    for a in range(4):
        q = Q[s * 4 + a]
        if q > b: b = q; ties = [a]
        elif q == b: ties.append(a)
    return ties[0] if len(ties) == 1 else ties[int(r() * len(ties))]
def cl_max(Q, s): return max(Q[s * 4:s * 4 + 4])
def cl_exp(Q, s, eps):
    b = -math.inf; nt = 0
    for a in range(4):
        q = Q[s * 4 + a]
        if q > b: b = q; nt = 1
        elif q == b: nt += 1
    e = 0
    for a in range(4):
        q = Q[s * 4 + a]; e += (eps / 4 + ((1 - eps) / nt if q == b else 0)) * q
    return e
ALG = ['sarsa', 'q', 'esarsa']
def cl_run(alg, seed, run, eps, al, E):
    r = rng(hs(seed, 40 + ALG.index(alg), run)); Q = [0] * 192; ret = []
    for e in range(E):
        s = CS; G = 0; n = 0; a = eps_greedy(Q, s, eps, r)
        while True:
            s2, rw, done = cl_step(s, a); G += rw; n += 1
            if done: Q[s * 4 + a] += al * (rw - Q[s * 4 + a]); break
            if alg == 'sarsa':
                a2 = eps_greedy(Q, s2, eps, r); Q[s * 4 + a] += al * (rw + Q[s2 * 4 + a2] - Q[s * 4 + a]); s, a = s2, a2
            else:
                tg = cl_max(Q, s2) if alg == 'q' else cl_exp(Q, s2, eps)
                Q[s * 4 + a] += al * (rw + tg - Q[s * 4 + a]); s = s2; a = eps_greedy(Q, s, eps, r)
            if n >= 100000: break
        ret.append(G)
    return ret, Q
def cl_greedy_len(Q):
    s = CS; L = 0
    for _ in range(60):
        b = -math.inf; ba = 0
        for a in range(4):
            if Q[s * 4 + a] > b: b = Q[s * 4 + a]; ba = a
        s2, rw, done = cl_step(s, ba)
        if rw == -100: return -1
        s = s2; L += 1
        if done: return L
    return -1
def cl_eval_eps(Q, eps):
    pi = []
    for s in range(48):
        b = -math.inf; nt = 0
        for a in range(4):
            q = Q[s * 4 + a]
            if q > b: b = q; nt = 1
            elif q == b: nt += 1
        pi.append([eps / 4 + ((1 - eps) / nt if Q[s * 4 + a] == b else 0) for a in range(4)])
    V = [0] * 48
    for _ in range(200000):
        d = 0; W = V[:]
        for s in range(48):
            if s == CG or cl_cliff(s): continue
            v = 0
            for a in range(4):
                s2, rw, done = cl_step(s, a); v += pi[s][a] * (rw + (0 if done else V[s2]))
            W[s] = v; d = max(d, abs(v - V[s]))
        V = W
        if d < 1e-10: break
    return V[CS], pi
def cl_eval_solve(pi):
    idx = [s for s in range(48) if s != CG and not cl_cliff(s)]; pos = {s: i for i, s in enumerate(idx)}
    A = np.eye(len(idx)); b = np.zeros(len(idx))
    for s in idx:
        for a in range(4):
            s2, rw, done = cl_step(s, a); p = pi[s][a]; b[pos[s]] += p * rw
            if not done: A[pos[s], pos[s2]] -= p
    return np.linalg.solve(A, b)[pos[CS]]

# ---------------- 1. JS against Python, bit for bit ----------------
D = json.load(open(os.path.join(HERE, 'js_dump.json')))
def fix(x):
    if isinstance(x, list): return [fix(v) for v in x]
    if x == 'Infinity': return math.inf
    if x == 'NaN': return math.nan
    return x
def same(a, b):
    a, b = np.array(fix(a), dtype=float), np.array(fix(b), dtype=float)
    return a.shape == b.shape and bool(np.all((a == b) | (np.isnan(a) & np.isnan(b))))
S = D['small']
ok(same(S['rw5'], rw5_job(dict(seed=7, runs=10, episodes=30, methods=[dict(k='td', a=.1), dict(k='mc', a=.03), dict(k='btd'), dict(k='bmc')]))), '5-state walk: TD, MC, batch TD, batch MC curves identical to the JavaScript (10 runs x 30 episodes)')
for fam in ['nstep', 'lret', 'tdl']:
    js = S['rw19'][fam]
    ok(js['as'] == alphas(0.1), f'19-state {fam}: alpha grid identical')
    ok(same(js['err'], rw19_job(fam, 7, 3, alphas(0.1))), f'19-state {fam}: every (parameter, alpha) error identical to the JavaScript (3 runs)')
mean = []; plen = []
for al in ALG:
    acc = [0] * 150; pl = []
    for run in range(3):
        ret, Q = cl_run(al, 7, run, .1, .5, 150); acc = [x + y for x, y in zip(acc, ret)]; pl.append(cl_greedy_len(Q))
    mean.append([x / 3 for x in acc]); plen.append(pl)
ok(same(S['cliff']['mean'], mean) and S['cliff']['plen'] == plen, 'cliff: Sarsa, Q-learning, Expected Sarsa returns per episode and greedy path lengths identical (3 runs x 150 episodes)')
_, Qq = cl_run('q', 7, 0, .1, .5, 150); _, Qs = cl_run('sarsa', 7, 0, .1, .5, 150)
ok(same(S['clQ'], Qq), 'cliff: final Q table of a Q-learning run identical')
ok(same(S['clEval'], [cl_eval_eps(Qq, .1)[0], cl_eval_eps(Qs, .1)[0]]), 'cliff: exact epsilon-greedy evaluation identical')
for k in ['eval', 'vi', 'pi', 'td', 'mc']:
    Mth = GwMethod(k, 7, .1); tr = []
    for _ in range(40): Mth.step(); tr.append(Mth.V[:])
    ok(same(S['gw'][k], tr), f'gridworld {k}: 40 frames of values identical')
ok(same(S['trace'], rw5_trace(7, 20, .1, .1)), '5-state step-by-step trace (the animation) identical')
for tr in S['tr19']:
    W = walks19(7, 0, tr['ep'] + 1); Vn = [0.0] * 21; Vl = [0.0] * 21
    for Sx in W: nstep(Vn, Sx, tr['n'], .4); tdl(Vl, Sx, tr['l'], .4)
    ok(same(tr['Vn'], Vn) and same(tr['Vl'], Vl), f"19-state step-by-step trace (n = {tr['n']}, lambda = {tr['l']}, episode {tr['ep'] + 1}) ends on the engine's values")

# ---------------- 2. independent checks ----------------
# Figure 4.1: printed values (two significant digits) at k = 1, 2, 3, 10 and infinity
book = {1: [0] + [-1] * 14 + [0], 2: [0, -1.7, -2, -2, -1.7, -2, -2, -2, -2, -2, -2, -1.7, -2, -2, -1.7, 0],
        3: [0, -2.4, -2.9, -3.0, -2.4, -2.9, -3.0, -2.9, -2.9, -3.0, -2.9, -2.4, -3.0, -2.9, -2.4, 0],
        10: [0, -6.1, -8.4, -9.0, -6.1, -7.7, -8.4, -8.4, -8.4, -8.4, -7.7, -6.1, -9.0, -8.4, -6.1, 0],
        'inf': [0, -14, -20, -22, -14, -18, -20, -20, -20, -20, -18, -14, -22, -20, -14, 0]}
from decimal import Decimal, ROUND_HALF_UP
def two_sig(x):
    if x == 0: return 0.0
    if abs(x) >= 10: return float(Decimal(repr(x)).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    return float(Decimal(repr(x)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))
V = [0.0] * 16; hist = {0: V[:]}
for k in range(1, 3000): V = gw_eval(V, RPI); hist[k] = V[:]
hist['inf'] = V
match = 16; mism = []
for k in [1, 2, 3, 10, 'inf']:
    for s in range(16):
        if two_sig(hist[k][s]) == book[k][s]: match += 1
        else: mism.append((k, s, hist[k][s], book[k][s]))
print(f'     Figure 4.1: {match} of 96 printed values match at two significant digits; differences: {mism}')
ok(match == 92 and all(m[0] == 2 and m[2] == -1.75 and m[3] == -1.7 for m in mism), 'Figure 4.1 reproduces exactly except the four -1.75 at k = 2, printed -1.7 (while -2.875 at k = 3 prints as -2.9)')
# v_pi by linear solve
A = np.eye(14); b = -np.ones(14)
for s in range(1, 15):
    for a in range(4):
        s2 = gw_next(s, a)
        if not gw_term(s2): A[s - 1, s2 - 1] -= 0.25
vpi = np.linalg.solve(A, b)
ok(np.allclose(vpi, hist['inf'][1:15], atol=1e-9), 'v_pi of the random policy by linear solve equals the swept fixed point (-14, -18, -20, -22)')
vstar = [-min(s // 4 + s % 4, 6 - s // 4 - s % 4) for s in range(16)]
opt = gw_greedy(vstar)
def greedy_optimal(V): return all(set(g) <= set(o) for g, o in zip(gw_greedy(V), opt))
ok(not greedy_optimal(hist[2]) and all(greedy_optimal(hist[k]) for k in [3, 4, 10, 'inf']), 'greedy policy is optimal from k = 3 on, not at k = 2 (the caption: "all policies after the third iteration are optimal")')
V = [0.0] * 16; n = 0
while True:
    W = gw_vi(V); n += 1
    if max(abs(W[s] - V[s]) for s in range(16)) < 1e-4: break
    V = W
ok(V == [float(x) for x in vstar] and n == 4, 'value iteration reaches v* in 3 sweeps (the 4th changes nothing)')
Mth = GwMethod('pi'); fr = 0
while not Mth.done: Mth.step(); fr += 1
print(f'     policy iteration from the random policy: {fr} frames (sweeps plus improvement steps)')
ok(all(abs(Mth.V[s] - vstar[s]) < 1e-9 for s in range(16)), 'policy iteration ends on v*')
# true values of the walks
P = np.zeros((5, 5)); b = np.zeros(5)
for i in range(5):
    for d in (-1, 1):
        j = i + d
        if 0 <= j < 5: P[i, j] += .5
        elif j == 5: b[i] += .5
ok(np.allclose(np.linalg.solve(np.eye(5) - P, b), [1/6, 2/6, 3/6, 4/6, 5/6]), '5-state true values 1/6 ... 5/6 by linear solve')
ok(abs(rms5([0, .5, .5, .5, .5, .5, 0]) - math.sqrt(1 / 18)) < 1e-15, f'5-state starting RMS error = sqrt(1/18) = {math.sqrt(1/18):.4f}')
P = np.zeros((19, 19)); b = np.zeros(19)
for i in range(19):
    for d in (-1, 1):
        j = i + d
        if 0 <= j < 19: P[i, j] += .5
        else: b[i] += .5 * (1 if j == 19 else -1)
ok(np.allclose(np.linalg.solve(np.eye(19) - P, b), TV19[1:20]), '19-state true values -0.9 ... 0.9 by linear solve')
ok(abs(rms19([0.0] * 21) - math.sqrt(0.3)) < 1e-15, f'19-state starting RMS error = sqrt(0.3) = {math.sqrt(0.3):.4f} (the top of Figure 7.2\'s axis is 0.55)')
# batch fixed points against repeated presentation with alpha = 0.001
worst = 0
for seed in (3, 4, 5):
    W = walks5(seed, 0, 12); st = batch_state()
    for e, Sx in enumerate(W):
        batch_add(st, Sx)
        if e not in (0, 3, 11): continue
        for kind in ('td', 'mc'):
            V = [0, .5, .5, .5, .5, .5, 0]
            for it in range(200000):
                inc = [0.0] * 7
                for S2 in W[:e + 1]:
                    G = 1 if S2[-1] == 6 else 0
                    for t in range(len(S2) - 1):
                        s, s2 = S2[t], S2[t + 1]
                        tgt = ((1 if s2 == 6 else 0) + V[s2]) if kind == 'td' else G
                        inc[s] += .001 * (tgt - V[s])
                for i in range(7): V[i] += inc[i]
                if max(abs(x) for x in inc) < 1e-13: break
            ref = batch_td(st) if kind == 'td' else batch_mc(st)
            worst = max(worst, max(abs(V[i] - ref[i]) for i in range(7)))
ok(worst < 1e-8, f'batch updating with alpha = 0.001 repeated to convergence equals the closed forms (certainty equivalence for TD, sample means for MC); worst gap {worst:.1e}')
# lambda-return recursion against equation (12.3)
r = rng(99); worst = 0
for _ in range(50):
    Sx = walk(r, 19); T = len(Sx) - 1; V = [r() - .5 for _ in range(21)]; V[0] = V[20] = 0; l = r(); RT = R19(Sx)
    G = [0] * T; G[T - 1] = RT
    for t in range(T - 2, -1, -1): G[t] = (1 - l) * V[Sx[t + 1]] + l * G[t + 1]
    for t in range(T):
        tot = sum((1 - l) * l ** (n - 1) * (V[Sx[t + n]] if t + n < T else RT) for n in range(1, T - t)) + l ** (T - t - 1) * RT
        worst = max(worst, abs(tot - G[t]))
ok(worst < 1e-12, f'lambda-return by the backward recursion equals the weighted sum of n-step returns (12.3); worst gap {worst:.1e}')
# special cases where methods coincide
r = rng(5); W = [walk(r, 19) for _ in range(20)]
def run_m(f, p, a):
    V = [0.0] * 21
    for Sx in W: f(V, Sx, p, a)
    return V
def mc19(V, Sx, p, a):
    G = R19(Sx)
    for t in range(len(Sx) - 1): V[Sx[t]] += a * (G - V[Sx[t]])
def td19(V, Sx, p, a):
    for t in range(len(Sx) - 1):
        s, s2 = Sx[t], Sx[t + 1]; V[s] += a * ((1 if s2 == 20 else -1 if s2 == 0 else 0) + (0 if s2 in (0, 20) else V[s2]) - V[s])
ok(np.allclose(run_m(nstep, 512, .3), run_m(mc19, 0, .3), atol=0, rtol=0) or max(abs(x - y) for x, y in zip(run_m(nstep, 512, .3), run_m(mc19, 0, .3))) < 1e-15, 'n-step TD with n longer than every episode is constant-alpha Monte Carlo')
ok(max(abs(x - y) for x, y in zip(run_m(lret, 1, .3), run_m(mc19, 0, .3))) < 1e-15, 'off-line lambda-return with lambda = 1 is constant-alpha Monte Carlo')
ok(max(abs(x - y) for x, y in zip(run_m(tdl, 0, .3), run_m(td19, 0, .3))) < 1e-15 and max(abs(x - y) for x, y in zip(run_m(nstep, 1, .3), run_m(td19, 0, .3))) < 1e-15, 'TD(lambda) with lambda = 0 and n-step TD with n = 1 are both TD(0)')
# cliff: exact epsilon-greedy evaluation by linear solve
v_it, pi = cl_eval_eps(Qq, .1)
ok(abs(v_it - cl_eval_solve(pi)) < 1e-6, f'cliff: iterative evaluation of the epsilon-greedy policy ({v_it:.3f}) equals the linear solve')
# shortest path from start is 13 steps (up, 11 right, down)
Qopt = [0.0] * 192
dist = {CG: 0}; frontier = [CG]
while frontier:
    nf = []
    for g in frontier:
        for s in range(48):
            if s in dist or s == CG or cl_cliff(s): continue
            for a in range(4):
                s2, rw, done = cl_step(s, a)
                if rw == -1 and s2 == g: dist[s] = dist[g] + 1; nf.append(s); break
    frontier = nf
ok(dist[CS] == 13, 'cliff: the optimal path from the start is 13 steps (return -13)')
for s in range(48):
    for a in range(4):
        s2, rw, done = cl_step(s, a)
        Qopt[s * 4 + a] = -1 if done else (-100 - dist[CS] if rw == -100 else -1 - dist.get(s2, 0))
vq_opt, _ = cl_eval_eps(Qopt, .1)
print(f'     cliff: epsilon-greedy (0.1) around the optimal policy, exact expected return {vq_opt:.3f}')
ok(abs(S['clStar'] - vq_opt) < 1e-9, 'cliff: the page\'s Q* gives the same exact epsilon-greedy return')

# ---------------- 3. the book's claims on the page's full default runs ----------------
F = D['full']
td = F['rw5'][:3]; mc = F['rw5'][3:]
below = sum(1 for e in range(1, 101) if max(c[e] for c in td) < min(c[e] for c in mc))
print(f'     Example 6.2: every TD curve below every MC curve at {below} of 100 episodes')
ok(below >= 95, 'Example 6.2: "The TD method was consistently better than the MC method"')
c15 = td[2]; mn = min(c15); at = c15.index(mn)
ok(at < 80 and c15[100] - mn > 0.01, f'Exercise 6.5: TD with alpha = 0.15 goes down then up (minimum {mn:.3f} at episode {at}, {c15[100]:.3f} at 100)')
ok(all(abs(c[0] - math.sqrt(1 / 18)) < 1e-15 for c in F['rw5']), 'Example 6.2: every curve starts at 0.236')
bt, bm = F['rw5b']
ok(all(bt[e] <= bm[e] + 1e-15 for e in range(1, 101)) and sum(1 for e in range(2, 101) if bt[e] < bm[e]) >= 95, 'Figure 6.2: batch TD below batch MC (equal after one episode, where both give each visited state its return)')
print(f'     Figure 6.2: after 1 episode both batch methods give RMS {bt[1]:.3f}, above the figure\'s 0.25 axis top; at 100 episodes TD {bt[100]:.3f}, MC {bm[100]:.3f}')
R = F['rw19']
def best(fam):
    return [min(x for x in row if x == x) for row in fix(R[fam]['err'])]
bn = best('nstep'); bl = best('lret'); bt_ = best('tdl')
ok(bn.index(min(bn)) not in (0, 9) and bn.index(min(bn)) == 2, f'Figure 7.2: an intermediate n works best (best n = {R["nstep"]["ps"][bn.index(min(bn))]}, error {min(bn):.3f})')
ok(bl.index(min(bl)) not in (0, 7), f'Figure 12.3: an intermediate lambda works best for the off-line lambda-return (best lambda = {R["lret"]["ps"][bl.index(min(bl))]}, error {min(bl):.3f})')
ok(min(bl) <= min(bn), f'Figure 12.3 caption: lambda-return slightly better at the best settings ({min(bl):.4f} against n-step {min(bn):.4f})')
hi_n = [fix(R['nstep']['err'])[i][-1] for i in range(10)]; hi_l = [fix(R['lret']['err'])[i][-1] for i in range(8)]
ok(min(hi_l) < min(hi_n), f'Figure 12.3 caption: lambda-return better at high alpha (best at alpha = 1: {min(hi_l):.3f} against {min(hi_n):.3f})')
Et = fix(R['tdl']['err']); El = fix(R['lret']['err']); as_ = R['tdl']['as']
gaps = [max(abs(Et[i][j] - El[i][j]) for j in range(len(as_)) if as_[j] <= as_[El[i].index(min(El[i]))]) for i in range(8)]
print('     Figure 12.6: largest gap between TD(lambda) and the lambda-return at alphas up to the lambda-return\'s best, per lambda: ' + ', '.join(f'{x:.3f}' for x in gaps))
ok(max(gaps) < 0.035 and max(gaps) > 0.01, 'Figure 12.6: TD(lambda) and the lambda-return close (within 0.035) at every alpha up to the lambda-return\'s best; not identical, the online updates differ even at lambda = 0')
worse_hi = sum(1 for i in range(2, 8) if not (Et[i][-1] < El[i][-1] + 1e-9))
ok(worse_hi == 6, 'Figure 12.6: TD(lambda) worse than the lambda-return at alpha = 1 for every lambda >= 0.8 (diverging for the larger ones)')
C = F['cliff']; late = [sum(m[400:]) / 100 for m in C['mean']]
ok(late[0] > late[1], f'Example 6.6: Sarsa\'s online return above Q-learning\'s (episodes 401 to 500: Sarsa {late[0]:.1f}, Q-learning {late[1]:.1f}, Expected Sarsa {late[2]:.1f})')
ok(all(x == 13 for x in C['plen'][1]), f'Example 6.6: Q-learning\'s greedy path is the 13-step edge path in all {len(C["plen"][1])} runs')
sl = C['plen'][0]; print('     Sarsa greedy path lengths: ' + json.dumps({str(k): sl.count(k) for k in sorted(set(sl))}))
ok(sum(1 for x in sl if x > 13) >= 0.8 * len(sl), 'Example 6.6: Sarsa\'s greedy path is longer than 13 (the safer path) in at least 80% of runs')
ok(abs(F['clEvalQ'] - vq_opt) < 1, f'cliff: epsilon-greedy around Q-learning\'s final greedy policy (run 1, exact {F["clEvalQ"]:.3f}) is within 1 of epsilon-greedy around the optimal policy ({vq_opt:.3f}); they differ only in rarely visited cells')
print(f'     cliff: Q-learning late average {late[1]:.2f} against exact {vq_opt:.2f}; Sarsa run 1 exact {F["clEvalS"]:.2f}')
ok(abs(late[1] - vq_opt) < 2.5, 'cliff: Q-learning\'s simulated late return agrees with the exact epsilon-greedy value within 2.5')

res = dict(gaps126=gaps, fails=fails, figure41_match=match, figure41_mismatch=mism, td_below_mc=below, batch_ep1=bt[1], best_n=min(bn), best_lret=min(bl), best_tdl=min(bt_), cliff_late=late,
           cliff_exact_opt=vq_opt, sarsa_plen=sl)
json.dump(res, open(os.path.join(HERE, 'check_result.json'), 'w'), indent=1)
print('check.py: ' + ('pass' if not fails else f'{len(fails)} FAILURES'))
sys.exit(1 if fails else 0)
