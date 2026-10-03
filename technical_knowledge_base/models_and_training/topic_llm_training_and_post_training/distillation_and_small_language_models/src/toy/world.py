"""The toy task: find a route in a fixed graph.

Prompt: start node s and target node t. Answer: the nodes visited after s, ending at t, then EOS.
A route is correct when every step follows an edge, it reaches t, and it uses at most d(s, t) + SLACK steps
(d = shortest-path length). There are usually many correct routes, so the right next-token distribution is
spread over several nodes: the task has many modes, which is where forward and reverse KL differ.

Training data for the teacher: routes sampled uniformly among all correct routes (exact counting by dynamic
programming), so the exact next-token distribution of the data is known in closed form (exact_policy).
"""
import random
from collections import deque

N = 32            # nodes
SLACK = 2         # extra steps allowed beyond the shortest path
SEP, EOS, PAD = N, N + 1, N + 2
V = N + 3
NAMES = [chr(65 + i) if i < 26 else chr(97 + i - 26) for i in range(N)]  # A..Z, a..f


def make_graph(seed=7):
    rng = random.Random(seed)
    while True:
        adj = [set() for _ in range(N)]
        # a random spanning tree, then extra edges, degree kept between 2 and 4
        order = list(range(N)); rng.shuffle(order)
        for i in range(1, N):
            u = order[i]
            cands = [order[j] for j in range(i) if len(adj[order[j]]) < 4]
            w = rng.choice(cands)
            adj[u].add(w); adj[w].add(u)
        tries = 0
        while sum(len(a) for a in adj) // 2 < int(N * 1.5) and tries < 10000:
            tries += 1
            u, w = rng.randrange(N), rng.randrange(N)
            if u != w and w not in adj[u] and len(adj[u]) < 4 and len(adj[w]) < 4:
                adj[u].add(w); adj[w].add(u)
        if all(len(a) >= 2 for a in adj):
            return [sorted(a) for a in adj]


ADJ = make_graph()


def dist_from(t):
    d = [None] * N; d[t] = 0; q = deque([t])
    while q:
        u = q.popleft()
        for w in ADJ[u]:
            if d[w] is None:
                d[w] = d[u] + 1; q.append(w)
    return d


DIST = [dist_from(t) for t in range(N)]  # DIST[t][u]
PAIRS = [(s, t) for s in range(N) for t in range(N) if s != t]


def budget(s, t):
    return DIST[t][s] + SLACK


_F = {}


def count(u, r, t):
    """Number of correct routes from u to t (first arrival) in at most r steps."""
    if u == t:
        return 1 if r >= 0 else 0
    if r <= 0:
        return 0
    k = (u, r, t)
    if k not in _F:
        _F[k] = sum(count(w, r - 1, t) for w in ADJ[u])
    return _F[k]


def exact_policy(s, t, prefix):
    """Exact next-token distribution of the teacher's training data after `prefix` (list of nodes after s).
    Returns a dict token -> probability, or None if the prefix is already off the data (no correct completion)."""
    u = prefix[-1] if prefix else s
    if u == t:
        return {EOS: 1.0}
    r = budget(s, t) - len(prefix)
    tot = count(u, r, t)
    if tot == 0:
        return None
    return {w: count(w, r - 1, t) / tot for w in ADJ[u] if count(w, r - 1, t) > 0}


def sample_route(s, t, rng):
    pre = []
    while True:
        p = exact_policy(s, t, pre)
        toks, ws = zip(*p.items())
        x = rng.choices(toks, ws)[0]
        if x == EOS:
            return pre
        pre.append(x)


def check(s, t, route):
    """route: list of nodes after s (EOS stripped). Returns (correct, reason)."""
    u = s
    for i, w in enumerate(route):
        if w >= N:
            return False, 'bad token'
        if w not in ADJ[u]:
            return False, 'no such edge'
        u = w
        if u == t:
            if i + 1 < len(route):
                return False, 'went past the target'
            return len(route) <= budget(s, t), ('ok' if len(route) <= budget(s, t) else 'too long')
    return False, 'never arrived'


MAXANS = max(budget(s, t) for s, t in PAIRS) + 1  # answer tokens incl. EOS
SEQ = 3 + MAXANS  # s t SEP answer...

if __name__ == '__main__':
    import statistics
    print('edges', sum(len(a) for a in ADJ) // 2, 'degrees', [len(a) for a in ADJ])
    ds = [DIST[t][s] for s, t in PAIRS]
    print('diameter', max(ds), 'mean dist', statistics.mean(ds), 'MAXANS', MAXANS)
    nr = [count(s, budget(s, t), t) for s, t in PAIRS]
    print('routes per prompt: median', statistics.median(nr), 'min', min(nr), 'max', max(nr))
