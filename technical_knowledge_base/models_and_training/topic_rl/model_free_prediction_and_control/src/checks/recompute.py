"""Checks for this page's own visuals (parts/21_js_mf_engine.js): the Reading tab's widgets and the Maximisation bias and Importance sampling tabs.

1. A line-by-line Python port of the engine, run on the configurations of dump_mf.mjs: numbers must match the JavaScript
   (bit for bit where only + - * / are involved; to 1e-12 where log and cos enter, since V8 and libm may differ in the last bit).
2. Independent checks: the worked numbers of the Reading tab, E[max of N normals] with an exact normal CDF, the blackjack state's value by an
   exact rational recursion, the infinite-variance sum of Example 5.5, and the book's stated claims on the page's default runs.

usage (from src/checks): node dump_mf.mjs && python3 recompute.py
"""
import json, math, os
from fractions import Fraction as Fr

HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'mf_dump.json')))
M32 = 0xFFFFFFFF
fails = []
def ok(c, what):
    print(('ok   ' if c else 'FAIL ') + what)
    if not c: fails.append(what)

# ---------------- port ----------------
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
def gauss(r):
    u = r(); v = r()
    return math.sqrt(-2 * math.log(1 - u)) * math.cos(2 * math.pi * v)

# 1. the small cliff
MR, MC, MS, MG = 3, 6, 12, 17
GA = [(-1, 0), (1, 0), (0, 1), (0, -1)]
def m_cliff(s): return 12 < s < 17
def m_step(s, a):
    r, c = divmod(s, MC); nr, nc = r + GA[a][0], c + GA[a][1]
    if nr < 0 or nr >= MR or nc < 0 or nc >= MC: nr, nc = r, c
    n = nr * MC + nc
    if m_cliff(n): return MS, -100, False, n
    return n, -1, n == MG, n
def m_eps(Q, s, eps, r):
    if r() < eps: return int(r() * 4), True
    b = -math.inf; t = []
    for a in range(4):
        q = Q[s * 4 + a]
        if q > b: b = q; t = [a]
        elif q == b: t.append(a)
    return (t[0] if len(t) == 1 else t[int(r() * len(t))]), False
def m_max(Q, s): return max(Q[s * 4:s * 4 + 4])
def m_exp(Q, s, eps):
    b = -math.inf; nt = 0
    for a in range(4):
        q = Q[s * 4 + a]
        if q > b: b = q; nt = 1
        elif q == b: nt += 1
    e = 0
    for a in range(4):
        q = Q[s * 4 + a]; e += (eps / 4 + ((1 - eps) / nt if q == b else 0)) * q
    return e
def m_prior(seed, pre):
    r = rng(hs(seed, 50, 0)); Q = [0.0] * (MR * MC * 4)
    for _ in range(pre):
        s = MS; n = 0
        while n < 1000:
            a = m_eps(Q, s, 0.1, r)[0]; s2, rw, done, _h = m_step(s, a); n += 1
            Q[s * 4 + a] += 0.5 * (rw + (0 if done else m_max(Q, s2)) - Q[s * 4 + a])
            if done: break
            s = s2
    return Q
def m_episode(Q, seed, eps, max_len):
    r = rng(hs(seed, 51, 0)); T = []; s = MS; a, x = m_eps(Q, s, eps, r)
    while len(T) < max_len:
        s2, rw, done, h = m_step(s, a); st = dict(s=s, a=a, x=x, r=rw, s2=s2, done=done)
        if not done:
            a2, x2 = m_eps(Q, s2, eps, r); st['a2'] = a2; a, x = a2, x2
        else: st['a2'] = -1
        T.append(st)
        if done: break
        s = s2
    return T
def four(Q0, T, al, eps):
    L = {k: Q0[:] for k in ('mc', 'sarsa', 'esarsa', 'q')}; F = [{k: v[:] for k, v in L.items()}]
    G = [0] * len(T); g = 0
    for t in range(len(T) - 1, -1, -1): g = T[t]['r'] + g; G[t] = g
    for t, st in enumerate(T):
        k = st['s'] * 4 + st['a']
        for name in ('sarsa', 'esarsa', 'q'):
            Qx = L[name]
            if st['done']: boot = 0
            elif name == 'sarsa': boot = Qx[st['s2'] * 4 + st['a2']]
            elif name == 'esarsa': boot = m_exp(Qx, st['s2'], eps)
            else: boot = m_max(Qx, st['s2'])
            old = Qx[k]; Qx[k] = old + al * (st['r'] + boot - old)
        if t == len(T) - 1:
            for j in range(len(T)):
                kk = T[j]['s'] * 4 + T[j]['a']; old = L['mc'][kk]; L['mc'][kk] = old + al * (G[j] - old)
        F.append({kk: v[:] for kk, v in L.items()})
    return F, G
def m_default():
    Q0 = m_prior(1, 30)
    for sd in range(1, 400):
        T = m_episode(Q0, sd, 0.1, 60)
        if len(T) <= 30 and T[-1]['done'] and any(s['r'] == -100 and s['x'] and s['a'] == 1 for s in T): return sd, Q0, T
# 3. maximisation bias
def argmax_r(q, r):
    b = -math.inf; t = []
    for i, v in enumerate(q):
        if v > b: b = v; t = [i]
        elif v == b: t.append(i)
    return t[0] if len(t) == 1 else t[int(r() * len(t))]
def eps_pick(q, eps, r):
    if r() < eps: return int(r() * len(q))
    return argmax_r(q, r)
def mx_run(alg, seed, run, nb, eps, al, E):
    r = rng(hs(seed, 52 if alg == 'q' else 53, run)); left = []
    A1 = [0.0, 0.0]; B1 = [0.0] * nb; A2 = [0.0, 0.0]; B2 = [0.0] * nb
    for _ in range(E):
        if alg == 'q':
            a = eps_pick(A1, eps, r); left.append(1 if a == 0 else 0)
            if a == 0:
                A1[0] += al * (0 + max(B1) - A1[0]); b = eps_pick(B1, eps, r); rw = -0.1 + gauss(r); B1[b] += al * (rw - B1[b])
            else: A1[1] += al * (0 - A1[1])
        else:
            sA = [A1[0] + A2[0], A1[1] + A2[1]]; a = eps_pick(sA, eps, r); left.append(1 if a == 0 else 0)
            if a == 0:
                if r() < 0.5: bb = argmax_r(B1, r); A1[0] += al * (0 + B2[bb] - A1[0])
                else: bb = argmax_r(B2, r); A2[0] += al * (0 + B1[bb] - A2[0])
                sB = [v + B2[i] for i, v in enumerate(B1)]; b = eps_pick(sB, eps, r); rw = -0.1 + gauss(r)
                if r() < 0.5: B1[b] += al * (rw - B1[b])
                else: B2[b] += al * (rw - B2[b])
            else:
                if r() < 0.5: A1[1] += al * (0 - A1[1])
                else: A2[1] += al * (0 - A2[1])
    return left
def mx_job(seed, runs, E, nb):
    pq = [0] * E; pd = [0] * E
    for run in range(runs):
        a = mx_run('q', seed, run, nb, 0.1, 0.1, E); b = mx_run('dq', seed, run, nb, 0.1, 0.1, E)
        for e in range(E): pq[e] += a[e]; pd[e] += b[e]
    return [x / runs for x in pq], [x / runs for x in pd]
# 4. blackjack and the one-state MDP
def card(r): return min(10, 1 + int(r() * 13))
def dealer(show, r):
    s = show; ace = show == 1; h = card(r); s += h
    if h == 1: ace = True
    while True:
        soft = s + 10 if ace and s + 10 <= 21 else s
        if soft >= 17: return 22 if soft > 21 else soft
        c = card(r); s += c
        if c == 1: ace = True
        if s > 21: return 22
def bj_episode(r):
    s = 13; usable = True; rho = 1
    while True:
        hit = r() < 0.5; want = s < 20; rho *= 2 if hit == want else 0
        if not hit: break
        c = card(r); s += c
        if s > 21 and usable: s -= 10; usable = False
        if s > 21: return rho, -1
    d = dealer(2, r)
    return rho, (1 if d == 22 or s > d else 0 if s == d else -1)
def bj_job(seed, runs, E, truth):
    so = [0.0] * E; sw = [0.0] * E
    for run in range(runs):
        r = rng(hs(seed, 61, run)); num = 0; den = 0
        for e in range(E):
            rho, G = bj_episode(r); num += rho * G; den += rho
            vo = num / (e + 1); vw = num / den if den > 0 else 0
            so[e] += (vo - truth) * (vo - truth); sw[e] += (vw - truth) * (vw - truth)
    return [x / runs for x in so], [x / runs for x in sw]
def iv_episode(r):
    rho = 1
    while True:
        if r() < 0.5: return 0, 0
        rho *= 2
        if r() < 0.1: return rho, 1
def log_points(N, per):
    P = []; last = 0
    for i in range(int(per * math.log10(N)) + 1):
        n = math.floor(10 ** (i / per) + 0.5)
        if last < n <= N: P.append(n); last = n
    if P[-1] != N: P.append(N)
    return P
def iv_job(seed, runs, N, per):
    P = log_points(N, per); out = []
    for run in range(runs):
        r = rng(hs(seed, 62, run)); num = 0; den = 0; j = 0; vo = []; vw = []
        for e in range(1, N + 1):
            rho, G = iv_episode(r); num += rho * G; den += rho
            if j < len(P) and e == P[j]: vo.append(num / e); vw.append(num / den if den > 0 else 0); j += 1
        out.append((vo, vw))
    return P, out

def close(a, b, tol=0.0):
    if isinstance(a, (list, tuple)):
        return len(a) == len(b) and all(close(x, y, tol) for x, y in zip(a, b))
    return a == b if tol == 0 else abs(a - b) <= tol * max(1, abs(a), abs(b))

# ---------------- 1. JS against Python ----------------
sd, Q0, T = m_default()
ok(sd == D['four']['seed'] and close(Q0, D['four']['Q0']), 'four learners: the same default seed (%d) and starting table' % sd)
ok([ (s['s'], s['a'], s['r'], s['s2']) for s in T ] == [ (s['s'], s['a'], s['r'], s['s2']) for s in D['four']['T'] ], 'four learners: the same recorded episode (%d steps)' % len(T))
F, G = four(Q0, T, 0.5, 0.1)
ok(all(close(F[i][k], D['four']['F'][i][k]) for i in range(len(F)) for k in F[i]), 'four learners: every Q table at every frame, bit for bit')
q, d = mx_job(7, 50, 100, 10)
ok(close(q, D['mxSmall']['q'], 1e-12) and close(d, D['mxSmall']['d'], 1e-12), 'maximisation bias: 50 runs x 100 episodes, both learners')
truth_js = D['bjExact']
o, w = bj_job(7, 5, 500, truth_js)
ok(close(o, D['bjSmall']['o']) and close(w, D['bjSmall']['w']), 'blackjack off-policy: 5 runs x 500 episodes, ordinary and weighted, bit for bit')
P, runs = iv_job(7, 3, 20000, 20)
ok(P == D['ivSmall']['P'] and all(close(list(a), b['vo']) and close(list(c), b['vw']) for (a, c), b in zip(runs, D['ivSmall']['runs'])), 'infinite variance: 3 runs x 20,000 episodes, bit for bit')

# ---------------- 2. independent checks ----------------
lam = D['lam']; ok(abs(lam['v'] - 0.625) < 1e-12 and close(lam['w'], [0.5, 0.25, 0.25], 1e-12), 'lambda-return of the worked episode: weights 0.5, 0.25, 0.25 and G = 0.625')
tt = D['tt']
es_boot = 0.025 * (-4 - 100 - 5 - 6) + 0.9 * (-4)
ok(tt['sarsa']['nw'] == -53 and tt['q']['nw'] == -5 and abs(tt['es']['boot'] - es_boot) < 1e-12, 'one transition: SARSA -53, Q-learning -5, Expected SARSA bootstrap %.4f' % es_boot)
ok(abs(D['fall']['pass'] - 0.975 ** 10) < 1e-12 and abs(D['fall']['pass'] - 0.776) < 5e-4, 'cliff edge: 0.975^10 = %.4f, a fall in %.1f%% of passes' % (0.975 ** 10, 100 * (1 - 0.975 ** 10)))
def Phi(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))
def emax(N, h=1e-4):
    return sum(x * N * math.exp(-x * x / 2) / math.sqrt(2 * math.pi) * Phi(x) ** (N - 1) * h for x in (i * h for i in range(int(-8 / h), int(8 / h) + 1)))
e3, e10 = emax(3), emax(10)
ok(abs(e3 - 0.846284) < 1e-5 and abs(e10 - 1.538753) < 1e-5 and abs(D['emax'][0] - e3) < 1e-4 and abs(D['emax'][1] - e10) < 1e-4, 'E[max of N normals]: %.6f (N = 3), %.6f (N = 10); page %.6f, %.6f' % (e3, e10, D['emax'][0], D['emax'][1]))
# key update of the four-learner animation, by hand
kf = next(i for i, s in enumerate(T) if s['r'] == -100); kp = kf - 1; st = T[kp]; kk = st['s'] * 4 + st['a']
sarsa_new = Q0[kk] + 0.5 * (-1 + Q0[st['s2'] * 4 + st['a2']] - Q0[kk]); q_new = Q0[kk] + 0.5 * (-1 + max(Q0[st['s2'] * 4:st['s2'] * 4 + 4]) - Q0[kk])
ok(st['a2'] == 1 and abs(F[kp + 1]['sarsa'][kk] - sarsa_new) < 1e-12 and abs(F[kp + 1]['q'][kk] - q_new) < 1e-12, 'the key step: SARSA %.2f -> %.2f, Q-learning %.2f -> %.2f' % (Q0[kk], sarsa_new, Q0[kk], q_new))
ok(all(F[i]['mc'] == Q0 for i in range(len(T))) and F[-1]['mc'] != Q0, 'Monte Carlo changes nothing until the last step')
# blackjack exact value with rationals
def dealer_dist(show):
    memo = {}
    def go(s, ace):
        if (s, ace) in memo: return memo[(s, ace)]
        soft = s + 10 if ace and s + 10 <= 21 else s
        out = {k: Fr(0) for k in (17, 18, 19, 20, 21, 22)}
        if soft >= 17: out[22 if soft > 21 else soft] = Fr(1); memo[(s, ace)] = out; return out
        for v in range(1, 11):
            p = Fr(4, 13) if v == 10 else Fr(1, 13)
            if s + v > 21: out[22] += p; continue
            for k, x in go(s + v, ace or v == 1).items(): out[k] += p * x
        memo[(s, ace)] = out; return out
    out = {k: Fr(0) for k in (17, 18, 19, 20, 21, 22)}
    for v in range(1, 11):
        p = Fr(4, 13) if v == 10 else Fr(1, 13)
        for k, x in go(show + v, show == 1 or v == 1).items(): out[k] += p * x
    return out
Dd = dealer_dist(2); assert sum(Dd.values()) == 1
def vp(s, usable, memo={}):
    if (s, usable) in memo: return memo[(s, usable)]
    if s >= 20: v = sum(p * (1 if d == 22 or s > d else 0 if s == d else -1) for d, p in Dd.items())
    else:
        v = Fr(0)
        for c in range(1, 11):
            p = Fr(4, 13) if c == 10 else Fr(1, 13); s2, u = s + c, usable
            if s2 > 21 and u: s2 -= 10; u = False
            v += p * (-1 if s2 > 21 else vp(s2, u))
    memo[(s, usable)] = v; return v
exact = vp(13, True)
ok(abs(float(exact) - truth_js) < 1e-12 and abs(float(exact) + 0.27726) < 3e-4, 'blackjack state (Example 5.4): exact %.6f (rational recursion), page %.6f, book -0.27726 (100 million episodes, standard error about 0.0001)' % (float(exact), truth_js))
# Example 5.5: the scaled return has mean 1 and infinite second moment
mean = sum(0.5 ** k * 0.9 ** (k - 1) * 0.1 * 2 ** k for k in range(1, 400)); second = [sum(0.5 ** k * 0.9 ** (k - 1) * 0.1 * 4 ** k for k in range(1, K + 1)) for K in (5, 10, 20, 40)]
ok(abs(mean - 1) < 1e-12 and all(abs(a - 0.2 * sum(1.8 ** j for j in range(K))) < 1e-6 * a for a, K in zip(second, (5, 10, 20, 40))), 'Example 5.5: E[rho G] = 1; partial sums of E[(rho G)^2] = 0.2 (1 + 1.8 + ...): %s' % ', '.join('%.1f' % x for x in second))

# ---------------- 3. the book's claims on the page's defaults ----------------
q, d = D['mxFull']['q'], D['mxFull']['d']; avg = lambda a, i, j: sum(a[i:j]) / (j - i)
ok(max(q) > 0.5, 'Figure 6.5: Q-learning favours left early (peak %.3f at episode %d)' % (max(q), q.index(max(q)) + 1))
ok(min(q) > 0.05, 'Figure 6.5: Q-learning always above the 5%% floor (minimum %.3f)' % min(q))
ok(max(d[5:]) < 0.55 and avg(d, 250, 300) < 0.09, 'Figure 6.5: Double Q-learning near the floor (max after episode 5: %.3f; episodes 251-300: %.3f)' % (max(d[5:]), avg(d, 250, 300)))
print('     Q-learning over episodes 251-300: %.3f (the book: "about 5%% more often than is optimal" at asymptote)' % avg(q, 250, 300))
o, w = D['bjFull']['o'], D['bjFull']['w']
ok(all(w[e] < o[e] for e in range(10)), 'Figure 5.3: weighted below ordinary over the first 10 episodes (1: %.3f vs %.3f)' % (w[0], o[0]))
ok(o[9999] < 0.01 and w[9999] < 0.01, 'Figure 5.3: both near 0 at 10,000 episodes (%.5f, %.5f)' % (o[9999], w[9999]))
ok(max(w[:100]) > w[0], 'Exercise 5.7: weighted error rises (%.3f to %.3f) before falling' % (w[0], max(w[:100])))
fin = [r['vo'][-1] for r in D['ivFull']['runs']]
ok(all(abs(v - 1) > 1e-9 for v in fin), 'Figure 5.4: ten ordinary runs after 1,000,000 episodes, %.3f to %.3f, none at 1' % (min(fin), max(fin)))
def w_ok(vw):
    seen = False
    for v in vw:
        if v != 0: seen = True
        if seen and v != 1: return False
    return True
ok(all(w_ok(r['vw']) for r in D['ivFull']['runs']), 'Figure 5.4: weighted importance sampling is exactly 1 after the first consistent episode, in all ten runs')

print('\n' + ('recompute: %d FAILED' % len(fails) if fails else 'recompute: all checks pass'))
raise SystemExit(1 if fails else 0)
