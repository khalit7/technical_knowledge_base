"""Independent recomputation of every number on the Dynamic programming page.

Run from src/:  uv run --with numpy --with scipy python recompute.py
Writes recompute.json, which check_engine.mjs compares with the page's engine (parts/21_js_dpe.js) run in Node.
Prints, with a verdict, every published figure the page's defaults reproduce:
  Sutton and Barto Figure 4.1 (printed values), Silver Lecture 3 shortest path (V1 to V7), AIMA Figure 17.3,
  the old page's corridor numbers, 66 and 688 sweeps, the 0.099 stopping bound, the student MRP and MDP tables.
Written separately from the JavaScript: states are (row, column) tuples, the model is a dict of numpy arrays.
"""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = {}
CHECKS = []


def check(name, ok, detail=''):
    CHECKS.append((name, bool(ok), detail))
    print(('PASS ' if ok else 'FAIL ') + name + (': ' + detail if detail else ''))


# ---------------------------------------------------------------- worlds
# moves in the order up, right, down, left; rows grow downwards
MOVES = [(-1, 0), (0, 1), (1, 0), (0, -1)]


class Grid:
    def __init__(self, H, W, walls, term, step, slip=0.0, goal_r=None):
        self.cells = [(r, c) for r in range(H) for c in range(W) if (r, c) not in walls]
        self.ix = {cell: i for i, cell in enumerate(self.cells)}
        self.n = len(self.cells)
        self.term = np.array([cell in term for cell in self.cells])
        self.tv = np.array([term.get(cell, 0.0) for cell in self.cells], dtype=float)
        self.nA = 4
        # P[a] is n x n, R[a] is the expected reward vector for leaving s with a; n_succ counts distinct successors
        self.P = np.zeros((4, self.n, self.n))
        self.R = np.zeros((4, self.n))
        self.nsucc = np.zeros((4, self.n), dtype=int)
        for s, (r, c) in enumerate(self.cells):
            if self.term[s]:
                continue
            for a in range(4):
                if slip:
                    outs = [(a, 1 - 2 * slip), ((a + 1) % 4, slip), ((a + 3) % 4, slip)]
                else:
                    outs = [(a, 1.0)]
                for d, p in outs:
                    nr, nc = r + MOVES[d][0], c + MOVES[d][1]
                    t = self.ix.get((nr, nc), s)
                    rew = step + (goal_r.get(self.cells[t], 0.0) if goal_r and t != s else 0.0)
                    self.P[a, s, t] += p
                    self.R[a, s] += p * rew
                self.nsucc[a, s] = int((self.P[a, s] > 0).sum())


def make_worlds():
    W = {}
    W['sb44'] = Grid(4, 4, set(), {(0, 0): 0.0, (3, 3): 0.0}, -1.0)
    W['silver'] = Grid(4, 4, set(), {(0, 0): 0.0}, -1.0)
    W['aima'] = Grid(3, 4, {(1, 1)}, {(0, 3): 1.0, (1, 3): -1.0}, -0.04, slip=0.1)
    W['maze'] = Grid(6, 9, {(1, 2), (2, 2), (3, 2), (0, 7), (1, 7), (2, 7), (4, 5)}, {(0, 8): 0.0}, 0.0, goal_r={(0, 8): 1.0})
    return W


WORLDS = make_worlds()


def Qall(w, V, g):
    """Q[a, s] = R[a, s] + g * sum_s' P[a, s, s'] V(s'), with terminals at their fixed values."""
    Vt = np.where(w.term, w.tv, V)
    return w.R + g * np.einsum('aij,j->ai', w.P, Vt)


def vi_sweep(w, V, g, inplace=False, order=None):
    nt = [s for s in range(w.n) if not w.term[s]]
    if order == 'rev':
        nt = nt[::-1]
    new = V.copy()
    src = new if inplace else V
    for s in nt:
        Vt = np.where(w.term, w.tv, src)
        new[s] = max(w.R[a, s] + g * w.P[a, s] @ Vt for a in range(4))
    return new


def eval_sweep(w, V, g, pi, inplace=False, order=None):
    nt = [s for s in range(w.n) if not w.term[s]]
    if order == 'rev':
        nt = nt[::-1]
    new = V.copy()
    src = new if inplace else V
    for s in nt:
        Vt = np.where(w.term, w.tv, src)
        new[s] = sum(pi[s, a] * (w.R[a, s] + g * w.P[a, s] @ Vt) for a in range(4))
    return new


def init(w):
    return np.where(w.term, w.tv, 0.0).astype(float)


def vstar(w, g):
    V = init(w)
    for _ in range(200000):
        N = vi_sweep(w, V, g)
        if np.max(np.abs(N - V)) < 1e-13:
            return N
        V = N
    return V


def exact_eval(w, pi, g):
    nt = [s for s in range(w.n) if not w.term[s]]
    Ppi = np.einsum('sa,asj->sj', pi, w.P)
    Rpi = np.einsum('sa,as->s', pi, w.R) + g * Ppi[:, w.term] @ w.tv[w.term]
    A = np.eye(len(nt)) - g * Ppi[np.ix_(nt, nt)]
    x = np.linalg.solve(A, Rpi[nt])
    V = init(w)
    V[nt] = x
    return V


def greedy_sets(w, V, g, tol=1e-9):
    Q = Qall(w, V, g)
    out = []
    for s in range(w.n):
        if w.term[s]:
            out.append([])
            continue
        m = Q[:, s].max()
        out.append([a for a in range(4) if Q[a, s] >= m - tol * max(1, abs(m))])
    return out


def uniform(w):
    return np.full((w.n, 4), 0.25)


# ---------------------------------------------------------------- methods with a look-up budget (mirrors the page's DPE.run)
def lookups(w, s, acts):
    return int(sum(w.nsucc[a, s] for a in acts))


def run(w, g, kind, inplace=False, order=None, k=None, theta=1e-4, max_cost=10**7):
    nt = [s for s in range(w.n) if not w.term[s]]
    V = init(w)
    cost = backups = sweeps = 0
    ops = [dict(cost=0, backups=0, sweeps=0, V=V.tolist())]
    if kind in ('pe', 'vi'):
        pi = uniform(w)
        while cost < max_cost:
            N = eval_sweep(w, V, g, pi, inplace, order) if kind == 'pe' else vi_sweep(w, V, g, inplace, order)
            d = float(np.max(np.abs(N - V)))
            V = N
            cost += sum(lookups(w, s, range(4)) for s in nt)
            backups += len(nt)
            sweeps += 1
            ops.append(dict(cost=cost, backups=backups, sweeps=sweeps, V=V.tolist()))
            if d < 1e-12:
                break
        return ops
    if kind in ('pi', 'mpi'):
        pi = uniform(w)
        acts = None
        ev = 0
        improvements = 0
        while cost < max_cost:
            N = eval_sweep(w, V, g, pi, inplace, order)
            d = float(np.max(np.abs(N - V)))
            V = N
            cost += sum(lookups(w, s, [a for a in range(4) if pi[s, a] > 0]) for s in nt)
            backups += len(nt)
            sweeps += 1
            ev += 1
            done = ev >= k if kind == 'mpi' else d < theta
            ops.append(dict(cost=cost, backups=backups, sweeps=sweeps, V=V.tolist()))
            if not done:
                continue
            G = greedy_sets(w, V, g)
            new = [(-1 if w.term[s] else (acts[s] if acts is not None and acts[s] in G[s] else G[s][0])) for s in range(w.n)]
            changed = acts is None or any(new[s] != acts[s] for s in range(w.n))
            cost += sum(lookups(w, s, range(4)) for s in nt)
            acts = new
            pi = np.zeros((w.n, 4))
            for s in nt:
                pi[s, acts[s]] = 1.0
            ev = 0
            improvements += 1
            ops.append(dict(cost=cost, backups=backups, sweeps=sweeps, V=V.tolist(), improvements=improvements, acts=acts))
            if kind == 'pi' and not changed:
                break
            if kind == 'mpi' and not changed and d < theta:
                break
        return ops
    if kind == 'ps':
        pred = [dict() for _ in range(w.n)]
        for p in nt:
            for a in range(4):
                for s2 in np.nonzero(w.P[a, p])[0]:
                    if not w.term[s2]:
                        pred[s2][p] = max(pred[s2].get(p, 0.0), float(w.P[a, p, s2]))
        Vt = lambda: np.where(w.term, w.tv, V)
        pri = np.zeros(w.n)
        for s in nt:
            pri[s] = abs(max(w.R[a, s] + g * w.P[a, s] @ Vt() for a in range(4)) - V[s])
            cost += lookups(w, s, range(4))
        ops.append(dict(cost=cost, backups=0, sweeps=0, V=V.tolist()))
        while cost < max_cost:
            s, m = -1, 1e-12
            for x in nt:
                if pri[x] > m:
                    m, s = pri[x], x
            if s < 0:
                break
            v = max(w.R[a, s] + g * w.P[a, s] @ Vt() for a in range(4))
            dv = abs(v - V[s])
            V[s] = v
            pri[s] = 0.0
            cost += lookups(w, s, range(4))
            backups += 1
            for p, pr in pred[s].items():
                pri[p] += g * pr * dv
                cost += 1
            ops.append(dict(cost=cost, backups=backups, sweeps=0, V=V.tolist()))
        return ops
    raise ValueError(kind)


def first_below(ops, T, w, tol):
    """look-ups and backups at the first operation whose max error to T is below tol"""
    for o in ops:
        V = np.array(o['V'])
        e = np.max(np.abs(V - T)[~w.term])
        if e < tol:
            return dict(cost=o['cost'], backups=o['backups'], sweeps=o['sweeps'])
    return None


# ---------------------------------------------------------------- 1. corridor (the old page's worked example)
def corridor():
    g = 0.9
    # A=0, B=1, C=2; terminal G value 0
    def vi(V):
        A, B, C = V
        return [max(g * A, g * B), max(g * A, g * C), max(g * B, 10 + 0)]
    V = [0.0, 0.0, 0.0]
    vi_hist = [V]
    for _ in range(6):
        V = vi(V)
        vi_hist.append(V)
    pe = [[0.0, 0.0, 0.0]]
    for _ in range(4):
        A, B, C = pe[-1]
        pe.append([0.45 * A + 0.45 * B, 0.45 * A + 0.45 * C, 0.45 * B + 5])
    M = np.array([[1 - 0.45, -0.45, 0], [-0.45, 1, -0.45], [0, -0.45, 1]])
    Vpi = np.linalg.solve(M, np.array([0, 0, 5.0]))
    # in place, order C, B, A
    V = [0.0, 0.0, 0.0]
    V[2] = max(g * V[1], 10)
    V[1] = max(g * V[0], g * V[2])
    V[0] = max(g * V[0], g * V[1])
    inplace_cba = V
    OUT['corridor'] = dict(vi=vi_hist[:5], pe=pe, vpi=Vpi.tolist(), cba=inplace_cba)
    check('corridor value iteration table (0,0,10), (0,9,10), (8.1,9,10)', np.allclose(vi_hist[1], [0, 0, 10]) and np.allclose(vi_hist[2], [0, 9, 10]) and np.allclose(vi_hist[3], [8.1, 9, 10]) and np.allclose(vi_hist[4], vi_hist[3]))
    check('corridor random-policy sweeps', np.allclose(pe[1], [0, 0, 5]) and np.allclose(pe[2], [0, 2.25, 5]) and np.allclose(pe[3], [1.0125, 2.25, 6.0125]) and np.allclose(np.round(pe[4], 4), [1.4681, 3.1612, 6.0125]), str([round(x, 4) for x in pe[4]]))
    check('corridor V_pi = (4.29, 5.24, 7.36)', np.allclose(np.round(Vpi, 2), [4.29, 5.24, 7.36]), str(Vpi))
    check('corridor in place C,B,A converges in one sweep', np.allclose(inplace_cba, [8.1, 9, 10]))
    q = lambda V: [(g * V[0], g * V[1]), (g * V[0], g * V[2]), (g * V[1], 10)]
    qq = q(Vpi)
    check('corridor improvement comparisons 3.86/4.72, 3.86/6.62, 4.72/10', np.allclose(np.round(qq, 2), [(3.86, 4.72), (3.86, 6.62), (4.72, 10)]), str(np.round(qq, 3).tolist()))
    q3 = q(pe[3])
    check('corridor greedy after 3 sweeps: 0.91/2.025, 0.91/5.41, 2.025/10', np.allclose(np.round(q3, 3), [(0.911, 2.025), (0.911, 5.411), (2.025, 10)]), str(np.round(q3, 4).tolist()))


# ---------------------------------------------------------------- 2. convergence arithmetic
def convergence():
    k09 = math.ceil(math.log(1000) / math.log(1 / 0.9))
    k099 = math.ceil(math.log(1000) / math.log(1 / 0.99))
    check('sweeps for a factor 1000: 66 at 0.9, 688 at 0.99', k09 == 66 and k099 == 688, '%d, %d; 0.9^66 = %.5f' % (k09, k099, 0.9 ** 66))
    b = 0.99 * 0.001 / 0.01
    check('stopping bound gamma*theta/(1-gamma) = 0.099 at 0.99, 0.001', abs(b - 0.099) < 1e-12)
    OUT['conv'] = dict(k09=k09, k099=k099, p66=0.9 ** 66, bound=b)


# ---------------------------------------------------------------- 3. Sutton and Barto Figure 4.1
FIG41 = {  # printed values, rows top to bottom (book p. 77)
    0: [[0.0] * 4] * 4,
    1: [[0.0, -1.0, -1.0, -1.0], [-1.0, -1.0, -1.0, -1.0], [-1.0, -1.0, -1.0, -1.0], [-1.0, -1.0, -1.0, 0.0]],
    2: [[0.0, -1.7, -2.0, -2.0], [-1.7, -2.0, -2.0, -2.0], [-2.0, -2.0, -2.0, -1.7], [-2.0, -2.0, -1.7, 0.0]],
    3: [[0.0, -2.4, -2.9, -3.0], [-2.4, -2.9, -3.0, -2.9], [-2.9, -3.0, -2.9, -2.4], [-3.0, -2.9, -2.4, 0.0]],
    10: [[0.0, -6.1, -8.4, -9.0], [-6.1, -7.7, -8.4, -8.4], [-8.4, -8.4, -7.7, -6.1], [-9.0, -8.4, -6.1, 0.0]],
    'inf': [[0.0, -14., -20., -22.], [-14., -18., -20., -20.], [-20., -20., -18., -14.], [-22., -20., -14., 0.0]],
}


def sig2(x):
    if x == 0:
        return 0.0
    return float('%.2g' % x)


def fig41():
    w = WORLDS['sb44']
    V = init(w)
    hist = {0: V.copy()}
    for k in range(1, 11):
        V = eval_sweep(w, V, 1.0, uniform(w))
        hist[k] = V.copy()
    Vinf = exact_eval(w, uniform(w), 1.0)
    hist['inf'] = Vinf
    match = total = 0
    misses = []
    for k, grid in FIG41.items():
        for r in range(4):
            for c in range(4):
                v = hist[k][w.ix[(r, c)]]
                total += 1
                if abs(sig2(v) - grid[r][c]) < 1e-9:
                    match += 1
                else:
                    misses.append((k, r, c, round(float(v), 4), grid[r][c]))
    check('Figure 4.1: %d of %d printed values match at two significant digits' % (match, total), match == 92 and total == 96, 'misses ' + str(misses))
    # greedy policy optimal from k = 3 (every greedy action is an optimal action)
    Vs = vstar(w, 1.0)
    G = greedy_sets(w, Vs, 1.0)
    opt_from = None
    for k in range(0, 11):
        Gk = greedy_sets(w, hist[k], 1.0)
        ok = all(set(Gk[s]) <= set(G[s]) for s in range(w.n) if not w.term[s])
        if ok and opt_from is None:
            opt_from = k
        if not ok:
            opt_from = None
    check('Figure 4.1: greedy policy optimal from k = 3 on', opt_from == 3, 'from k = %s' % opt_from)
    OUT['fig41'] = {str(k): hist[k].tolist() for k in hist}
    OUT['fig41_vinf'] = Vinf.tolist()
    OUT['fig41_match'] = match


# ---------------------------------------------------------------- 4. Silver Lecture 3 shortest path
SILVER = {1: [[0] * 4] * 4,
          2: [[0, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]],
          3: [[0, -1, -2, -2], [-1, -2, -2, -2], [-2, -2, -2, -2], [-2, -2, -2, -2]],
          4: [[0, -1, -2, -3], [-1, -2, -3, -3], [-2, -3, -3, -3], [-3, -3, -3, -3]],
          5: [[0, -1, -2, -3], [-1, -2, -3, -4], [-2, -3, -4, -4], [-3, -4, -4, -4]],
          6: [[0, -1, -2, -3], [-1, -2, -3, -4], [-2, -3, -4, -5], [-3, -4, -5, -5]],
          7: [[0, -1, -2, -3], [-1, -2, -3, -4], [-2, -3, -4, -5], [-3, -4, -5, -6]]}


def silver():
    w = WORLDS['silver']
    V = init(w)
    ok = True
    for k in range(1, 8):
        grid = np.array([[V[w.ix[(r, c)]] for c in range(4)] for r in range(4)])
        if not np.allclose(grid, SILVER[k]):
            ok = False
            print('  silver mismatch at V%d' % k, grid.tolist())
        V = vi_sweep(w, V, 1.0)
    check('Silver Lecture 3 shortest path: V1 to V7 reproduce (V1 = all zeros, synchronous value iteration)', ok)


# ---------------------------------------------------------------- 5. AIMA Figure 17.3
def aima():
    w = WORLDS['aima']
    V = vstar(w, 1.0)
    printed = {(0, 0): .812, (0, 1): .868, (0, 2): .918, (1, 0): .762, (1, 2): .660, (2, 0): .705, (2, 1): .655, (2, 2): .611, (2, 3): .388}
    ok = all(abs(round(V[w.ix[c]], 3) - v) < 1e-9 for c, v in printed.items())
    check('AIMA Figure 17.3 utilities reproduce to three decimals', ok, ' '.join('%.3f' % V[w.ix[c]] for c in printed))
    OUT['aima_vstar'] = V.tolist()


# ---------------------------------------------------------------- 6. method races (the Sweep lab's numbers)
def races():
    res = {}
    setups = {'sb44': 1.0, 'silver': 1.0, 'aima': 1.0, 'maze': 0.95}
    for key, g in setups.items():
        w = WORLDS[key]
        T = vstar(w, g)
        Tpe = exact_eval(w, uniform(w), g) if key != 'maze' else exact_eval(w, uniform(w), g)
        r = {}
        for name, kw in [('vi', dict(kind='vi')), ('vi_ip', dict(kind='vi', inplace=True)), ('vi_rev', dict(kind='vi', inplace=True, order='rev')),
                         ('pi', dict(kind='pi')), ('mpi3', dict(kind='mpi', k=3)), ('ps', dict(kind='ps')), ('pe', dict(kind='pe')), ('pe_ip', dict(kind='pe', inplace=True))]:
            ops = run(w, g, max_cost=400000, **kw)
            tgt = Tpe if name.startswith('pe') else T
            hit = first_below(ops, tgt, w, 1e-4)
            last = ops[-1]
            r[name] = dict(n_ops=len(ops), last_cost=last['cost'], last_backups=last['backups'], hit=hit,
                           final_err=float(np.max(np.abs(np.array(last['V']) - tgt)[~w.term])),
                           improvements=max([o.get('improvements', 0) for o in ops]))
        res[key] = r
        print('  %-6s' % key, {k: (v['hit']['cost'] if v['hit'] else None) for k, v in r.items()}, 'PI improvements', r['pi']['improvements'])
    OUT['races'] = res
    # claims used in the text
    pi_aima = res['aima']['pi']['improvements']
    check('policy iteration on the 4x3 world stops after few improvements', pi_aima <= 6, str(pi_aima))
    check('in-place reverse order beats synchronous VI on the maze (look-ups to error 1e-4)', res['maze']['vi_rev']['hit']['cost'] < res['maze']['vi']['hit']['cost'],
          '%d vs %d' % (res['maze']['vi_rev']['hit']['cost'], res['maze']['vi']['hit']['cost']))
    check('prioritised sweeping beats synchronous VI on the maze', res['maze']['ps']['hit']['cost'] < res['maze']['vi']['hit']['cost'],
          '%d vs %d' % (res['maze']['ps']['hit']['cost'], res['maze']['vi']['hit']['cost']))


# ---------------------------------------------------------------- 7. contraction on the 4x3 world
def contraction():
    w = WORLDS['aima']
    out = {}
    for g in (0.5, 0.9, 0.99):
        T = vstar(w, g)
        a = init(w)
        b = init(w).copy()
        b[~w.term] = -1.0 / (1 - g)  # a pessimistic start
        rows = []
        for k in range(41):
            rows.append([float(np.max(np.abs(a - T)[~w.term])), float(np.max(np.abs(b - T)[~w.term])), float(np.max(np.abs(a - b)[~w.term]))])
            a = vi_sweep(w, a, g)
            b = vi_sweep(w, b, g)
        ok = all(rows[k + 1][2] <= g * rows[k][2] + 1e-12 for k in range(40))
        check('contraction at gamma %.2f: |Tu - Tv| <= gamma |u - v| on every sweep (4x3 world)' % g, ok)
        out[str(g)] = rows
    OUT['contraction'] = out


# ---------------------------------------------------------------- 8. student MRP and MDP (Silver Lecture 2), the foundations material
def student():
    names = ['C1', 'C2', 'C3', 'Pass', 'Pub', 'FB']
    P = np.zeros((6, 7))
    for s, d in {0: {1: .5, 5: .5}, 1: {2: .8, 6: .2}, 2: {3: .6, 4: .4}, 3: {6: 1}, 4: {0: .2, 1: .4, 2: .4}, 5: {5: .9, 0: .1}}.items():
        for t, p in d.items():
            P[s, t] = p
    R = np.array([-2, -2, -2, 10, 1, -1.0])
    tab = {}
    for g in (0, 0.9, 1):
        tab[g] = np.linalg.solve(np.eye(6) - g * P[:, :6], R)
    printed = {0: [-2, -2, -2, 10, 1, -1], 0.9: [-5.0, 0.9, 4.1, 10, 1.9, -7.6], 1: [-12.5, 1.5, 4.3, 10, 0.8, -22.5]}
    ok = all(np.allclose(np.round(tab[g], 1), printed[g]) for g in printed)
    check('student MRP table (old page, one decimal)', ok, ' | '.join(' '.join('%.2f' % x for x in tab[g]) for g in tab))
    c3 = -2 + 1 * (0.6 * 10 + 0.4 * tab[1][4])
    check('Class 3 Bellman check: -2 + 0.6*10 + 0.4*0.8 = 4.32', abs(round(-2 + 6 + 0.4 * 0.8, 2) - 4.32) < 1e-9 and abs(c3 - tab[1][2]) < 1e-9)
    check('Facebook at gamma 1 = -22.5 (10 steps at -1, then Class 1 = -12.5)', abs(round(tab[1][5], 1) + 22.5) < 1e-9 and abs(-10 + tab[1][0] - tab[1][5]) < 1e-9, '%.4f' % tab[1][5])
    # MDP: C1 Study(-2,C2) FB(-1,FB); C2 Study(-2,C3) Sleep(0,end); C3 Study(+10,end) Pub(+1, .2 C1 .4 C2 .4 C3); FB Quit(0,C1) FB(-1,FB)
    def q_of(V):
        C1, C2, C3, FB = V
        return [[-2 + C2, -1 + FB], [-2 + C3, 0.0], [10.0, 1 + .2 * C1 + .4 * C2 + .4 * C3], [0 + C1, -1 + FB]]
    # uniform: V = 0.5 Q0 + 0.5 Q1, linear
    A = np.array([[1, -.5, 0, -.5], [0, 1, -.5, 0], [-.5 * .2, -.5 * .4, 1 - .5 * .4, 0], [-.5, 0, 0, 1 - .5]])
    b = np.array([.5 * -2 + .5 * -1, .5 * -2, .5 * 10 + .5 * 1, .5 * -1])
    Vu = np.linalg.solve(A, b)
    Qu = q_of(Vu)
    check('student MDP uniform V = -1.3, 2.7, 7.4, -2.3', np.allclose(np.round(Vu, 1), [-1.3, 2.7, 7.4, -2.3]), str(np.round(Vu, 3)))
    check('uniform Q: 0.69/-3.31, 5.38/0, 10/4.77, -1.31/-3.31', np.allclose(np.round(Qu, 2), [[0.69, -3.31], [5.38, 0], [10, 4.77], [-1.31, -3.31]]), str(np.round(Qu, 3).tolist()))
    V = np.zeros(4)
    for _ in range(1000):
        V = np.array([max(q) for q in q_of(V)])
    Qs = q_of(V)
    check('student MDP V* = 6, 8, 10, 6 and Q*(C3, Pub) = 9.4 (Silver prints 8.4)', np.allclose(V, [6, 8, 10, 6]) and abs(Qs[2][1] - 9.4) < 1e-9)
    g1 = -2 + .5 * -2 + .25 * -2 + .125 * 10
    g2 = -2 + .5 * -1 + .25 * -1 + .125 * -2 + .0625 * -2
    check('sampled returns -2.25 and -3.125', abs(g1 + 2.25) < 1e-12 and abs(g2 + 3.125) < 1e-12)
    OUT['student'] = dict(mrp={str(g): tab[g].tolist() for g in tab}, Vu=Vu.tolist(), Qu=Qu, Vs=V.tolist(), Qs=Qs)


# ---------------------------------------------------------------- 9. linear programming: the LP optimum is V*
def lp():
    from scipy.optimize import linprog
    res = {}
    for key, g in (('aima', 0.9), ('maze', 0.95), ('sb44', 0.9)):
        w = WORLDS[key]
        nt = [s for s in range(w.n) if not w.term[s]]
        ix = {s: i for i, s in enumerate(nt)}
        A, b = [], []
        for s in nt:
            for a in range(4):
                # V(s) >= R + g sum P V  ->  -V(s) + g sum_{nt} P V <= -R - g sum_{term} P tv
                row = np.zeros(len(nt))
                row[ix[s]] -= 1
                const = w.R[a, s] + g * sum(w.P[a, s, t] * w.tv[t] for t in range(w.n) if w.term[t])
                for t in nt:
                    row[ix[t]] += g * w.P[a, s, t]
                A.append(row)
                b.append(-const)
        r = linprog(np.ones(len(nt)), A_ub=np.array(A), b_ub=np.array(b), bounds=[(None, None)] * len(nt), method='highs')
        T = vstar(w, g)
        err = float(np.max(np.abs(r.x - T[nt])))
        res[key] = dict(constraints=len(A), variables=len(nt), err=err)
        check('LP optimum equals V* (%s, gamma %.2f): %d variables, %d constraints' % (key, g, len(nt), len(A)), err < 1e-6, 'max diff %.1e' % err)
    OUT['lp'] = res


# ---------------------------------------------------------------- 10. gambler's problem (Example 4.3), shape only
def gambler():
    out = {}
    for ph in (0.4, 0.25, 0.55):
        V = np.zeros(101)
        V[100] = 1.0
        sweeps = 0
        hist = []
        while True:
            d = 0.0
            for s in range(1, 100):
                m = max(ph * V[s + a] + (1 - ph) * V[s - a] for a in range(1, min(s, 100 - s) + 1))
                d = max(d, abs(m - V[s]))
                V[s] = m
            sweeps += 1
            if sweeps <= 3:
                hist.append(V.copy())
            if d < 1e-12 or sweeps > 10000:
                break
        pol = []
        for s in range(1, 100):
            vs = [ph * V[s + a] + (1 - ph) * V[s - a] for a in range(1, min(s, 100 - s) + 1)]
            m = max(vs)
            pol.append(1 + next(i for i, v in enumerate(vs) if v >= m - 1e-9))
        out[str(ph)] = dict(sweeps=sweeps, V50=V[50], V25=V[25], V75=V[75], stake50=pol[49], stake51=pol[50], pol=pol, V=V.tolist(), h1=hist[0].tolist())
    o = out['0.4']
    check('gambler p_h = 0.4: stake all at 50 (V(50) = 0.4), small stake at 51', o['stake50'] == 50 and abs(o['V50'] - 0.4) < 1e-9 and o['stake51'] < 10, 'stake51 = %d, sweeps %d' % (o['stake51'], o['sweeps']))
    check('gambler p_h = 0.55: the smallest greedy stake is 1 everywhere (bold play loses when the coin favours you)', all(p == 1 for p in out['0.55']['pol']))
    OUT['gambler'] = {k: dict(sweeps=v['sweeps'], V50=v['V50'], stake50=v['stake50'], stake51=v['stake51'], pol=v['pol']) for k, v in out.items()}


# ---------------------------------------------------------------- 11. scale
def scale():
    n = 10 ** 10
    check('ten variables with ten values: 10^10 states', n == 10 ** 10)
    secs = 1e20 / 1e6
    years = secs / (365.25 * 24 * 3600)
    check('backgammon 10^20 states at 10^6 per second: about 3.2 million years per sweep (S&B: "over a thousand years")', 3.1e6 < years < 3.2e6, '%.3g years' % years)
    OUT['scale'] = dict(years=years)


if __name__ == '__main__':
    corridor()
    convergence()
    fig41()
    silver()
    aima()
    races()
    contraction()
    student()
    lp()
    gambler()
    scale()
    OUT['checks'] = [dict(name=n, ok=o, detail=d) for n, o, d in CHECKS]
    json.dump(OUT, open(os.path.join(HERE, 'recompute.json'), 'w'), indent=0, default=lambda x: x.tolist() if hasattr(x, 'tolist') else str(x))
    bad = [c for c in CHECKS if not c[1]]
    print('%d checks, %d failed' % (len(CHECKS), len(bad)))
