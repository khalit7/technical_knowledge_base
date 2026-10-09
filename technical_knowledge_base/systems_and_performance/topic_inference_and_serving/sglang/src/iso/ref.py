"""Reference models of the two prefix caches, small enough to port line for line to the page's JavaScript
(parts/3x_js_*). check_real.py runs them against SGLang's and vLLM's own classes on every trace and capacity
and requires identical per-request hits.

Radix: SGLang v0.5.21 RadixCache semantics (radix_cache.py): token-level tree, match capped at P - 1,
split on partial match, lock refs on the running request's path, LRU eviction of unlocked leaves
(evict() L553, leaves pushed again when their parent becomes a leaf), insert of prompt + output - 1 tokens,
then the prompt again (split at the prompt boundary). Timestamps come from one counter that ticks exactly
where the real code calls time.monotonic().
Blocks: vLLM v0.31.0 hash-block semantics (kv_cache_utils.py hash_block_tokens, block_pool.py free_blocks
L777): only full 16-token blocks are hashed and reusable; a hit is the longest run of cached blocks capped
at P - 1 tokens; freed blocks go to the back of the free queue tail block first; allocation pops the front
and evicts its hash.
"""
import heapq, itertools


class Node:
    __slots__ = ('children', 'parent', 'key', 'lock', 'last', 'created', 'evicted', 'id')

    def __init__(self, clock, nid):
        self.children = {}
        self.parent = None
        self.key = []
        self.lock = 0
        self.last = clock()
        self.created = clock()
        self.evicted = False
        self.id = nid


class Radix:
    def __init__(self, cap):
        self._t = itertools.count(1)
        self.clock = lambda: next(self._t)
        self._ids = itertools.count(0)
        self.root = Node(self.clock, next(self._ids))
        self.root.lock = 1
        self.cap = cap
        self.free = cap
        self.size = 0          # tokens held by the tree
        self.leaves = set()
        self.nodes = 1

    def _upd_leaf(self, n):
        if n.evicted or n.lock > 0:
            self.leaves.discard(n)
            return
        for c in n.children.values():
            if not c.evicted:
                self.leaves.discard(n)
                return
        self.leaves.add(n)

    def _split(self, child, k):
        nn = Node(self.clock, next(self._ids))
        self.nodes += 1
        nn.children = {child.key[k]: child}
        nn.parent = child.parent
        nn.lock = child.lock
        nn.key = child.key[:k]
        child.parent = nn
        child.key = child.key[k:]
        nn.parent.children[nn.key[0]] = nn
        return nn

    def match(self, ids):
        """Longest cached prefix of ids; returns (length, last node). May split a node."""
        t = self.clock()
        node = self.root
        node.last = t
        n = 0
        key = ids
        while key and key[0] in node.children:
            c = node.children[key[0]]
            c.last = t
            k = 0
            m = min(len(c.key), len(key))
            while k < m and c.key[k] == key[k]:
                k += 1
            if k < len(c.key):
                node = self._split(c, k)
                n += k
                break
            n += k
            node = c
            key = key[k:]
        return n, node

    def insert(self, ids):
        t = self.clock()
        node = self.root
        node.last = t
        key = ids
        pre = 0
        while key and key[0] in node.children:
            node = node.children[key[0]]
            node.last = t
            k = 0
            m = min(len(node.key), len(key))
            while k < m and node.key[k] == key[k]:
                k += 1
            pre += k
            key = key[k:]
            if k < len(node.key):
                node = self._split(node, k)
        if key:
            nn = Node(self.clock, next(self._ids))
            self.nodes += 1
            nn.parent = node
            nn.key = list(key)
            node.children[key[0]] = nn
            self.size += len(key)
            self._upd_leaf(node)
            self._upd_leaf(nn)
        return pre

    def lock(self, node, d):
        while node is not self.root:
            node.lock += d
            self._upd_leaf(node)
            node = node.parent

    def evict(self, num):
        heap = [(n.last, n.id, n) for n in self.leaves]
        heapq.heapify(heap)
        done = 0
        events = []
        while done < num and heap:
            _, _, x = heapq.heappop(heap)
            done += len(x.key)
            self.free += len(x.key)
            self.size -= len(x.key)
            events.append(len(x.key))
            del x.parent.children[x.key[0]]
            x.evicted = True
            self.leaves.discard(x)
            self.nodes -= 1
            self._upd_leaf(x.parent)
            p = x.parent
            if not p.children and p.lock == 0:
                heapq.heappush(heap, (p.last, p.id, p))
        return done, events

    def serve(self, ids, P, O):
        """One request: ids = prompt + output minus the last token. Returns (hit, evicted tokens)."""
        hit, node = self.match(ids[:P - 1])
        self.lock(node, 1)
        need = (P - hit) + (O - 1)
        ev = 0
        if self.free < need:
            ev, _ = self.evict(need - self.free)
        assert self.free >= need
        self.free -= need
        pre = self.insert(ids[:P + O - 1])
        if 0 < P < P + O - 1:
            self.insert(ids[:P])
        self.free += pre - hit
        self.lock(node, -1)
        assert self.size + self.free == self.cap
        return hit, ev


class Blocks:
    def __init__(self, cap, bs=16):
        self.bs = bs
        self.n = cap // bs
        self.hash = [None] * self.n       # content key of each block (tuple of the prefix it closes), or None
        self.ref = [0] * self.n
        self.cached = {}                  # key -> list of block ids holding it
        self.free = list(range(self.n))   # free queue, front = next to reuse / evict
        self.evicted = 0

    def serve(self, ids, P, O):
        bs = self.bs
        keys = [tuple(ids[:bs * (k + 1)]) for k in range((P - 1) // bs)]
        hitb = []
        for k in keys:
            ids_k = self.cached.get(k)
            if not ids_k:
                break
            hitb.append(ids_k[0])
        hit = len(hitb) * bs
        for b in hitb:
            if self.ref[b] == 0:
                self.free.remove(b)
            self.ref[b] += 1
        total = -(-(P + O - 1) // bs)
        mine = list(hitb)
        ev = 0
        for _ in range(total - len(hitb)):
            b = self.free.pop(0)
            if self.hash[b] is not None:
                lst = self.cached[self.hash[b]]
                lst.remove(b)
                if not lst:
                    del self.cached[self.hash[b]]
                self.hash[b] = None
                ev += bs
            self.ref[b] = 1
            mine.append(b)
        # full blocks of prompt + output - 1 become cached
        for k in range(len(hitb), (P + O - 1) // bs):
            key = tuple(ids[:bs * (k + 1)])
            b = mine[k]
            self.hash[b] = key
            self.cached.setdefault(key, []).append(b)
        first, last = [], []
        for b in reversed(mine):
            self.ref[b] -= 1
            if self.ref[b] == 0:
                (first if self.hash[b] is None else last).append(b)
        self.free = first + self.free + last   # prepend_n(evict-first blocks), append_n(cached blocks)
        self.evicted += ev
        return hit, ev


def run(kind, reqs, tokens, cap):
    c = Radix(cap) if kind == 'radix' else Blocks(cap)
    out = []
    for q in reqs:
        ids = tokens(q, q['P'] + q['O'] - 1)
        h, e = c.serve(ids, q['P'], q['O'])
        out.append([q['id'], h, e])
    return out, c
