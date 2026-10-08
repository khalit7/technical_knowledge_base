"""Reference serving-engine simulator for the Serving simulator tab (t-sim).

The in-page JavaScript (parts/31_js_sim_0core.js) is a line-for-line port of this
file; check/check_core.mjs runs both on the same configurations and requires
identical schedules and metrics. The continuous-batching + paged mode mirrors the
vLLM v1 scheduler (v0.31.0); check/vllm_harness.py runs the real vLLM Scheduler
and KVCacheManager on the same traces and compares every step.

Units: time in seconds, sizes in tokens unless named *_bytes.
"""
import json, math, sys


# ---------------- deterministic random numbers (same in JS) ----------------
class Rng:
    """mulberry32, 32-bit integer arithmetic, identical to the JS version."""
    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def next(self):
        self.s = (self.s + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.s
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    def int(self, lo, hi):
        return lo + int(self.next() * (hi - lo + 1))


def make_workload(w):
    """w: n, rate (req/s, 0 = all at t=0), plo, phi (new prompt tokens), olo, ohi
    (output tokens), maxtok (max_tokens cap, used by reservations), sys (shared
    system prompt tokens), share (fraction of conversations with it), groups
    (number of distinct system prompts), turns (requests per conversation),
    gap (seconds between turns), seed.
    Returns requests sorted by arrival. Token identity: positions < S come from
    shared prompt g; all other positions from conversation conv (so a later turn
    repeats the earlier turn's prompt and output exactly)."""
    r = Rng(w['seed'])
    reqs = []
    t = 0.0
    nconv = max(1, -(-w['n'] // w['turns']))
    rid = 0
    for c in range(nconv):
        if w['rate'] > 0:
            u = r.next()
            t += math.floor(-math.log(1.0 - u) / w['rate'] * 1e6 + 0.5) / 1e6
        has = r.next() < w['share'] and w['sys'] > 0
        g = r.int(0, w['groups'] - 1) if has else -1
        S = w['sys'] if has else 0
        hist = S
        for k in range(w['turns']):
            if rid >= w['n']:
                break
            U = r.int(w['plo'], w['phi'])
            O = r.int(w['olo'], w['ohi'])
            O = min(O, w['maxtok'])
            P = hist + U
            arr = math.floor((t + k * w['gap']) * 1e6 + 0.5) / 1e6
            reqs.append({'id': rid, 'arr': arr, 'P': P, 'O': O, 'M': w['maxtok'], 'g': g, 'S': S, 'conv': c, 'turn': k})
            hist = P + O
            rid += 1
    reqs.sort(key=lambda q: (q['arr'], q['id']))
    return reqs


# ---------------- step time: roofline plus fixed overhead ----------------
def step_time(hw, m, items):
    """items: list of (c0, n) = tokens already in the cache and new tokens this
    step, one per scheduled sequence. Returns seconds.
    FLOPs = 2 * (P_active - P_lm_head) * tokens + 2 * P_lm_head per sequence (logits only
    for the last position, as engines do) + attention 4 * L * n_q * d_head * context per token
    bytes = weights + KV read and written (kv bytes per token * (c0 + n)) per sequence.
    time = ovh (fixed per step) + ovs per scheduled sequence (sampling, detokenizing,
    streaming: CPU work that grows with the batch) + the larger of compute and memory time."""
    T = 0
    att = 0.0
    kv = 0.0
    for c0, n in items:
        T += n
        att += n * c0 + n * (n + 1) / 2.0
        kv += c0 + n
    fl = 2.0 * (m['Pact'] - m['Plm']) * T + 2.0 * m['Plm'] * len(items) + 4.0 * m['L'] * m['nq'] * m['hd'] * att
    by = m['wbytes'] + m['kvtok'] * kv
    tc = fl / (hw['peak'] * hw['ec'])
    tm = by / (hw['bw'] * hw['em'])
    return hw['ovh'] + hw['ovs'] * len(items) + (tc if tc > tm else tm)


# ---------------- KV memory ----------------
class BlockPool:
    """Paged KV cache, as vLLM's BlockPool: a free queue (least recently freed
    first), reference counts, and a map from block content key to block id for
    prefix caching. Freed blocks keep their key until reallocated."""
    def __init__(self, n):
        self.n = n
        self.free = list(range(n))
        self.key = [None] * n
        self.ref = [0] * n
        self.cache = {}  # key -> list of block ids holding that content (vLLM keeps duplicates)

    def nfree(self):
        return len(self.free)

    def take(self, k):
        out = self.free[:k]
        del self.free[:k]
        for b in out:
            if self.key[b] is not None:
                lst = self.cache[self.key[b]]
                lst.remove(b)
                if not lst:
                    del self.cache[self.key[b]]
                self.key[b] = None
            self.ref[b] = 1
        return out

    def touch(self, blocks):
        for b in blocks:
            if self.ref[b] == 0:
                self.free.remove(b)
            self.ref[b] += 1

    def release(self, blocks):
        """Free a request's blocks, tail first. As vLLM's free_blocks: blocks with no
        cached content go to the front of the free queue (reused first), cached
        ones to the back (evicted last, least recently used order)."""
        first = []
        last = []
        for b in reversed(blocks):
            self.ref[b] -= 1
            if self.ref[b] == 0:
                if self.key[b] is None:
                    first.append(b)
                else:
                    last.append(b)
        self.free = first + self.free + last


class Contig:
    """Contiguous KV: each request reserves one run of slots (prompt + max_tokens)
    at admission, first fit in a linear address space."""
    def __init__(self, cap):
        self.cap = cap
        self.holes = [[0, cap]]

    def alloc(self, size):
        for h in self.holes:
            if h[1] >= size:
                st = h[0]
                h[0] += size
                h[1] -= size
                if h[1] == 0:
                    self.holes.remove(h)
                return st
        return -1

    def release(self, st, size):
        self.holes.append([st, size])
        self.holes.sort(key=lambda h: h[0])
        out = []
        for h in self.holes:
            if out and out[-1][0] + out[-1][1] == h[0]:
                out[-1][1] += h[1]
            else:
                out.append([h[0], h[1]])
        self.holes = out

    def largest(self):
        return max([h[1] for h in self.holes] + [0])

    def freesum(self):
        return sum(h[1] for h in self.holes)


def bkey(q, b, bs):
    """Content key of block b of request q (stands in for vLLM's chained hash)."""
    if q['g'] >= 0 and (b + 1) * bs <= q['S']:
        return 's%d:%d' % (q['g'], b)
    return 'c%d:%d' % (q['conv'], b)



def pool_lookup(pool, key):
    lst = pool.cache.get(key)
    return lst[0] if lst else -1


def pool_insert(pool, key, b):
    if pool.key[b] is not None:
        return
    pool.key[b] = key
    pool.cache.setdefault(key, []).append(b)


def cdiv(a, b):
    return -(-a // b)


# ---------------- one engine (one GPU or one replica) ----------------
class Engine:
    """c: mode ('cont' | 'static'), kv ('paged' | 'contig'), bs (block size),
    nblocks (KV capacity in blocks; contig uses nblocks * bs slots), pc (prefix
    caching), chunk (chunked prefill), budget (max tokens per step), maxseq (max
    sequences in the batch), preempt ('recompute' | 'swap'), swapbw (bytes/s),
    admit ('optimistic', vLLM: admit if the prompt fits, preempt later if the cache
    runs out | 'reserve': admit only if prompt + max_tokens can be guaranteed),
    role ('both' | 'prefill' | 'decode')."""
    def __init__(self, idx, c, hw, m, log):
        self.i = idx
        self.c = c
        self.hw = hw
        self.m = m
        self.t = 0.0
        self.waiting = []
        self.running = []
        self.inbox = []  # [avail_time, seq, q]
        self.log = log
        self.paged = c['kv'] == 'paged'
        self.pool = BlockPool(c['nblocks']) if self.paged else None
        self.ctg = Contig(c['nblocks'] * c['bs']) if not self.paged else None
        self.batch_on = False
        self.dstep = 0
        self.pmax = 0
        self.steps = 0
        self.busy = 0.0
        self.npre = 0

    def has_work(self):
        return len(self.running) > 0 or len(self.waiting) > 0

    # ---- paged allocation, as vLLM KVCacheManager.allocate_slots ----
    def cache_full(self, q, upto):
        bs = self.c['bs']
        if not self.c['pc']:
            return
        nfull = min(upto, q['ntok']) // bs
        while q['ncached'] < nfull:
            b = q['ncached']
            pool_insert(self.pool, bkey(q, b, bs), q['blocks'][b])
            q['ncached'] += 1

    def alloc_run(self, q, n):
        bs = self.c['bs']
        need = cdiv(q['ncomp'] + n, bs) - len(q['blocks'])
        if need < 0:
            need = 0
        if need > self.pool.nfree():
            return False
        q['blocks'] += self.pool.take(need)
        self.cache_full(q, q['ncomp'] + n)
        return True

    def lookup(self, q):
        bs = self.c['bs']
        hits = []
        if not self.c['pc']:
            return hits
        mx = (q['ntok'] - 1) // bs
        for b in range(mx):
            h = pool_lookup(self.pool, bkey(q, b, bs))
            if h < 0:
                break
            hits.append(h)
        return hits

    def alloc_wait(self, q, hits, c0, n):
        bs = self.c['bs']
        ev = 0
        for b in hits:
            if self.pool.ref[b] == 0:
                ev += 1
        full = cdiv(q['ntok'], bs) - len(hits)
        if full < 0:
            full = 0
        if full + ev > self.pool.nfree():
            return False
        if self.c.get('admit') == 'reserve':
            # TensorRT-LLM's GUARANTEED_NO_EVICT: admit only if this request's whole
            # prompt + max_tokens fits next to what running requests may still grow into
            owed = 0
            for r in self.running:
                k = cdiv(r['P'] + r['M'], bs) - len(r['blocks'])
                if k > 0:
                    owed += k
            k = cdiv(q['P'] + q['M'], bs) - len(hits)
            if k + ev + owed > self.pool.nfree():
                return False
        need = cdiv(c0 + n, bs) - len(hits)
        if need < 0:
            need = 0
        if need + ev > self.pool.nfree():
            return False
        self.pool.touch(hits)
        q['blocks'] = list(hits) + self.pool.take(need)
        q['ncached'] = len(hits)
        self.cache_full(q, c0 + n)
        return True

    def free_q(self, q):
        if self.paged:
            self.pool.release(q['blocks'])
            q['blocks'] = []
            q['ncached'] = 0
        elif q['seg'] >= 0:
            self.ctg.release(q['seg'], q['P'] + q['M'])
            q['seg'] = -1

    def preempt(self, v):
        """Recompute: drop the KV, start again from token 0 (vLLM v1's only mode).
        Swap: copy the KV to host memory now and back when resumed."""
        self.npre += 1
        v['npre'] += 1
        extra = 0.0
        if self.c['preempt'] == 'swap':
            v['swp'] = True
            extra = v['ncomp'] * self.m['kvtok'] / self.c['swapbw']
        else:
            v['ncomp'] = 0
        self.free_q(v)
        self.waiting.insert(0, v)
        return extra

    def sched_cont(self):
        c = self.c
        budget = c['budget']
        rows = []
        pre = []
        extra = 0.0
        i = 0
        while i < len(self.running) and budget > 0:
            q = self.running[i]
            n = q['ntok'] - q['ncomp']
            if n > budget:
                n = budget
            if n == 0:
                i += 1
                continue
            ok = True if not self.paged else self.alloc_run(q, n)
            while not ok:
                v = self.running.pop()
                extra += self.preempt(v)
                pre.append(v['id'])
                if v is q:
                    break
                ok = self.alloc_run(q, n)
            if not ok:
                break
            rows.append([q, q['ncomp'], n])
            budget -= n
            i += 1
        if not pre:
            while budget > 0 and self.waiting:
                if len(self.running) >= c['maxseq']:
                    break
                q = self.waiting[0]
                if q['kvin'] or q['swp']:
                    hits = []
                    c0 = q['ncomp']
                else:
                    hits = self.lookup(q) if self.paged else []
                    c0 = len(hits) * c['bs']
                n = q['ntok'] - c0
                if not c['chunk'] and n > budget:
                    break
                if n > budget:
                    n = budget
                if self.paged:
                    if not self.alloc_wait(q, hits, c0, n):
                        break
                else:
                    st = self.ctg.alloc(q['P'] + q['M'])
                    if st < 0:
                        break
                    q['seg'] = st
                self.waiting.pop(0)
                self.running.append(q)
                if q['swp']:
                    extra += q['ncomp'] * self.m['kvtok'] / c['swapbw']
                q['swp'] = False
                q['kvin'] = False
                q['hit'] += len(hits) * c['bs']
                q['ncomp'] = c0
                rows.append([q, c0, n])
                budget -= n
        return rows, pre, extra

    def sched_static(self):
        """Static batching: take up to maxseq requests, reserve each one's
        prompt + max_tokens, prefill them together padded to the longest prompt,
        then decode every row until the longest output is done."""
        c = self.c
        rows = []
        if not self.batch_on:
            while self.waiting and len(self.running) < c['maxseq']:
                q = self.waiting[0]
                if self.paged:
                    need = cdiv(q['P'] + q['M'], c['bs'])
                    if need > self.pool.nfree():
                        break
                    q['blocks'] = self.pool.take(need)
                else:
                    st = self.ctg.alloc(q['P'] + q['M'])
                    if st < 0:
                        break
                    q['seg'] = st
                self.waiting.pop(0)
                self.running.append(q)
            if not self.running:
                return rows
            self.batch_on = True
            self.dstep = 0
            self.pmax = max(q['P'] for q in self.running)
            for q in self.running:
                rows.append([q, 0, self.pmax])
            return rows
        ctx = self.pmax + self.dstep
        for q in self.running:
            rows.append([q, ctx, 1])
        return rows

    def step(self, out):
        """One engine iteration starting at self.t. out(q, t) receives requests
        that leave this engine (finished, or prefilled on a prefill-only engine)."""
        c = self.c
        t0 = self.t
        if c['mode'] == 'static':
            rows = self.sched_static()
            pre = []
            extra = 0.0
        else:
            rows, pre, extra = self.sched_cont()
        if not rows:
            return False
        dt = step_time(self.hw, self.m, [(r[1], r[2]) for r in rows]) + extra
        t1 = t0 + dt
        rec = None
        lv = self.c.get('lv', 2)
        if self.log is not None:
            rec = {'e': self.i, 't': t0, 'dt': dt, 'pre': pre, 'np': 0, 'nd': 0, 'ns': len(rows)}
            if lv >= 2:
                rec['rows'] = []
        done = []
        for r in rows:
            q, c0, n = r
            kind = 'd'
            if c['mode'] == 'static':
                q['ncomp'] = c0 + n  # padded rows still write their KV
                if self.dstep == 0:
                    kind = 'P'
                    emit = True
                else:
                    emit = q['nout'] < q['O']
                    if not emit:
                        kind = 'x'
            else:
                q['ncomp'] = c0 + n
                emit = q['ncomp'] == q['ntok']
                if n > 1 or c0 < q['P']:
                    kind = 'P' if emit else 'p'
            if emit:
                q['nout'] += 1
                q['ntok'] += 1
                q['times'].append(t1)
                if q['first'] < 0:
                    q['first'] = t1
                if q['nout'] >= q['O'] or (c['role'] == 'prefill' and q['nout'] == 1):
                    done.append(q)
            if rec is not None:
                if kind == 'd':
                    rec['nd'] += 1
                elif kind != 'x':
                    rec['np'] += n
                if lv >= 2:
                    rec['rows'].append([q['id'], c0, n, kind])
        if c['mode'] == 'static':
            self.dstep += 1
            if all(q['nout'] >= q['O'] for q in self.running):
                for q in self.running:
                    self.free_q(q)
                    q['done'] = t1
                    out(q, t1)
                self.running = []
                self.batch_on = False
        else:
            for q in done:
                self.running.remove(q)
                self.free_q(q)
                if q['nout'] >= q['O']:
                    q['done'] = t1
                out(q, t1)
        if rec is not None:
            rec['kvu'] = self.kv_used()
            if lv >= 2:
                rec['kv'] = self.kv_state()
            self.log.append(rec)
        self.t = t1
        self.steps += 1
        self.busy += dt
        return True

    def kv_used(self):
        """Paged: blocks held by requests. Contiguous: slots reserved."""
        if self.paged:
            return self.pool.n - self.pool.nfree()
        return self.ctg.cap - self.ctg.freesum()

    def kv_state(self):
        """Snapshot for the KV view: paged -> [owner id or -1 per block, cached-free
        flag]; contiguous -> list of [start, size, owner, used tokens]."""
        if self.paged:
            own = [-1] * self.pool.n
            fill = [0] * self.pool.n
            for q in self.running + self.waiting:
                for k, b in enumerate(q['blocks']):
                    own[b] = q['id']
                    f = q['ncomp'] - k * self.c['bs']
                    fill[b] = self.c['bs'] if f > self.c['bs'] else (f if f > 0 else 0)
            cached = [1 if (self.pool.key[b] is not None and self.pool.ref[b] == 0) else 0 for b in range(self.pool.n)]
            shared = [1 if self.pool.ref[b] > 1 else 0 for b in range(self.pool.n)]
            return {'own': own, 'fill': fill, 'cached': cached, 'shared': shared}
        segs = []
        for q in self.running:
            if q['seg'] >= 0:
                segs.append([q['seg'], q['P'] + q['M'], q['id'], q['ntok']])
        segs.sort()
        return {'segs': segs}


# ---------------- the whole system ----------------
def run(cfg, keep_log=False):
    """keep_log: False, or True to log every step (cfg['c']['lv'] = 1 for a light log
    of counts only, 2 (default) for rows and the KV map too)."""
    """cfg: {w: workload, hw, m, c (engine config), disagg (bool), np, nd
    (prefill and decode engines when disaggregated), reps (replicas otherwise),
    xbw (KV transfer bytes/s between prefill and decode), slo: [ttft, tpot]}."""
    if cfg.get('reqs'):  # an explicit request list instead of a generated workload
        reqs = [dict(q) for q in cfg['reqs']]
        reqs.sort(key=lambda q: (q['arr'], q['id']))
    else:
        reqs = make_workload(cfg['w'])
    for q in reqs:
        q.update({'ntok': q['P'], 'ncomp': 0, 'nout': 0, 'blocks': [], 'ncached': 0, 'seg': -1,
                  'first': -1.0, 'done': -1.0, 'times': [], 'npre': 0, 'hit': 0, 'kvin': False, 'swp': False})
    log = [] if keep_log else None
    engs = []
    if cfg.get('disagg'):
        for k in range(cfg['np']):
            c = dict(cfg['c'])
            c['role'] = 'prefill'
            engs.append(Engine(len(engs), c, cfg['hw'], cfg['m'], log))
        for k in range(cfg['nd']):
            c = dict(cfg['c'])
            c['role'] = 'decode'
            c['pc'] = False
            engs.append(Engine(len(engs), c, cfg['hw'], cfg['m'], log))
        front = [e for e in engs if e.c['role'] == 'prefill']
        back = [e for e in engs if e.c['role'] == 'decode']
    else:
        for k in range(cfg.get('reps', 1)):
            c = dict(cfg['c'])
            c['role'] = 'both'
            engs.append(Engine(len(engs), c, cfg['hw'], cfg['m'], log))
        front = engs
        back = []
    seq = [0]
    fr = [0]
    closed = cfg['w'].get('closed', 0)
    api = cfg.get('api', 0.0)  # fixed client-side latency per request (HTTP, tokenizer), added before the engine sees it
    pending = []
    for j, q in enumerate(reqs):
        if closed and j >= closed:
            pending.append(q)
            continue
        e = front[fr[0] % len(front)]
        fr[0] += 1
        e.inbox.append([q['arr'] + api, seq[0], q])
        seq[0] += 1
    rr = [0]

    def out(q, t):
        if q['done'] >= 0:
            # closed loop: this client sends its next request now
            if pending:
                nq = pending.pop(0)
                nq['arr'] = t
                e = front[fr[0] % len(front)]
                fr[0] += 1
                e.inbox.append([t + api, seq[0], nq])
                seq[0] += 1
            return
        # prefill-only engine: send the KV to a decode engine
        e = back[rr[0] % len(back)]
        rr[0] += 1
        xfer = q['ncomp'] * cfg['m']['kvtok'] / cfg['xbw']
        q['kvin'] = True
        q['xfer'] = xfer
        e.inbox.append([t + xfer, seq[0], q])
        seq[0] += 1

    INF = float('inf')
    guard = 0
    while True:
        best = None
        bt = INF
        for e in engs:
            if e.has_work():
                nt = e.t
            elif e.inbox:
                nt = max(e.t, min(x[0] for x in e.inbox))
            else:
                nt = INF
            if nt < bt:
                bt = nt
                best = e
        if best is None:
            break
        e = best
        e.t = bt
        e.inbox.sort(key=lambda x: (x[0], x[1]))
        while e.inbox and e.inbox[0][0] <= e.t:
            e.waiting.append(e.inbox.pop(0)[2])
        if not e.step(out):
            # nothing could be scheduled: the head request is larger than the whole cache
            q = e.waiting.pop(0)
            q['rej'] = True
        guard += 1
        if guard > 2000000:
            raise RuntimeError('no progress')
    return reqs, engs, log


def pct(a, p):
    """Percentile with linear interpolation (numpy's default)."""
    if not a:
        return 0.0
    s = sorted(a)
    x = (len(s) - 1) * p / 100.0
    lo = int(math.floor(x))
    hi = min(lo + 1, len(s) - 1)
    return s[lo] + (s[hi] - s[lo]) * (x - lo)


def metrics(reqs, engs, slo, skip=0):
    """skip: leave out requests with id < skip (the first wave of a closed-loop run)."""
    ttft, tpot, e2e, itl = [], [], [], []
    good = 0
    nout = 0
    t0 = min(q['arr'] for q in reqs if q['id'] >= skip)
    t1 = t0
    ok = 0
    for q in reqs:
        if q.get('rej') or q['done'] < 0 or q['id'] < skip:
            continue
        ok += 1
        a = q['first'] - q['arr']
        ttft.append(a)
        tp = (q['times'][-1] - q['first']) / (q['O'] - 1) if q['O'] > 1 else 0.0
        tpot.append(tp)
        e2e.append(q['done'] - q['arr'])
        for k in range(1, len(q['times'])):
            itl.append(q['times'][k] - q['times'][k - 1])
        nout += q['nout']
        if q['done'] > t1:
            t1 = q['done']
        if a <= slo[0] and tp <= slo[1]:
            good += 1
    span = t1 - t0 if t1 > t0 else 1e-9
    r = {'n': ok, 'rej': sum(1 for q in reqs if q.get('rej')), 'span': span, 'tps': nout / span, 'rps': ok / span,
         'goodput': good / span, 'good': good, 'npre': sum(e.npre for e in engs),
         'steps': sum(e.steps for e in engs), 'hit': sum(q['hit'] for q in reqs),
         'ptok': sum(q['P'] for q in reqs)}
    for nm, a in (('ttft', ttft), ('tpot', tpot), ('e2e', e2e), ('itl', itl)):
        s = 0.0  # plain left-to-right sum, as in JS (Python 3.12's sum() compensates)
        for v in a:
            s += v
        r[nm] = [pct(a, 50), pct(a, 90), pct(a, 99), (s / len(a)) if a else 0.0, max(a) if a else 0.0]
    return r


if __name__ == '__main__':
    cfg = json.load(open(sys.argv[1]))
    reqs, engs, log = run(cfg, keep_log=True)
    print(json.dumps(metrics(reqs, engs, cfg['slo']), indent=1))
