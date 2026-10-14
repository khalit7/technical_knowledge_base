"""A line-by-line Python port of hnswlib 0.8.0's single-threaded insert and search (hnswlib/hnswalg.h), for teaching:
it records every step so the page can animate it, and it is checked link for link against hnswlib itself
(check_port.py). Inner-product space: distance = 1 - a.b, as hnswlib's InnerProductDistance (space_ip.h line 18).

Departures, all optional switches used only for the page's before/after comparisons:
  select="simple"  keep the M closest candidates instead of getNeighborsByHeuristic2 (the paper's Algorithm 3 vs 4)
  flat=True        every node on layer 0 only (a single-layer NSW graph; no hierarchy)
Line numbers refer to hnswlib/hnswalg.h at tag v0.8.0.
"""
import heapq
import math

import numpy as np


class HNSW:
    def __init__(self, X, M=16, ef_construction=200, select="heuristic", flat=False):
        self.X = np.ascontiguousarray(X, dtype=np.float32)
        self.M = M
        self.maxM = M          # line 112: maxM_ = M_
        self.maxM0 = 2 * M     # line 113: maxM0_ = M_ * 2
        self.efc = max(ef_construction, M)  # line 114
        self.mult = 1 / math.log(M)        # line 142
        self.select = select
        self.flat = flat
        self.links = [None] * len(self.X)   # links[i][level] = list of ids, in hnswlib's stored order
        self.levels = [None] * len(self.X)
        self.ep = -1
        self.maxlevel = -1
        self.ndis = 0

    def dist(self, a, b):
        self.ndis += 1
        return float(np.float32(1.0) - np.dot(self.X[a], self.X[b]))

    def qdist(self, q, b):
        self.ndis += 1
        return float(np.float32(1.0) - np.dot(q, self.X[b]))

    # ---- getNeighborsByHeuristic2 (lines 443-490): keep a candidate only if it is closer to the base point than to
    #      every neighbour already kept. Input and output: lists of (dist, id). Output order = hnswlib's pop order of
    #      its max-heap (farthest first), which is the order links are written.
    def heuristic(self, cands, M, trace=None):
        if len(cands) < M:
            return sorted(cands, key=lambda t: -t[0])
        if self.select == "simple":
            return sorted(sorted(cands)[:M], key=lambda t: -t[0])
        ret = []
        for d, c in sorted(cands):
            if len(ret) >= M:
                break
            good = True
            for _, r in ret:
                if self.dist(r, c) < d:
                    good = False
                    if trace is not None:
                        trace.append([c, r])  # c rejected because r (kept) is closer to it than the base point is
                    break
            if good:
                ret.append((d, c))
        return sorted(ret, key=lambda t: -t[0])

    # ---- searchBaseLayer (lines 226-305), used while inserting: best-first search keeping ef_construction results
    def search_layer(self, ep, q, layer, ef, trace=None):
        d = self.qdist(q, ep)
        top = [(-d, ep)]          # max-heap of results (negated)
        cand = [(d, ep)]          # min-heap of candidates
        visited = {ep}
        lower = d
        while cand:
            cd, cur = cand[0]
            if cd > lower and len(top) == ef:
                break
            heapq.heappop(cand)
            step = [cur, []] if trace is not None else None
            for nb in self.links[cur][layer]:
                if nb in visited:
                    continue
                visited.add(nb)
                d1 = self.qdist(q, nb)
                took = len(top) < ef or lower > d1
                if took:
                    heapq.heappush(cand, (d1, nb))
                    heapq.heappush(top, (-d1, nb))
                    if len(top) > ef:
                        heapq.heappop(top)
                    lower = -top[0][0]
                if step is not None:
                    step[1].append([nb, round(d1, 5), 1 if took else 0])
            if trace is not None:
                trace.append(step)
        return [(-a, b) for a, b in top]

    def greedy(self, q, cur, curdist, frm, to, trace=None):
        """Greedy descent on the upper layers (lines 1213-1236 when inserting, 1278-1301 when searching)."""
        for level in range(frm, to, -1):
            changed = True
            while changed:
                changed = False
                evals = []
                for c in self.links[cur][level]:
                    d = self.qdist(q, c)
                    evals.append([c, round(d, 5)])
                    if d < curdist:
                        curdist, cur, changed = d, c, True
                if trace is not None:
                    trace.append({"layer": level, "at": cur, "evals": evals})
        return cur, curdist

    # ---- addPoint (lines 1185-1262) and mutuallyConnectNewElement (lines 509-640)
    def add(self, c, level, trace=None):
        if self.flat:
            level = 0
        self.levels[c] = level
        self.links[c] = [[] for _ in range(level + 1)]
        T = {"id": c, "level": level, "descent": [], "layers": []} if trace is not None else None
        if self.ep == -1:
            self.ep, self.maxlevel = c, level
            if trace is not None:
                trace.append(T)
            return
        q = self.X[c]
        cur = self.ep
        if level < self.maxlevel:
            cur, _ = self.greedy(q, cur, self.qdist(q, cur), self.maxlevel, level, T["descent"] if T else None)
        for layer in range(min(level, self.maxlevel), -1, -1):
            st = [] if T else None
            top = self.search_layer(cur, q, layer, self.efc, st)
            rej = [] if T else None
            sel = self.heuristic(top, self.M, rej)   # line 513: the new node keeps at most M links, even on layer 0
            self.links[c][layer] = [s for _, s in sel]
            pruned = []
            Mcur = self.maxM0 if layer == 0 else self.maxM
            for _, s in sel:
                lst = self.links[s][layer]
                if len(lst) < Mcur:
                    lst.append(c)
                else:  # lines 586-610: re-run the heuristic over the old list plus the new node
                    cands = [(self.dist(c, s), c)] + [(self.dist(x, s), x) for x in lst]
                    keep = [x for _, x in self.heuristic(cands, Mcur)]
                    dropped = [x for x in lst + [c] if x not in keep]
                    self.links[s][layer] = keep
                    pruned.append([s, dropped])
            if T:
                T["layers"].append({"layer": layer, "entry": cur, "steps": st, "found": [x for _, x in sorted(top)],
                                    "rejected": rej, "kept": [x for _, x in sorted(sel)], "pruned": pruned})
            cur = sel[-1][1]  # line 524: next_closest_entry_point = selectedNeighbors.back(), the closest
        if level > self.maxlevel:
            self.ep, self.maxlevel = c, level
        if trace is not None:
            trace.append(T)

    # ---- searchKnn (lines 1271-1325) with searchBaseLayerST's bare-bone stop rule (lines 311-440)
    def search(self, q, k=10, ef=10, trace=None):
        q = np.asarray(q, dtype=np.float32)
        cur = self.ep
        curdist = self.qdist(q, cur)
        cur, curdist = self.greedy(q, cur, curdist, self.maxlevel, 0, trace["descent"] if trace else None)
        ef = max(ef, k)
        top = [(-curdist, cur)]
        cand = [(curdist, cur)]
        visited = {cur}
        lower = curdist
        steps = []
        while cand:
            cd, node = cand[0]
            if cd > lower:  # bare-bone stop: the nearest unexpanded candidate is worse than the worst kept result
                break
            heapq.heappop(cand)
            step = [node, []]
            for nb in self.links[node][0]:
                if nb in visited:
                    continue
                visited.add(nb)
                d = self.qdist(q, nb)
                took = len(top) < ef or lower > d
                if took:
                    heapq.heappush(cand, (d, nb))
                    heapq.heappush(top, (-d, nb))
                    if len(top) > ef:
                        heapq.heappop(top)
                    lower = -top[0][0]
                step[1].append([nb, round(d, 5), 1 if took else 0])
            steps.append(step)
        if trace is not None:
            trace["steps"] = steps
        res = sorted((-a, b) for a, b in top)[:k]
        return [b for _, b in res], [a for a, _ in res]


def random_levels(n, M, seed=0):
    """Levels drawn as getRandomLevel (lines 207-211): floor(-ln(U) * mL), mL = 1 / ln(M)."""
    rng = np.random.default_rng(seed)
    return np.floor(-np.log(rng.uniform(size=n)) / math.log(M)).astype(int)


def read_hnswlib(path):
    """Parse an index file written by hnswlib's saveIndex (lines 685-713): header, level-0 block, upper link lists."""
    import struct
    b = open(path, "rb").read()
    o = 0

    def rd(fmt):
        nonlocal o
        v = struct.unpack_from(fmt, b, o)
        o += struct.calcsize(fmt)
        return v[0]
    offL0, maxel, cnt, sdpe, label_off, off_data = (rd("<Q") for _ in range(6))
    maxlevel, ep = rd("<i"), rd("<I")
    maxM, maxM0, M = rd("<Q"), rd("<Q"), rd("<Q")
    mult = rd("<d")
    efc = rd("<Q")
    L0 = np.frombuffer(b, dtype=np.uint8, count=cnt * sdpe, offset=o).reshape(cnt, sdpe)
    o += cnt * sdpe
    size_links = maxM * 4 + 4
    links, levels, labels = [], [], []
    for i in range(cnt):
        row = L0[i]
        n0 = int(np.frombuffer(row[:4].tobytes(), dtype=np.uint16)[0])  # linklistsizeint: count in the low 2 bytes
        l0 = np.frombuffer(row[4:4 + 4 * n0].tobytes(), dtype=np.uint32).tolist()
        labels.append(int(np.frombuffer(row[label_off:label_off + 8].tobytes(), dtype=np.uint64)[0]))
        sz = rd("<I")
        lv = sz // size_links if sz else 0
        L = [l0]
        for j in range(lv):
            blk = b[o + j * size_links: o + (j + 1) * size_links]
            n = struct.unpack_from("<H", blk, 0)[0]
            L.append(list(struct.unpack_from("<%dI" % n, blk, 4)))
        o += sz
        links.append(L)
        levels.append(lv)
    return {"links": links, "levels": levels, "labels": labels, "ep": ep, "maxlevel": maxlevel, "M": M, "maxM0": maxM0,
            "mult": mult, "efc": efc, "size_data_per_element": sdpe}


def filtered_search(P, q, allowed, k=10, ef=10, acorn=False):
    """Filtered search on a pyhnsw graph. allowed: boolean array.
    acorn=False: hnswlib's own rule (searchBaseLayerST with isIdAllowed, lines 311-440): every node is still walked
      through, but only allowed nodes enter the results, and the search stops only when the nearest open candidate is
      worse than the worst of ef allowed results; so with a selective filter it keeps walking.
    acorn=True: a two-hop variant written here: only allowed nodes are visited; a node's neighbour list is its allowed
      neighbours plus the allowed neighbours of its disallowed neighbours, truncated to 2M (upper layers alike).
    acorn="acorn1": ACORN-1 as described by Patel et al. (SIGMOD 2024, section 5.3; written here, not the authors'
      code): all one-hop and two-hop neighbours, filtered by the predicate, truncated to M. ACORN-1 expects a graph
      built without neighbour pruning (pyhnsw.HNSW(select="simple"))."""
    q = np.asarray(q, dtype=np.float32)
    P.ndis = 0

    def nbrs(u, layer):
        if acorn == "acorn1":
            # ACORN-1 (section 5.3): all one-hop and two-hop neighbours, then the predicate, then truncate to M
            out = [v for v in P.links[u][layer]]
            for v in P.links[u][layer]:
                out += [w for w in (P.links[v][layer] if layer < len(P.links[v]) else []) if w != u]
            seen, res = set(), []
            for x in out:
                if allowed[x] and x not in seen:
                    seen.add(x); res.append(x)
            return res[:P.M]
        out = []
        cap = P.maxM0 if layer == 0 else P.maxM
        for v in P.links[u][layer]:
            if allowed[v]:
                out.append(v)
            else:
                for w in P.links[v][layer] if layer < len(P.links[v]) else []:
                    if allowed[w] and w != u:
                        out.append(w)
        seen, res = set(), []
        for x in out:
            if x not in seen:
                seen.add(x); res.append(x)
        return res[:cap]
    cur = P.ep
    curdist = P.qdist(q, cur)
    for level in range(P.maxlevel, 0, -1):
        changed = True
        while changed:
            changed = False
            for c in (nbrs(cur, level) if acorn else P.links[cur][level]):
                d = P.qdist(q, c)
                if d < curdist:
                    curdist, cur, changed = d, c, True
    ef = max(ef, k)
    BIG = float("inf")
    top = [(-curdist, cur)] if allowed[cur] else []
    lower = curdist if allowed[cur] else BIG
    cand = [(curdist, cur)]
    visited = {cur}
    while cand:
        cd, node = cand[0]
        if cd > lower and len(top) == ef:
            break
        heapq.heappop(cand)
        for nb in (nbrs(node, 0) if acorn else P.links[node][0]):
            if nb in visited:
                continue
            visited.add(nb)
            d = P.qdist(q, nb)
            if len(top) < ef or lower > d:
                heapq.heappush(cand, (d, nb))
                if allowed[nb]:
                    heapq.heappush(top, (-d, nb))
                    if len(top) > ef:
                        heapq.heappop(top)
                if top:
                    lower = -top[0][0]
    res = sorted((-a, b) for a, b in top)[:k]
    return [b for _, b in res], P.ndis, len(visited)
