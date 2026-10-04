"""AlphaZero-style self-play on tic-tac-toe, small enough to run on a laptop CPU in a few minutes.

Writes inputs/ttt_net.json: the training log (one row per iteration) and int8-quantised weights of a few
checkpoints. The page runs the same network and the same search in JavaScript (parts/21_js_mb_engine.js);
src/recompute.py re-derives every number shown on the page from the exported (dequantised) weights.

The recipe follows AlphaGo Zero / AlphaZero (Silver et al. 2017): one network f(s) = (p, v); every move of a
self-play game is chosen by a PUCT tree search guided by the current network; the search's root visit
distribution is the policy target and the game's final result the value target; the loss is
(z - v)^2 - pi . log p + c ||theta||^2. Departures, all for size: a 1-hidden-layer network (18 -> 64 -> 9 + 1)
instead of a residual tower; 50 simulations per move instead of 800; the 8 board symmetries are used for
augmentation (as AlphaGo Zero did; AlphaZero did not); no evaluator gating (as AlphaZero); moves are sampled in proportion to visit counts for the first 5 moves of a game, then chosen greedily (AlphaGo Zero: first 30 moves).

Run: uv run --with numpy python3 train_ttt.py 60   (about 30 seconds; the exported file is from this command)
"""
import json, math, os, sys, time
os.environ.setdefault("OMP_NUM_THREADS", "2"); os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LINES = [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)]

def winner(b):
    for i,j,k in LINES:
        if b[i] != 0 and b[i] == b[j] == b[k]: return b[i]
    return 0
def mover(b): return 1 if sum(1 for x in b if x == 1) == sum(1 for x in b if x == -1) else -1
def terminal(b):
    w = winner(b)
    if w: return True, w
    if all(x != 0 for x in b): return True, 0
    return False, 0

# ---- exact solution: value from the mover's point of view (+1 win, 0 draw, -1 loss) and the optimal moves ----
SOLVED = {}
def solve(b):
    key = tuple(b)
    if key in SOLVED: return SOLVED[key][0]
    t, w = terminal(b)
    if t:
        # the previous player made the last move; from the mover's view a win by the opponent is -1
        v = 0 if w == 0 else (1 if w == mover(b) else -1)
        SOLVED[key] = (v, []); return v
    m = mover(b); best = -2; vals = {}
    for a in range(9):
        if b[a] == 0:
            b2 = list(b); b2[a] = m
            vals[a] = -solve(b2); best = max(best, vals[a])
    SOLVED[key] = (best, [a for a in vals if vals[a] == best]); return best
solve([0]*9)
STATES = [list(k) for k, (v, opt) in SOLVED.items() if opt]   # non-terminal reachable positions
STATES.sort()

# ---- network: x (18: mover's stones, opponent's stones) -> relu(W1 x + b1) (64) -> logits (9), value tanh (1) ----
H = int(os.environ.get("TTT_H", "64"))
TEMP_MOVES = int(os.environ.get("TTT_TEMP", "5"))
def encode(b):
    m = mover(b)
    return np.array([1.0 if x == m else 0.0 for x in b] + [1.0 if x == -m else 0.0 for x in b])
def init_params(rng):
    return {"W1": rng.normal(0, 1/math.sqrt(18), (H, 18)), "b1": np.zeros(H),
            "Wp": rng.normal(0, 1/math.sqrt(H), (9, H)), "bp": np.zeros(9),
            "Wv": rng.normal(0, 1/math.sqrt(H), (1, H)), "bv": np.zeros(1)}
def forward(P, X):
    h = np.maximum(0, X @ P["W1"].T + P["b1"])
    return h, h @ P["Wp"].T + P["bp"], np.tanh(h @ P["Wv"].T + P["bv"])[:, 0]
def evaluate(P, b):
    _, lg, v = forward(P, encode(b)[None, :])
    lg = lg[0]; legal = [a for a in range(9) if b[a] == 0]
    mx = max(lg[a] for a in legal); e = {a: math.exp(lg[a] - mx) for a in legal}; z = sum(e.values())
    p = [e[a]/z if a in e else 0.0 for a in range(9)]
    return p, float(v[0])

# ---- PUCT search (AlphaGo Zero's selection rule; c = 1.25 as MuZero's c1). Values are from the mover's view. ----
C_PUCT = 1.25
class Node:
    __slots__ = ("b","P","N","W","kids","term","tv","exp")
    def __init__(self, b):
        self.b = b; self.N = [0]*9; self.W = [0.0]*9; self.kids = {}; self.exp = False
        t, w = terminal(b); self.term = t
        self.tv = 0 if (not t or w == 0) else (1 if w == mover(b) else -1)
def search(P, b, sims, rng=None, noise=None):
    root = Node(list(b))
    def expand(nd):
        nd.P, v = evaluate(P, nd.b); nd.exp = True; return v
    expand(root)
    if noise is not None:
        legal = [a for a in range(9) if b[a] == 0]
        d = rng.dirichlet([noise[0]]*len(legal))
        for i, a in enumerate(legal): root.P[a] = (1-noise[1])*root.P[a] + noise[1]*d[i]
    for _ in range(sims):
        nd = root; path = []
        while nd.exp and not nd.term:
            sN = sum(nd.N); best = None; bs = -1e9
            for a in range(9):
                if nd.b[a] != 0: continue
                q = nd.W[a]/nd.N[a] if nd.N[a] else 0.0
                u = q + C_PUCT*nd.P[a]*math.sqrt(sN)/(1+nd.N[a])
                if u > bs + 1e-12: bs = u; best = a
            path.append((nd, best))
            if best not in nd.kids:
                b2 = list(nd.b); b2[best] = mover(nd.b); nd.kids[best] = Node(b2)
            nd = nd.kids[best]
        v = nd.tv if nd.term else expand(nd)
        # v is from the view of the player to move at the leaf; each parent sees its negation
        for parent, a in reversed(path):
            v = -v; parent.N[a] += 1; parent.W[a] += v
    return root.N, root

# ---- self-play and training ----
SYMS = []
for k in range(4):
    for f in (False, True):
        idx = list(range(9))
        for _ in range(k): idx = [idx[6], idx[3], idx[0], idx[7], idx[4], idx[1], idx[8], idx[5], idx[2]]
        if f: idx = [idx[2], idx[1], idx[0], idx[5], idx[4], idx[3], idx[8], idx[7], idx[6]]
        SYMS.append(idx)
def selfplay_game(P, rng, sims):
    b = [0]*9; hist = []
    while True:
        t, w = terminal(b)
        if t: break
        N, _ = search(P, b, sims, rng, noise=(1.0, 0.25))
        pi = np.array(N, float); pi /= pi.sum()
        mv = len([x for x in b if x != 0])
        a = int(rng.choice(9, p=pi)) if mv < TEMP_MOVES else int(np.argmax(pi))
        hist.append((list(b), pi, mover(b)))
        b[a] = mover(b)
    data = []
    for bb, pi, m in hist:
        z = 0.0 if w == 0 else (1.0 if w == m else -1.0)
        for s in SYMS:
            data.append((encode([bb[s[i]] for i in range(9)]), pi[s], z))
    return data, w

def adam_train(P, data, rng, steps, lr=2e-3, c=1e-4, bs=64):
    X = np.array([d[0] for d in data]); PI = np.array([d[1] for d in data]); Z = np.array([d[2] for d in data])
    if not hasattr(adam_train, "m"):
        adam_train.m = {k: np.zeros_like(v) for k, v in P.items()}; adam_train.v = {k: np.zeros_like(v) for k, v in P.items()}; adam_train.t = 0
    m, vv = adam_train.m, adam_train.v; tot = [0, 0, 0]
    for _ in range(steps):
        idx = rng.integers(0, len(X), bs); x, pi, z = X[idx], PI[idx], Z[idx]
        h, lg, v = forward(P, x)
        legal = (x[:, :9] + x[:, 9:]) == 0
        lg = np.where(legal, lg, -1e9); lg = lg - lg.max(1, keepdims=True); p = np.exp(lg); p /= p.sum(1, keepdims=True)
        lv = ((z - v)**2).mean(); lp = -(pi*np.log(p + 1e-12)).sum(1).mean()
        tot[0] += lv; tot[1] += lp; tot[2] += 1
        dlg = (p - pi)/bs; dv = (-2*(z - v)*(1 - v**2)/bs)[:, None]
        g = {"Wp": dlg.T @ h, "bp": dlg.sum(0), "Wv": dv.T @ h, "bv": dv.sum(0)}
        dh = dlg @ P["Wp"] + dv @ P["Wv"]; dh[h <= 0] = 0
        g["W1"] = dh.T @ x; g["b1"] = dh.sum(0)
        adam_train.t += 1; t = adam_train.t
        for k in P:
            gk = g[k] + (2*c*P[k] if k[0] == "W" else 0)
            m[k] = 0.9*m[k] + 0.1*gk; vv[k] = 0.999*vv[k] + 0.001*gk*gk
            P[k] -= lr*(m[k]/(1-0.9**t))/(np.sqrt(vv[k]/(1-0.999**t)) + 1e-8)
    return tot[0]/tot[2], tot[1]/tot[2]

# ---- int8 quantisation (per output row, symmetric); the page and recompute.py use the dequantised weights ----
def quantise(P):
    out = {}; Q = {}
    for k, w in P.items():
        w2 = w if w.ndim == 2 else w[None, :]
        s = np.abs(w2).max(1); s[s == 0] = 1.0; s = s/127.0
        q = np.clip(np.round(w2/s[:, None]), -127, 127).astype(np.int8)
        out[k] = {"shape": list(w.shape), "scale": [float("%.9g" % x) for x in s], "q": __import__("base64").b64encode(q.tobytes()).decode()}
        Q[k] = (q.astype(float)*np.array([float("%.9g" % x) for x in s])[:, None]).reshape(w.shape)
    return out, Q

def metrics(P, with_search=False, sims=50):
    acc = 0; verr = 0.0; sacc = 0
    for b in STATES:
        v_star, opt = SOLVED[tuple(b)]
        p, v = evaluate(P, b)
        a = max(range(9), key=lambda i: (p[i] if b[i] == 0 else -1, -i))
        acc += a in opt; verr += abs(v - v_star)
        if with_search:
            N, _ = search(P, b, sims); a2 = max(range(9), key=lambda i: (N[i], -i)); sacc += a2 in opt
    n = len(STATES)
    r = {"prior_opt": acc/n, "v_mae": verr/n}
    if with_search: r["search_opt"] = sacc/n
    return r

def main():
    t0 = time.time(); rng = np.random.default_rng(7)
    P = init_params(rng); ITERS = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    GAMES, SIMS, STEPS, KEEP = 48, 50, 300, 8
    buf = []; log = []; ckpts = {}
    EXPORT = {0, 1, 3, 10, ITERS}
    def snap(it, lv, lp, res):
        row = {"it": it, "games": it*GAMES, "loss_v": lv, "loss_p": lp, "x": res[1], "o": res[-1], "d": res[0]}
        row.update(metrics(P)); log.append(row)
        if it in EXPORT:
            qd, Q = quantise(P); mq = metrics(Q, True, SIMS)
            ckpts[str(it)] = {"w": qd, "metrics_quantised": mq}
        print(it, {k: (round(v, 4) if isinstance(v, float) else v) for k, v in row.items()}, round(time.time()-t0), "s", flush=True)
    snap(0, None, None, {1: 0, -1: 0, 0: 0})
    for it in range(1, ITERS+1):
        res = {1: 0, -1: 0, 0: 0}; new = []
        for g in range(GAMES):
            d, w = selfplay_game(P, rng, SIMS); new.extend(d); res[w] += 1
        buf.append(new); buf = buf[-KEEP:]
        lv, lp = adam_train(P, [x for b in buf for x in b], rng, STEPS)
        snap(it, lv, lp, res)
    json.dump({"note": "AlphaZero-style self-play on tic-tac-toe; see train_ttt.py. Weights int8 per output row; w = q * scale.",
               "H": H, "c_puct": C_PUCT, "sims_selfplay": SIMS, "games_per_iter": GAMES, "train_steps_per_iter": STEPS,
               "n_states": len(STATES), "log": log, "ckpts": ckpts, "seconds": round(time.time()-t0)},
              open(os.path.join(HERE, "inputs", "ttt_net.json"), "w"))
    print("done", round(time.time()-t0), "s")

if __name__ == "__main__":
    main()
