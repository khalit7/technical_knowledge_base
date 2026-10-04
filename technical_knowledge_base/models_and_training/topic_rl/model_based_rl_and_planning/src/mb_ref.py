"""Reference implementation (pure Python) of every computation on the Model-based RL and planning page.

The page's engine (parts/21_js_mb_engine.js, object MB) is a line-by-line mirror: same random-number generator
(mulberry32), same order of draws, same arithmetic order. recompute.py calls this module and writes
expected.json; check_engine.mjs runs the page's engine and compares.
"""
import math, json, base64, os

M32 = 0xFFFFFFFF
def imul(a, b): return (a * b) & M32
class Rng:
    """mulberry32, bit for bit the page's MB.rng."""
    def __init__(self, seed): self.a = seed & M32
    def __call__(self):
        self.a = (self.a + 0x6D2B79F5) & M32
        t = self.a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296

def argmax_r(v, r):
    """index of the largest value, ties broken uniformly at random (one draw only when there is a tie)"""
    m = -math.inf; c = 0; a = 0
    for k, x in enumerate(v):
        if x > m: m = x; a = k; c = 1
        elif x == m: c += 1
    if c == 1: return a
    j = int(r() * c)
    for k, x in enumerate(v):
        if x == m:
            if j == 0: return k
            j -= 1
    return a

# ======================================================================================================
# 1. Dyna-Q and Dyna-Q+ on Sutton and Barto's mazes (Examples 8.1 to 8.3)
# ======================================================================================================
# Actions in the book's order: up, down, right, left. A move into a wall or off the grid leaves the agent in place.
DR = [-1, 1, 0, 0]; DC = [0, 0, 1, -1]
MAZES = {
    # 6 x 9; layout as in Zhang's reproduction of Figure 8.2 (47 open cells, matching "each of the 47 states")
    "dyna": {"R": 6, "C": 9, "start": (2, 0), "goal": (0, 8), "walls": [(1, 2), (2, 2), (3, 2), (0, 7), (1, 7), (2, 7), (4, 5)]},
    # Figure 8.4: a wall across row 3 with a gap on the right; after the switch the gap moves to the left
    "block": {"R": 6, "C": 9, "start": (5, 3), "goal": (0, 8), "walls": [(3, c) for c in range(0, 8)], "walls2": [(3, c) for c in range(1, 9)]},
    # Figure 8.5: a wall with a gap on the left; after the switch a second gap opens on the right
    "short": {"R": 6, "C": 9, "start": (5, 3), "goal": (0, 8), "walls": [(3, c) for c in range(1, 9)], "walls2": [(3, c) for c in range(1, 8)]},
}

def maze_step(mz, walls, s, a):
    R, C = mz["R"], mz["C"]; r, c = divmod(s, C)
    r2, c2 = r + DR[a], c + DC[a]
    if r2 < 0 or r2 >= R or c2 < 0 or c2 >= C or (r2 * C + c2) in walls: return s
    return r2 * C + c2

def wallset(mz, key="walls"): return set(r * mz["C"] + c for r, c in mz[key])

class DynaAgent:
    """Tabular Dyna-Q (plus=False) or Dyna-Q+ (plus=True) exactly as in Sutton and Barto section 8.2 and 8.3.
    rA: the acting stream (epsilon-greedy and tie breaks); rP: the planning stream (which remembered pair to replay).
    Two streams make episode 1 identical for every n, as in the book's Figure 8.2 ("the first episode was exactly
    the same ... for all values of n"): during episode 1 every reward is 0 and planning changes nothing."""
    def __init__(self, mz, n, alpha, eps, gamma, rA, rP, plus=False, kappa=0.0):
        self.mz = mz; self.S = mz["R"] * mz["C"]; self.n = n; self.alpha = alpha; self.eps = eps; self.gamma = gamma
        self.rA = rA; self.rP = rP; self.plus = plus; self.kappa = kappa
        self.Q = [[0.0] * 4 for _ in range(self.S)]
        self.goal = mz["goal"][0] * mz["C"] + mz["goal"][1]
        self.mR = {}; self.mS = {}; self.mT = {}   # model: (s, a) -> reward, next state, time last tried
        self.obs = []; self.acts = {}              # observed states in order of first visit; actions taken there
        self.t = 0                                 # real time steps so far
        self.updates = 0                           # planning updates done
    def act(self, s):
        if self.rA() < self.eps: return int(self.rA() * 4)
        return argmax_r(self.Q[s], self.rA)
    def qmax(self, s): return 0.0 if s == self.goal else max(self.Q[s])
    def real_step(self, s, walls):
        a = self.act(s); s2 = maze_step(self.mz, walls, s, a); r = 1.0 if s2 == self.goal else 0.0
        self.t += 1
        q = self.Q[s]; q[a] += self.alpha * (r + self.gamma * self.qmax(s2) - q[a])          # (d) direct RL
        if s not in self.acts:                                                                 # (e) model learning
            self.obs.append(s); self.acts[s] = []
            if self.plus:
                # footnote 1 of section 8.3: actions never tried from a state may be planned with; their initial
                # model leads back to the same state with reward 0 (time last tried: 0)
                for b in range(4): self.mR[(s, b)] = 0.0; self.mS[(s, b)] = s; self.mT[(s, b)] = 0
        if a not in self.acts[s]: self.acts[s].append(a)
        self.mR[(s, a)] = r; self.mS[(s, a)] = s2; self.mT[(s, a)] = self.t
        for _ in range(self.n):                                                                # (f) planning
            ps = self.obs[int(self.rP() * len(self.obs))]
            if self.plus: pa = int(self.rP() * 4)
            else: L = self.acts[ps]; pa = L[int(self.rP() * len(L))]
            pr = self.mR[(ps, pa)]
            if self.plus: pr += self.kappa * math.sqrt(self.t - self.mT[(ps, pa)])
            ps2 = self.mS[(ps, pa)]; pq = self.Q[ps]
            pq[pa] += self.alpha * (pr + self.gamma * self.qmax(ps2) - pq[pa]); self.updates += 1
        return a, s2, r

def dyna_curves(n_list=(0, 5, 50), runs=30, episodes=50, alpha=0.1, eps=0.1, gamma=0.95):
    """Figure 8.2: steps per episode, averaged over runs; the seed of run k is the same for every n."""
    mz = MAZES["dyna"]; walls = wallset(mz); out = {}
    start = mz["start"][0] * mz["C"] + mz["start"][1]
    for n in n_list:
        tot = [0.0] * episodes; first = []
        for run in range(runs):
            ag = DynaAgent(mz, n, alpha, eps, gamma, Rng(1000 + run), Rng(2000 + run))
            for e in range(episodes):
                s = start; k = 0
                while True:
                    _, s, _ = ag.real_step(s, walls); k += 1
                    if s == ag.goal: break
                tot[e] += k
                if e == 0: first.append(k)
        out[n] = {"mean": [x / runs for x in tot], "first": first}
    return out

def dyna_snapshot(n, run=0, alpha=0.1, eps=0.1, gamma=0.95):
    """Figure 8.3: one run; returns the length of episodes 1 and 2 and, at the midpoint of episode 2,
    the greedy action per state (-1 where all four values are equal) and the agent's cell."""
    mz = MAZES["dyna"]; walls = wallset(mz); start = mz["start"][0] * mz["C"] + mz["start"][1]
    ag = DynaAgent(mz, n, alpha, eps, gamma, Rng(1000 + run), Rng(2000 + run))
    lens = []; traj2 = [start]
    for e in range(2):
        s = start; k = 0
        while True:
            _, s, _ = ag.real_step(s, walls); k += 1
            if e == 1: traj2.append(s)
            if s == ag.goal: break
        lens.append(k)
    # replay to the midpoint of episode 2
    ag2 = DynaAgent(mz, n, alpha, eps, gamma, Rng(1000 + run), Rng(2000 + run)); half = lens[1] // 2
    s = start
    while True:
        _, s, _ = ag2.real_step(s, walls)
        if s == ag2.goal: break
    s = start
    for _ in range(half): _, s, _ = ag2.real_step(s, walls)
    pol = []
    for x in range(ag2.S):
        q = ag2.Q[x]; m = max(q)
        pol.append(-1 if min(q) == m else q.index(m))
    return {"lens": lens, "half": half, "pos": s, "policy": pol, "arrows": sum(1 for p in pol if p >= 0)}

def changing_maze(name, plus, steps, switch, n, alpha, eps, gamma, kappa, runs, seed0=5000):
    """Figures 8.4 and 8.5: cumulative reward (goals reached) by time step, averaged over runs. The walls change
    after `switch` real steps. When the goal is reached the agent returns to the start."""
    mz = MAZES[name]; w1 = wallset(mz, "walls"); w2 = wallset(mz, "walls2")
    start = mz["start"][0] * mz["C"] + mz["start"][1]; cum = [0.0] * steps
    for run in range(runs):
        ag = DynaAgent(mz, n, alpha, eps, gamma, Rng(seed0 + run), Rng(seed0 + 1000 + run), plus, kappa)
        s = start; c = 0
        for t in range(steps):
            walls = w1 if t < switch else w2
            _, s, r = ag.real_step(s, walls)
            if r > 0: c += 1; s = start
            cum[t] += c
    return [x / runs for x in cum]

# ======================================================================================================
# 2. Tic-tac-toe: exact solution, the trained network, PUCT search (AlphaZero) and UCT with random rollouts
# ======================================================================================================
LINES = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]
def winner(b):
    for i, j, k in LINES:
        if b[i] != 0 and b[i] == b[j] == b[k]: return b[i]
    return 0
def mover(b):
    x = sum(1 for v in b if v == 1); o = sum(1 for v in b if v == -1)
    return 1 if x == o else -1
def terminal(b):
    w = winner(b)
    if w: return True, w
    for v in b:
        if v == 0: return False, 0
    return True, 0
def term_value(b):
    """value of a terminal position for the player to move there (the game is over: a win by the other side is -1)"""
    t, w = terminal(b)
    return 0.0 if w == 0 else (1.0 if w == mover(b) else -1.0)

SOLVED = {}
def solve(b):
    key = tuple(b)
    if key in SOLVED: return SOLVED[key][0]
    t, w = terminal(b)
    if t: SOLVED[key] = (int(term_value(b)), []); return SOLVED[key][0]
    m = mover(b); vals = {}
    for a in range(9):
        if b[a] == 0:
            b2 = list(b); b2[a] = m; vals[a] = -solve(b2)
    best = max(vals.values()); SOLVED[key] = (best, [a for a in range(9) if a in vals and vals[a] == best]); return best

def dequant(d):
    raw = base64.b64decode(d["q"]); q = [x - 256 if x > 127 else x for x in raw]
    shape = d["shape"]; rows = shape[0] if len(shape) == 2 else 1; cols = shape[1] if len(shape) == 2 else shape[0]
    W = [[q[r * cols + c] * d["scale"][r] for c in range(cols)] for r in range(rows)]
    return W if len(shape) == 2 else W[0]

class Net:
    def __init__(self, w):
        self.W1 = dequant(w["W1"]); self.b1 = dequant(w["b1"]); self.Wp = dequant(w["Wp"]); self.bp = dequant(w["bp"])
        self.Wv = dequant(w["Wv"]); self.bv = dequant(w["bv"])
    def evaluate(self, b):
        m = mover(b); x = [1.0 if v == m else 0.0 for v in b] + [1.0 if v == -m else 0.0 for v in b]
        h = []
        for j in range(len(self.W1)):
            s = 0.0; row = self.W1[j]
            for i in range(18): s += row[i] * x[i]
            s += self.b1[j]; h.append(s if s > 0 else 0.0)
        lg = []
        for a in range(9):
            s = 0.0; row = self.Wp[a]
            for j in range(len(h)): s += row[j] * h[j]
            lg.append(s + self.bp[a])
        s = 0.0; row = self.Wv[0]
        for j in range(len(h)): s += row[j] * h[j]
        v = math.tanh(s + self.bv[0])
        mx = -math.inf
        for a in range(9):
            if b[a] == 0 and lg[a] > mx: mx = lg[a]
        e = [math.exp(lg[a] - mx) if b[a] == 0 else 0.0 for a in range(9)]; z = 0.0
        for a in range(9): z += e[a]
        return [e[a] / z for a in range(9)], v

C_PUCT = 1.25
class TNode:
    __slots__ = ("b", "P", "N", "W", "kids", "term", "tv", "exp")
    def __init__(self, b):
        self.b = b; self.N = [0] * 9; self.W = [0.0] * 9; self.kids = {}; self.exp = False; self.P = None
        self.term = terminal(b)[0]; self.tv = term_value(b) if self.term else 0.0

def puct(net, b, sims, trace=False):
    """AlphaZero-style search: selection by Q + c P sqrt(sum N) / (1 + N) (unvisited Q = 0), expansion and
    evaluation of one leaf by the network (no rollout), backup of the leaf value with alternating signs.
    Returns root visit counts, root Q values and, with trace, one record per simulation."""
    root = TNode(list(b)); root.P, v0 = net.evaluate(root.b); root.exp = True; tr = []
    for _ in range(sims):
        nd = root; path = []
        while nd.exp and not nd.term:
            sN = 0
            for a in range(9): sN += nd.N[a]
            best = -1; bs = -1e9; sq = math.sqrt(sN)
            for a in range(9):
                if nd.b[a] != 0: continue
                q = nd.W[a] / nd.N[a] if nd.N[a] else 0.0
                u = q + C_PUCT * nd.P[a] * sq / (1 + nd.N[a])
                if u > bs + 1e-12: bs = u; best = a
            path.append((nd, best))
            if best not in nd.kids:
                b2 = list(nd.b); b2[best] = mover(nd.b); nd.kids[best] = TNode(b2)
            nd = nd.kids[best]
        if nd.term: v = nd.tv; kind = "terminal"
        else: nd.P, v = net.evaluate(nd.b); nd.exp = True; kind = "net"
        leafv = v
        for parent, a in reversed(path):
            v = -v; parent.N[a] += 1; parent.W[a] += v
        if trace: tr.append({"path": [a for _, a in path], "kind": kind, "v": leafv, "N": list(root.N)})
    Q = [root.W[a] / root.N[a] if root.N[a] else None for a in range(9)]
    return {"N": root.N, "Q": Q, "P": root.P, "v0": v0, "trace": tr}

UCT_C = math.sqrt(2)
def uct(b, sims, r, trace=False):
    """Plain UCT (Kocsis and Szepesvari 2006) as in Browne et al.'s survey: in the tree, an untried move is chosen
    uniformly at random and added (expansion); otherwise UCB1, Q + sqrt(2) sqrt(ln N_parent / N). From the new
    node a uniformly random playout runs to the end (simulation); its result is backed up with alternating signs."""
    root = TNode(list(b)); tr = []
    for _ in range(sims):
        nd = root; path = []
        while not nd.term:
            untried = [a for a in range(9) if nd.b[a] == 0 and a not in nd.kids]
            if untried:
                a = untried[int(r() * len(untried))]
                b2 = list(nd.b); b2[a] = mover(nd.b); nd.kids[a] = TNode(b2); path.append((nd, a)); nd = nd.kids[a]; break
            sN = 0
            for a in range(9): sN += nd.N[a]
            best = -1; bs = -1e9; lg = math.log(sN)
            for a in range(9):
                if nd.b[a] != 0: continue
                u = nd.W[a] / nd.N[a] + UCT_C * math.sqrt(lg / nd.N[a])
                if u > bs + 1e-12: bs = u; best = a
            path.append((nd, best)); nd = nd.kids[best]
        # simulation: random playout from nd
        bb = list(nd.b); roll = []
        while not terminal(bb)[0]:
            legal = [a for a in range(9) if bb[a] == 0]; a = legal[int(r() * len(legal))]; bb[a] = mover(bb); roll.append(a)
        res = term_value(bb)                      # for the player to move at the end
        v = res if (len(roll) % 2 == 0) else -res  # converted to the player to move at nd
        leafv = v
        for parent, a in reversed(path):
            v = -v; parent.N[a] += 1; parent.W[a] += v
        if trace: tr.append({"path": [a for _, a in path], "roll": roll, "v": leafv, "N": list(root.N)})
    Q = [root.W[a] / root.N[a] if root.N[a] else None for a in range(9)]
    return {"N": root.N, "Q": Q, "trace": tr}

def top(N):
    best = 0
    for a in range(9):
        if N[a] > N[best]: best = a
    return best

# ======================================================================================================
# 3. Pendulum: true dynamics, the learned ensemble, rollouts and compounding error
# ======================================================================================================
def true_step(th, thd, u):
    u = min(2.0, max(-2.0, u))
    nthd = thd + (3.0 * 10.0 / 2.0 * math.sin(th) + 3.0 * u) * 0.05
    nthd = min(8.0, max(-8.0, nthd))
    return th + nthd * 0.05, nthd

class PMember:
    def __init__(self, w, out_scale):
        self.L = [(dequant(w["W1"]), dequant(w["b1"])), (dequant(w["W2"]), dequant(w["b2"])), (dequant(w["W3"]), dequant(w["b3"]))]
        self.os = out_scale
    def step(self, th, thd, u):
        x = [math.cos(th), math.sin(th), thd / 8.0, u / 2.0]
        for li, (W, bb) in enumerate(self.L):
            y = []
            for j in range(len(W)):
                s = 0.0; row = W[j]
                for i in range(len(x)): s += row[i] * x[i]
                s += bb[j]; y.append(math.tanh(s) if li < 2 else s)
            x = y
        return th + x[0] * self.os[0], thd + x[1] * self.os[1]

def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi

def pend_tests(n=200, T=50, seed=77):
    r = Rng(seed); tests = []
    for _ in range(n):
        th = (r() * 2 - 1) * math.pi; thd = r() * 2 - 1
        us = [(r() * 2 - 1) * 2 for _ in range(T)]
        tests.append((th, thd, us))
    return tests

def pend_rollout(member, th, thd, us, k=0):
    """model rollout along the action list; with k > 0 the model is restarted from the true state every k steps
    (MBPO-style branched rollouts). Returns true and model angles per step (index 0 = start)."""
    tt, td = th, thd; mt, md = th, thd; T = [tt]; M = [mt]
    for t, u in enumerate(us):
        if k and t % k == 0: mt, md = tt, td
        tt, td = true_step(tt, td, u); mt, md = member.step(mt, md, u); T.append(tt); M.append(mt)
    return T, M

def pend_error_curves(members, tests, k=0):
    """mean |wrapped angle error| by horizon, for each member, and the mean spread (sample standard deviation of
    the members' angles around their mean, angles unwrapped relative to the truth) by horizon"""
    T = len(tests[0][2]); err = [[0.0] * (T + 1) for _ in members]; spread = [0.0] * (T + 1)
    for th, thd, us in tests:
        rolls = [pend_rollout(m, th, thd, us, k) for m in members]
        for t in range(T + 1):
            ds = []
            for i, (Tr, Mo) in enumerate(rolls):
                d = wrap(Mo[t] - Tr[t]); err[i][t] += abs(d); ds.append(d)
            mu = sum(ds) / len(ds); spread[t] += math.sqrt(sum((d - mu) ** 2 for d in ds) / (len(ds) - 1))
    n = len(tests)
    return {"err": [[x / n for x in e] for e in err], "spread": [x / n for x in spread]}
