"""Recompute every derived number on the page, and the memory-graph toy's routes, into inputs/recompute.json.

  python3 recompute.py        (from this src/ folder; stdlib only; deterministic)

1. The toy (section 2 of the page): six illustrative "demonstrations" that all flow left to right and end at one point,
   like Push-T's. Graph edges: each state to the next state of its own demonstration (directed, cost = distance), and a
   jump between states of two different demonstrations closer than R (both directions, cost = distance + lambda).
   Dijkstra from one start to three goals (with, across and against the flow) for every jump cost on the slider's grid.
   The page's JavaScript runs the same graph and search; check_page.mjs compares them route by route.
2. Arithmetic on the article's printed numbers: the sign test on the 30-to-0 split, binomial standard errors, the
   seed-to-seed spread implied by 38 flips in 250, the 68% (50 episodes) against 44% (250) gap, the flow row implied
   by the 56% average, and the ratios the article quotes.
"""
import heapq, json, math, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda x, n=2: float(Decimal(repr(x)).quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_UP))

# ---- 1. the toy memory graph (illustrative geometry; every number below is computed from it) ----
NDEMO, NSTEP, END, R = 8, 15, (9.4, 3.0), 0.85
def demo(i):
    xs, y0 = 0.4 + 0.5 * (i % 3), 0.6 + 0.62 * i
    pts = []
    for t in range(NSTEP):
        u = t / (NSTEP - 1)
        x = xs + (END[0] - xs) * u
        y = y0 + (END[1] - y0) * u * u + 0.3 * math.sin(2.4 * math.pi * u + 1.3 * i) * (1 - u)
        pts.append((round(x, 3), round(y, 3)))
    return pts
DEMOS = [demo(i) for i in range(NDEMO)]
NODES = [(i, t) for i in range(NDEMO) for t in range(NSTEP)]
IDX = {n: k for k, n in enumerate(NODES)}
P = lambda n: DEMOS[n[0]][n[1]]
dist = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
STEPS = [(IDX[(i, t)], IDX[(i, t + 1)]) for i in range(NDEMO) for t in range(NSTEP - 1)]
JUMPS = [(IDX[a], IDX[b]) for a in NODES for b in NODES if a[0] != b[0] and dist(P(a), P(b)) < R]  # both directions appear
START = (1, 4)
GOALS = {"with": (6, 13), "across": (6, 5), "against": (6, 1)}
LAMBDAS = [round(0.25 * k, 2) for k in range(0, 17)]  # the slider: 0 to 4 in steps of 0.25

def route(lam, goal):
    adj = [[] for _ in NODES]
    for a, b in STEPS: adj[a].append((b, dist(P(NODES[a]), P(NODES[b])), 0))
    for a, b in JUMPS: adj[a].append((b, dist(P(NODES[a]), P(NODES[b])) + lam, 1))
    s, g = IDX[START], IDX[goal]
    best, prev, h = {s: 0.0}, {s: None}, [(0.0, s)]
    while h:
        c, u = heapq.heappop(h)
        if c > best.get(u, 1e18) + 1e-12: continue
        if u == g: break
        for v, w, j in adj[u]:
            nc = c + w
            if nc < best.get(v, 1e18) - 1e-12: best[v], prev[v] = nc, (u, j); heapq.heappush(h, (nc, v))
    if g not in best: return None
    path, jumps, u = [g], 0, g
    while prev[u] is not None: u, j = prev[u]; path.append(u); jumps += j
    path.reverse()
    length = sum(dist(P(NODES[a]), P(NODES[b])) for a, b in zip(path, path[1:]))
    return {'jumps': jumps, 'states': len(path), 'length': D(length, 3), 'path': path}

TOY = {k: {('%.2f' % l): route(l, g) for l in LAMBDAS} for k, g in GOALS.items()}

# ---- 2. the article's printed numbers ----
sign_p = 2 * 0.5 ** 30                                # 30 discordant tasks, all one way: two-sided sign test
se = lambda p, n: math.sqrt(p * (1 - p) / n)
flip_sd = math.sqrt(38) / 250                         # SD of the difference between two single-seed runs on the same 250 tasks (discordant pairs)
gap_z = (0.68 - 0.44) / math.sqrt(se(0.68, 50) ** 2 + se(0.44, 250) ** 2)
flow_implied = 3 * 56 - 54 - 46                       # the harder test's 56% average over three equal rows
OUT = {
    'toy': {'demos': DEMOS, 'R': R, 'start': list(START), 'goals': {k: list(v) for k, v in GOALS.items()}, 'lambdas': LAMBDAS, 'routes': TOY,
            'n_jump_edges': len(JUMPS)},
    'sign_p': sign_p, 'sign_p_per_billion': D(sign_p * 1e9, 2),
    'ratio_block_only': D(39 / 9, 2), 'pusher_points': 100 * (39 - 9) // 50,
    'se_250_80': D(100 * se(0.80, 250), 1), 'se_50_68': D(100 * se(0.68, 50), 1), 'se_50_78': D(100 * se(0.78, 50), 1),
    'flip_sd_pts': D(100 * flip_sd, 1), 'flip_share': D(100 * 38 / 250, 1),
    'gap_68_44_z': D(gap_z, 1), 'flow_implied': flow_implied, 'mean_plain': D((69 + 39 + 27) / 3, 1),
    'subgoal_gain': 80 - 22, 'physics_gain': 42 - 22, 'gain_ratio': D((80 - 22) / (42 - 22), 1),
    'pts_89_7_on_250': [D(224 / 250 * 100, 1), D(225 / 250 * 100, 1)],
}
json.dump(OUT, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), separators=(',', ':'))
for k, v in TOY.items():
    print(k, [(l, r['jumps'], r['states']) if r else (l, None) for l, r in v.items()])
print({k: v for k, v in OUT.items() if k != 'toy'})
