"""Independent Python for the widgets reused from the Topic: rl long Reading tab (student MRP and MDP, the 4x3 world).
Trimmed copy of src/for_children/reading_full_checks/recompute.py in the parent folder. Writes recompute_rd.json.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


class Rng:
    """mulberry32, bit-for-bit the same as the page's RDE.rng."""

    def __init__(self, seed):
        self.a = seed & M32

    def __call__(self):
        self.a = (self.a + 0x6D2B79F5) & M32
        t = self.a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296


def gauss(r):
    u1, u2 = r(), r()
    return math.sqrt(-2 * math.log(1 - u1)) * math.cos(2 * math.pi * u2)


def solve(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] for i in range(n)]


# ---- 1. student MRP (Silver, Lecture 2) ----
NAMES = ['C1', 'C2', 'C3', 'Pass', 'Pub', 'FB']  # index 6 is Sleep (terminal)
R_MRP = [-2, -2, -2, 10, 1, -1]
P_MRP = {0: {1: .5, 5: .5}, 1: {2: .8, 6: .2}, 2: {3: .6, 4: .4}, 3: {6: 1}, 4: {0: .2, 1: .4, 2: .4}, 5: {5: .9, 0: .1}}


def mrp_values(g):
    A, b = [], []
    for s in range(6):
        row = [0.0] * 6
        row[s] = 1.0
        for t, p in P_MRP[s].items():
            if t < 6:
                row[t] -= g * p
        A.append(row)
        b.append(R_MRP[s])
    return solve(A, b)


def mrp_episode(start, g, r):
    s, G, d, path = start, 0.0, 1.0, [start]
    for _ in range(1000):
        if s >= 6:
            break
        G += d * R_MRP[s]
        d *= g
        u, acc = r(), 0.0
        items = list(P_MRP[s].items())
        nx = items[-1][0]
        for t, p in items:
            acc += p
            if u < acc:
                nx = t
                break
        s = nx
        path.append(s)
    return path, G


# ---- 2. student MDP ----
MDP = [[('Study', -2, {1: 1}), ('Facebook', -1, {3: 1})],
       [('Study', -2, {2: 1}), ('Sleep', 0, {4: 1})],
       [('Study', 10, {4: 1}), ('Pub', 1, {0: .2, 1: .4, 2: .4})],
       [('Quit', 0, {0: 1}), ('Facebook', -1, {3: 1})]]


def q_from(V, g):
    return [[a[1] + g * sum(p * (V[t] if t < 4 else 0) for t, p in a[2].items()) for a in acts] for acts in MDP]


def mdp_eval(pi, g):
    A, b = [], []
    for s in range(4):
        row = [0.0] * 4
        row[s] = 1.0
        rb = 0.0
        for i, a in enumerate(MDP[s]):
            w = pi[s] if i == 0 else 1 - pi[s]
            rb += w * a[1]
            for t, p in a[2].items():
                if t < 4:
                    row[t] -= g * w * p
        A.append(row)
        b.append(rb)
    V = solve(A, b)
    return V, q_from(V, g)


def mdp_opt(g):
    V = [0.0] * 4
    for _ in range(5000):
        nv = [max(q) for q in q_from(V, g)]
        d = max(abs(a - b) for a, b in zip(nv, V))
        V = nv
        if d < 1e-13:
            break
    return V, q_from(V, g)


# ---- 4. the 4x3 world ----
CELLS = [(x, y) for y in range(3) for x in range(4) if (x, y) != (1, 1)]
IDX = {c: i for i, c in enumerate(CELLS)}
DIRS = [(0, 1), (1, 0), (0, -1), (-1, 0)]
TERM = {IDX[(3, 2)]: 1.0, IDX[(3, 1)]: -1.0}
NONT = [i for i in range(len(CELLS)) if i not in TERM]


def mv(s, d):
    x, y = CELLS[s]
    n = (x + DIRS[d][0], y + DIRS[d][1])
    return IDX.get(n, s)


def outcomes(s, a):
    return [(mv(s, a), .8), (mv(s, (a + 1) % 4), .1), (mv(s, (a + 3) % 4), .1)]


def gw_vi(K):
    V = [TERM.get(s, 0.0) for s in range(len(CELLS))]
    hist = [V[:]]
    for _ in range(K):
        V = [V[s] if s in TERM else max(-0.04 + sum(p * V[n] for n, p in outcomes(s, a)) for a in range(4)) for s in range(len(CELLS))]
        hist.append(V[:])
    return hist


def gw_q(seed, eps, marks):
    r = Rng(seed)
    n = len(CELLS)
    Q = [[0.0] * 4 for _ in range(n)]
    N = [[0] * 4 for _ in range(n)]
    snaps, samples = [], 0
    for e in range(1, marks[-1] + 1):
        s = NONT[math.floor(r() * len(NONT))]
        for _ in range(500):
            if s in TERM:
                break
            u, ua = r(), r()
            if u < eps:
                a = math.floor(ua * 4)
            else:
                a = max(range(4), key=lambda b: (Q[s][b], -b))
            v = r()
            d = a if v < .8 else ((a + 1) % 4 if v < .9 else (a + 3) % 4)
            s2 = mv(s, d)
            tgt = -0.04 + (TERM[s2] if s2 in TERM else max(Q[s2]))
            N[s][a] += 1
            Q[s][a] += (tgt - Q[s][a]) / N[s][a] ** 0.8
            samples += 1
            s = s2
        if e in marks:
            snaps.append({'ep': e, 'samples': samples, 'V': [TERM[i] if i in TERM else max(Q[i]) for i in range(n)]})
    return snaps



def main():
    ex = {}
    ex['mrp'] = {str(g): mrp_values(g) for g in (0, 0.5, 0.9, 1)}
    r = Rng(42)
    ex['mrpEp'] = [mrp_episode(0, 0.5, r)[1] for _ in range(20)]
    ex['mdpUnif'] = mdp_eval([.5] * 4, 1)
    ex['mdpOpt'] = mdp_opt(1)
    ex['mdpUnif09'] = mdp_eval([.5] * 4, 0.9)
    ex['gwVI'] = gw_vi(40)
    ex['gwQ'] = gw_q(7, 0.3, [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 3000])
    json.dump(ex, open(os.path.join(HERE, 'recompute_rd.json'), 'w'), indent=0)
    print('recompute_rd.json written')


if __name__ == '__main__':
    main()
