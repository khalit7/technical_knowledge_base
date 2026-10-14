"""Vamana, the graph inside DiskANN, written here from the paper's pseudocode (Subramanya et al., NeurIPS 2019,
Algorithms 1 GreedySearch, 2 RobustPrune, 3 Vamana). Not the authors' code: the official DiskANN builds only on Linux
and Windows (diskannpy 0.7.0 ships x86_64 Linux and Windows wheels; no macOS build), so it is not run here.
Distances are Euclidean, as in the paper; for unit vectors ||a-b|| = sqrt(2 - 2 a.b), so the ranking equals cosine.
"""
import heapq

import numpy as np


class Vamana:
    def __init__(self, X, R=32, L=100, alpha=1.2, seed=0):
        self.X = np.ascontiguousarray(X, dtype=np.float32)
        self.n = len(X)
        self.R, self.L, self.alpha = R, L, alpha
        self.rng = np.random.default_rng(seed)
        self.nbrs = [list(self.rng.choice(self.n, R, replace=False)) for _ in range(self.n)]  # random R-regular start
        for i in range(self.n):
            self.nbrs[i] = [int(j) for j in self.nbrs[i] if j != i]
        c = self.X.mean(0)
        self.medoid = int(np.argmin(np.linalg.norm(self.X - c, axis=1)))  # start node s
        self.ndis = 0

    def d(self, q, ids):
        self.ndis += len(ids)
        return np.sqrt(np.maximum(0, 2 - 2 * (self.X[ids] @ q)))

    def greedy(self, q, k, L, trace=None):
        """Algorithm 1: keep the L closest seen; expand the closest unexpanded one; stop when all L are expanded.
        Returns the k best and the set V of expanded (visited) nodes; len(V) = hops = SSD reads in DiskANN."""
        s = self.medoid
        ds = float(self.d(q, [s])[0])
        best = {s: ds}
        expanded = []
        exp_set = set()
        seen = {s}
        while True:
            cand = [(dv, v) for v, dv in best.items() if v not in exp_set]
            if not cand:
                break
            dv, v = min(cand)
            exp_set.add(v); expanded.append(v)
            new = [u for u in self.nbrs[v] if u not in seen]
            if new:
                seen.update(new)
                dd = self.d(q, new)
                for u, du in zip(new, dd):
                    best[u] = float(du)
                if len(best) > L:
                    keep = heapq.nsmallest(L, best.items(), key=lambda t: t[1])
                    best = dict(keep)
            if trace is not None:
                trace.append(v)
        top = sorted(best.items(), key=lambda t: t[1])[:k]
        return [v for v, _ in top], expanded

    def prune(self, p, cand, alpha):
        """Algorithm 2 RobustPrune(p, V, alpha, R): repeatedly keep the closest candidate p*, then drop every p' with
        alpha * d(p*, p') <= d(p, p'): p' is reachable through p*, so a direct edge is not needed."""
        cand = set(cand) | set(self.nbrs[p])
        cand.discard(p)
        cand = np.array(sorted(cand), dtype=np.int64)
        if len(cand) == 0:
            self.nbrs[p] = []
            return
        dp = self.d(self.X[p], cand)
        alive = np.ones(len(cand), bool)
        out = []
        order = np.argsort(dp)
        for i in order:
            if not alive[i]:
                continue
            ps = cand[i]
            out.append(int(ps))
            alive[i] = False
            if len(out) == self.R:
                break
            rest = np.flatnonzero(alive)
            if len(rest):
                dd = self.d(self.X[ps], cand[rest])
                alive[rest[alpha * dd <= dp[rest]]] = False
        self.nbrs[p] = out

    def build(self, passes=((1.0,), None)):
        """Algorithm 3: two passes over a random order, the first with alpha = 1, the second with the chosen alpha."""
        for a in (1.0, self.alpha):
            for i in self.rng.permutation(self.n):
                _, V = self.greedy(self.X[i], 1, self.L)
                self.prune(i, V, a)
                for j in self.nbrs[i]:
                    if i in self.nbrs[j]:
                        continue
                    if len(self.nbrs[j]) + 1 > self.R:
                        self.prune(j, self.nbrs[j] + [i], a)
                    else:
                        self.nbrs[j].append(int(i))
        return self
