"""Prefix-cache eviction policies replayed on real request traces (the Eviction lab tab, t-ev).

A trace is a list of requests in arrival order, each a list of block keys (Mooncake's hash_ids: 512-token blocks,
"identical hash IDs indicate reusable prefix KV cache blocks"). The cache holds at most `cap` blocks. For each
request: walk its blocks from the start; a block is a hit if it is cached AND every block before it was a hit
(KV of a block depends on its whole prefix, and every engine stops its lookup at the first miss: vLLM
get_computed_blocks, SGLang match_prefix). Then the request's blocks are all made resident (the misses are
computed and cached), evicting by the policy if the cache is full. A request's own blocks are never evicted while
it is being inserted (they are in use). Like Mooncake's own analysis (FAST'25 Fig. 9 caption), this replays the
sequence of requests only: no compute time, no concurrency, no decode tokens.

Policies (name: what it evicts first):
  lru      least recently used block; blocks touched by the same request are ordered tail first, so a request's
           last block goes before its first (vLLM free_blocks frees in reverse order; SGLang evicts leaves only)
  lru_head least recently used, but ties broken head first (a naive LRU): it can evict a prefix's first block
           while later blocks stay cached, and those orphans can never hit again
  fifo     the block cached earliest (hits do not refresh it)
  lfu      fewest hits, then least recent, then tail first (SGLang's "lfu": (hit_count, last_access_time))
  arc      Adaptive Replacement Cache (Megiddo and Modha 2003), one of the two built-in policies of vLLM's CPU
           offload tier (vllm/v1/kv_offload/cpu/policies/arc.py); blocks of one request are inserted in order
  opt      Belady's rule: the block whose next use is furthest in the future (needs the future: a bound, not a
           policy an engine can run)
Hit rate = hit blocks / all blocks of all requests (and the token-weighted version, the last block of a request
holding input_length mod 512 tokens).
"""
import heapq, json, math, sys
from collections import OrderedDict


def load(path):
    out = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def tok_of(r, i):
    return min(512, r['input_length'] - i * 512)


class LRU:
    def __init__(self, cap, head_first=False):
        self.cap, self.d, self.hf = cap, OrderedDict(), head_first

    def has(self, k):
        return k in self.d

    def access(self, keys):
        # keys: all blocks of one request (hits and misses), in order; evict as needed, keeping this request's blocks
        order = keys if self.hf else list(reversed(keys))
        need = [k for k in keys if k not in self.d]
        protect = set(keys)
        ev = 0
        while len(self.d) + len(need) > self.cap:
            # evict from the LRU end, skipping blocks of the current request
            for k in self.d:
                if k not in protect:
                    del self.d[k]
                    ev += 1
                    break
            else:
                break
        for k in order:
            if k in self.d:
                self.d.move_to_end(k)
            elif len(self.d) < self.cap:
                self.d[k] = 1
        return ev


class FIFO(LRU):
    def access(self, keys):
        need = [k for k in keys if k not in self.d]
        protect = set(keys)
        while len(self.d) + len(need) > self.cap:
            for k in self.d:
                if k not in protect:
                    del self.d[k]
                    break
            else:
                break
        for k in reversed(keys):
            if k not in self.d and len(self.d) < self.cap:
                self.d[k] = 1
        return 0


class LFU:
    """Evict min (hits, last access step, -position). Lazy heap."""
    def __init__(self, cap):
        self.cap, self.meta, self.h, self.step = cap, {}, [], 0

    def has(self, k):
        return k in self.meta

    def access(self, keys):
        self.step += 1
        protect = set(keys)
        need = sum(1 for k in keys if k not in self.meta)
        held = []
        while len(self.meta) + need > self.cap and self.h:
            e = heapq.heappop(self.h)
            k = e[3]
            m = self.meta.get(k)
            if m is None or (m[0], m[1], m[2]) != (e[0], e[1], e[2]):
                continue
            if k in protect:
                held.append(e)
                continue
            del self.meta[k]
        for e in held:
            heapq.heappush(self.h, e)
        for i, k in enumerate(keys):
            m = self.meta.get(k)
            if m is not None:
                m = (m[0] + 1, self.step, -i)
            elif len(self.meta) < self.cap:
                m = (0, self.step, -i)
            else:
                continue
            self.meta[k] = m
            heapq.heappush(self.h, (m[0], m[1], m[2], k))
        return 0


class ARC:
    """Textbook ARC (Megiddo and Modha, FAST 2003), one access per block."""
    def __init__(self, cap):
        self.c, self.p = cap, 0.0
        self.t1, self.t2, self.b1, self.b2 = OrderedDict(), OrderedDict(), OrderedDict(), OrderedDict()
        self.protect = set()

    def has(self, k):
        return k in self.t1 or k in self.t2

    def _replace(self, in_b2):
        # evict from T1 or T2 into its ghost list; skip protected blocks
        def pop_lru(t):
            for k in t:
                if k not in self.protect:
                    del t[k]
                    return k
            return None
        if self.t1 and (len(self.t1) > self.p or (in_b2 and len(self.t1) == self.p)):
            k = pop_lru(self.t1)
            if k is not None:
                self.b1[k] = 1
                return
        k = pop_lru(self.t2)
        if k is not None:
            self.b2[k] = 1
            return
        k = pop_lru(self.t1)
        if k is not None:
            self.b1[k] = 1

    def one(self, x):
        c = self.c
        if x in self.t1:
            del self.t1[x]
            self.t2[x] = 1
            return
        if x in self.t2:
            self.t2.move_to_end(x)
            return
        if x in self.b1:
            self.p = min(c, self.p + max(len(self.b2) / max(1, len(self.b1)), 1))
            self._replace(False)
            del self.b1[x]
            self.t2[x] = 1
            return
        if x in self.b2:
            self.p = max(0, self.p - max(len(self.b1) / max(1, len(self.b2)), 1))
            self._replace(True)
            del self.b2[x]
            self.t2[x] = 1
            return
        l1 = len(self.t1) + len(self.b1)
        if l1 == c:
            if len(self.t1) < c:
                self.b1.popitem(last=False)
                self._replace(False)
            else:
                for k in self.t1:
                    if k not in self.protect:
                        del self.t1[k]
                        break
        else:
            tot = l1 + len(self.t2) + len(self.b2)
            if tot >= c:
                if tot == 2 * c and self.b2:
                    self.b2.popitem(last=False)
                self._replace(False)
        if len(self.t1) + len(self.t2) < c:
            self.t1[x] = 1

    def access(self, keys):
        self.protect = set(keys)
        for k in keys:
            self.one(k)
        self.protect = set()
        return 0


class OPT:
    """Belady: evict the cached block whose next use is furthest away. nxt[(req, i)] = index of the next request
    using that block (inf if none)."""
    def __init__(self, cap, nextuse):
        self.cap, self.nu, self.res, self.h = cap, nextuse, {}, []
        self.r = 0

    def has(self, k):
        return k in self.res

    def access(self, keys):
        protect = set(keys)
        need = sum(1 for k in keys if k not in self.res)
        held = []
        while len(self.res) + need > self.cap and self.h:
            e = heapq.heappop(self.h)
            k = e[2]
            if self.res.get(k) != -e[0]:
                continue
            if k in protect:
                held.append(e)
                continue
            del self.res[k]
        for e in held:
            heapq.heappush(self.h, e)
        for i, k in enumerate(keys):
            nu = self.nu[self.r][i]
            if k in self.res or len(self.res) < self.cap:
                self.res[k] = nu
                heapq.heappush(self.h, (-nu, -i, k))
        self.r += 1
        return 0


def next_uses(reqs):
    last = {}
    nu = [None] * len(reqs)
    for j in range(len(reqs) - 1, -1, -1):
        H = reqs[j]['hash_ids']
        row = []
        for k in H:
            row.append(last.get(k, math.inf))
        nu[j] = row
        for k in H:
            last[k] = j
    return nu


def make(policy, cap, reqs=None, nu=None):
    if policy == 'lru':
        return LRU(cap)
    if policy == 'lru_head':
        return LRU(cap, head_first=True)
    if policy == 'fifo':
        return FIFO(cap)
    if policy == 'lfu':
        return LFU(cap)
    if policy == 'arc':
        return ARC(cap)
    if policy == 'opt':
        return OPT(cap, nu if nu is not None else next_uses(reqs))
    raise ValueError(policy)


def replay(reqs, policy, cap, nu=None, per_request=False):
    """Returns dict: hit_blocks, blocks, hit_tokens, tokens, orphan (cached blocks found after a miss, unusable)."""
    c = make(policy, cap if cap is not None else 10 ** 12, reqs, nu)
    hb = tb = ht = tt = orphan = 0
    per = []
    for r in reqs:
        H = r['hash_ids']
        n = 0
        for k in H:
            if not c.has(k):
                break
            n += 1
        orphan += sum(1 for k in H[n:] if c.has(k))
        hb += n
        tb += len(H)
        h_t = sum(tok_of(r, i) for i in range(n))
        ht += h_t
        tt += r['input_length']
        if per_request:
            per.append(n)
        c.access(H)
    out = {'hit_blocks': hb, 'blocks': tb, 'hit_tokens': ht, 'tokens': tt, 'orphan': orphan,
           'hit': hb / tb, 'hit_tok': ht / tt}
    if per_request:
        out['per'] = per
    return out


if __name__ == '__main__':
    reqs = load(sys.argv[1])
    for p in sys.argv[3:]:
        print(p, json.dumps(replay(reqs, p, int(sys.argv[2]))))


class TwoTier:
    """GPU tier (LRU, tail first) over a host-memory tier (LRU). A block evicted from the GPU tier moves to the host
    tier (write-back on eviction; vLLM's OffloadingConnector instead writes through as blocks are computed, which
    gives the same contents when the host tier is larger than the GPU tier); a host hit is loaded back into the GPU
    tier and leaves the host tier (exclusive tiers). Blocks evicted from the host tier are dropped."""
    def __init__(self, cap_gpu, cap_cpu):
        self.g = OrderedDict()
        self.h = OrderedDict()
        self.cg, self.ch = cap_gpu, cap_cpu

    def where(self, k):
        return 1 if k in self.g else (2 if k in self.h else 0)

    def access(self, keys):
        protect = set(keys)
        for k in keys:
            self.h.pop(k, None)
        need = [k for k in keys if k not in self.g]
        while len(self.g) + len(need) > self.cg:
            for k in self.g:
                if k not in protect:
                    del self.g[k]
                    if self.ch > 0:
                        self.h[k] = 1
                        if len(self.h) > self.ch:
                            self.h.popitem(last=False)
                    break
            else:
                break
        for k in reversed(keys):
            if k in self.g:
                self.g.move_to_end(k)
            elif len(self.g) < self.cg:
                self.g[k] = 1


def replay_tiers(reqs, cap_gpu, cap_cpu):
    c = TwoTier(cap_gpu, cap_cpu)
    hg = hh = tb = tg = th = tt = 0
    for r in reqs:
        H = r['hash_ids']
        for i, k in enumerate(H):
            w = c.where(k)
            if w == 0:
                break
            if w == 1:
                hg += 1
                tg += tok_of(r, i)
            else:
                hh += 1
                th += tok_of(r, i)
        tb += len(H)
        tt += r['input_length']
        c.access(H)
    return {'gpu_blocks': hg, 'host_blocks': hh, 'blocks': tb, 'gpu_tokens': tg, 'host_tokens': th, 'tokens': tt}


def replay_vllm_exact(reqs, cap, bs=512):
    """vLLM's own rules, re-implemented: only full blocks are hashed and cached; a lookup stops one token short of the
    prompt (at least one token is computed: (P - 1) // bs blocks at most); the request allocates all its blocks
    (the partial last one too) while it runs; on free, blocks go back tail first, uncached ones to the front of the
    free queue (reused first) and cached ones to the back (evicted least recently used); two blocks may hold the same
    hash (vLLM keeps duplicates; a lookup takes the first). Returns hit blocks."""
    free = list(range(cap))
    key = [None] * cap
    ref = [0] * cap
    cache = {}
    hit = 0
    for r in reqs:
        P = r['input_length']
        H = r['hash_ids']
        nfull = P // bs
        hits = []
        for i in range((P - 1) // bs):
            lst = cache.get(H[i])
            if not lst:
                break
            hits.append(lst[0])
        need = -(-P // bs) - len(hits)
        ev = sum(1 for b in hits if ref[b] == 0)
        if need + ev > len(free):
            continue  # cannot fit: vLLM would not admit it
        for b in hits:
            if ref[b] == 0:
                free.remove(b)
            ref[b] += 1
        new = free[:need]
        del free[:need]
        for b in new:
            if key[b] is not None:
                lst = cache[key[b]]
                lst.remove(b)
                if not lst:
                    del cache[key[b]]
                key[b] = None
            ref[b] = 1
        blocks = hits + new
        for i in range(len(hits), nfull):
            b = blocks[i]
            key[b] = H[i]
            cache.setdefault(H[i], []).append(b)
        hit += len(hits)
        first, last = [], []
        for b in reversed(blocks):
            ref[b] -= 1
            if ref[b] == 0:
                (first if key[b] is None else last).append(b)
        free = first + free + last
    return hit


def order_of(c, policy, step):
    """Cached blocks, next to be evicted first."""
    if policy in ('lru', 'lru_head', 'fifo'):
        return list(c.d.keys())
    if policy == 'lfu':
        return [k for k, m in sorted(c.meta.items(), key=lambda kv: kv[1])]
    if policy == 'opt':
        return [k for k, nu in sorted(c.res.items(), key=lambda kv: -kv[1])]
    raise ValueError(policy)


def trace_steps(reqs, policy, cap):
    """Per request: hit count, blocks evicted while serving it, cache contents after it (eviction order)."""
    c = make(policy, cap, reqs, next_uses(reqs) if policy == 'opt' else None)
    out = []
    for j, r in enumerate(reqs):
        H = r['hash_ids']
        n = 0
        for k in H:
            if not c.has(k):
                break
            n += 1
        before = set(order_of(c, policy, j))
        orphan = sum(1 for k in H[n:] if c.has(k))
        c.access(H)
        after = order_of(c, policy, j)
        out.append({'hit': n, 'orphan_in_req': orphan, 'evicted': sorted(before - set(after), key=str), 'cache': after})
    return out
