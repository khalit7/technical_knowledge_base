"""The KV cache simulator, in Python. parts/12_js_sim.js is a line-for-line port; check_page.mjs asserts that the page's
numbers for the default runs equal the ones written here (inputs/sim_check.json).

What it models (all from the paper; the scale is OPT-13B on one A100-40GB, Table 1):
- 12 GiB of KV cache at 800 KiB per token = 15,728 token slots (§3, Table 1).
- A saturated request queue, as in Figure 13, where every system is past its capacity (ShareGPT at 2 req/s and
  Alpaca at 30 req/s are beyond every curve's knee in Figure 12a and 12d). Prompt and output lengths are drawn
  independently from the Figure 11 histograms (read from the vector graphics), then filtered as the authors' released
  benchmark script does (prompt and output at least 4 tokens, prompt at most 1,024, total at most 2,048); with n
  samples per request every sample runs to the trace's output length (the script's ignore_eos). Independence of
  prompt and output length is an assumption: the real traces pair them.
- Iteration-level scheduling (§2.3) for every system: each step a running request appends one token; a newly admitted
  request stores its whole prompt in its first step; a sequence is done when it holds prompt + output tokens.
- Orca (Max / Pow2 / Oracle) (§6.1): reserve 2,048 slots, or prompt + the output rounded up to a power of two (at most
  2x), or prompt + the true output; the buddy allocator rounds every chunk up to a power of two. FCFS admission;
  a reservation never runs out, so nothing is preempted.
- vLLM (§4.2 to §4.5): blocks of B slots allocated on demand; FCFS admission when the prompt's blocks are free
  (keeping 1% of blocks free, the released v0.1.0 code's watermark);
  when a running sequence needs a block and none is free, the latest-arrived request group is preempted by
  recomputation (its blocks freed, it returns to the front of the queue and refills prompt + generated tokens).
  No new request is admitted in a step that preempted.
- Every system gets the released vLLM v0.1.0 scheduler limits (not in the paper): at most 2,560 tokens per step
  (one per running sequence plus each admitted prompt) and at most 256 running sequences.
- Parallel sampling with n outputs: the n sequences of a request share the prompt's full blocks (reference counts);
  the partial last prompt block is copied on write, so each sequence owns one; Orca stores n separate chunks.
Memory categories (Figure 2): token states (slots holding a token), reservation (reserved slots that will be
filled), internal fragmentation (reserved slots that never will be), external fragmentation and others (buddy
rounding and free memory).
usage: python3 sim.py   (writes inputs/sim_check.json)"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))

def mulberry32(a):
    st = [a & 0xFFFFFFFF]
    def imul(x, y): return ((x & 0xFFFFFFFF) * (y & 0xFFFFFFFF)) & 0xFFFFFFFF
    def r():
        st[0] = (st[0] + 0x6D2B79F5) & 0xFFFFFFFF
        a = st[0]
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r

def sampler(bins, rnd):
    """bins: [[left, right, density], ...] -> draw an integer length (at least 1)."""
    mass = [d * (r - l) for l, r, d in bins]; tot = sum(mass); cum = []; c = 0
    for m in mass: c += m / tot; cum.append(c)
    def draw():
        u = rnd(); i = 0
        while i < len(cum) - 1 and u > cum[i]: i += 1
        l, r, _ = bins[i]
        return max(1, int(l + (r - l) * rnd()))
    return draw

def pow2(x):
    p = 1
    while p < x: p *= 2
    return p

class Buddy:
    """Buddy allocator over [0, total): free lists per power of two; the pool is split into power-of-two regions."""
    def __init__(self, total):
        self.free = {}; off = 0; s = 1
        while s * 2 <= total: s *= 2
        while s >= 1:
            if off + s <= total: self.free.setdefault(s, []).append(off); off += s
            else: s //= 2
        self.used = {}
    def alloc(self, size):
        s = pow2(size); c = s
        while c not in self.free or not self.free[c]:
            c *= 2
            if c > 1 << 30: return None
        off = min(self.free[c]); self.free[c].remove(off)
        while c > s:
            c //= 2; self.free.setdefault(c, []).append(off + c)
        self.used[off] = s
        return off
    def release(self, off):
        s = self.used.pop(off)
        while True:
            bud = off ^ s
            if s in self.free and bud in self.free[s] and (min(off, bud) // (2 * s)) * 2 * s == min(off, bud):
                self.free[s].remove(bud); off = min(off, bud); s *= 2
            else: break
        self.free.setdefault(s, []).append(off)

def run(system, data, F, steps=6000, warm=1500, slots=15728, block=16, n=1, seed=1, max_len=2048, reqs=None, trace=None,
        watermark=0.01, max_tokens=2560, max_seqs=256):
    """One simulated serving run; returns time averages over the steps after warm-up (fractions in % of all slots).
    reqs: an optional fixed list of (prompt, [outputs]) used instead of the histograms (the toy animation)."""
    rnd = mulberry32(seed)
    H = F['fig11_' + data]['bins'] if F else None
    din, dout = (sampler(H['input'], rnd), sampler(H['output'], rnd)) if H else (None, None)
    nxt = [0]
    def new_req():
        if reqs is not None:
            if nxt[0] >= len(reqs): return None
            p, outs = reqs[nxt[0]]
        else:
            while True:  # the released benchmark's filter (benchmarks/benchmark_serving.py, v0.1.7)
                p = din(); o = dout()
                if 4 <= p <= 1024 and o >= 4 and p + o <= max_len: break
            outs = [o] * n  # ignore_eos with max_tokens = the trace's output length: all n samples equally long
        nxt[0] += 1
        k = len(outs)
        return dict(id=nxt[0], p=p, outs=list(outs), g=[0] * k, done=[False] * k, st=[0] * k)
    waiting, running = [], []
    paged = system == 'vllm'
    free = [slots // block] if paged else None
    wm = int(watermark * (slots // block)) if paged else 0
    bud = None if paged else Buddy(slots)
    acc = dict(batch=0, seqs=0, token=0, resv=0, internal=0, saved=0, unshared=0, preempt=0, finished=0, gen=0)
    m = 0

    def admit(r):
        k = len(r['outs'])
        if paged:
            sh = r['p'] // block
            bl = [0 if r['done'][i] else -(-(r['p'] + r['g'][i]) // block) - sh for i in range(k)]
            need = sh + sum(bl)
            if free[0] - need < wm: return False
            free[0] -= need; r['sh'] = sh; r['bl'] = bl
        else:
            R = [max_len if system == 'max' else min(max_len, r['p'] + pow2(o)) if system == 'pow2' else r['p'] + o for o in r['outs']]
            offs = []
            for i in range(k):
                if r['done'][i]: offs.append(None); continue
                off = bud.alloc(R[i])
                if off is None:
                    for x in offs:
                        if x is not None: bud.release(x)
                    return False
                offs.append(off)
            r['R'] = R; r['off'] = offs
        r['st'] = [r['p'] + r['g'][i] for i in range(k)]
        return True

    def release(r):
        if paged:
            free[0] += r['sh'] + sum(r['bl']); r['sh'] = 0; r['bl'] = [0] * len(r['bl'])
        else:
            for x in r['off']:
                if x is not None: bud.release(x)
            r['off'] = [None] * len(r['off'])

    for step in range(steps):
        while len(waiting) < 64:
            q = new_req()
            if q is None: break
            waiting.append(q)
        preempted = False
        if paged:
            k = 0
            while k < len(running):
                r = running[k]
                need = sum(1 for i in range(len(r['outs'])) if not r['done'][i] and r['st'][i] + 1 > (r['sh'] + r['bl'][i]) * block)
                gone = False
                while need > free[0]:
                    v = running.pop()  # preempt the latest-arrived request group
                    release(v); waiting.insert(0, v); acc['preempt'] += 1; preempted = True
                    if v is r: gone = True; break
                if gone: break
                for i in range(len(r['outs'])):
                    if not r['done'][i] and r['st'][i] + 1 > (r['sh'] + r['bl'][i]) * block:
                        r['bl'][i] += 1; free[0] -= 1
                k += 1
        fin = []
        for r in running:
            for i in range(len(r['outs'])):
                if r['done'][i]: continue
                r['st'][i] += 1; r['g'][i] += 1
                if step >= warm: acc['gen'] += 1
                if r['g'][i] >= r['outs'][i]:
                    r['done'][i] = True
                    if paged: free[0] += r['bl'][i]; r['bl'][i] = 0
                    else: bud.release(r['off'][i]); r['off'][i] = None
            if all(r['done']): fin.append(r)
        for r in fin:
            if paged: free[0] += r['sh']; r['sh'] = 0
            running.remove(r)
            if step >= warm: acc['finished'] += 1
        if not preempted:
            # the step's token budget: one token per running sequence plus each admitted prompt (vLLM v0.1.0 defaults)
            ntok = sum(1 for r in running for i in range(len(r['outs'])) if not r['done'][i])
            nseq = ntok
            while waiting:
                h = waiting[0]; live = sum(1 for i in range(len(h['outs'])) if not h['done'][i])
                if ntok + h['p'] + max(h['g']) > max_tokens or nseq + live > max_seqs: break
                if not admit(h): break
                running.append(waiting.pop(0)); ntok += h['p'] + max(h['g']); nseq += live
        running.sort(key=lambda r: r['id'])
        if trace is not None: trace.append(snapshot(running, waiting, paged, block, free, bud))
        if step >= warm:
            m += 1
            tok = resv = internal = saved = unshared = 0
            for r in running:
                live = [i for i in range(len(r['outs'])) if not r['done'][i]]
                if paged:
                    base = r['sh'] * block
                    tok += base; unshared += len(live) * r['sh']; saved += max(0, len(live) - 1) * r['sh']
                    for i in live:
                        fl = r['p'] + r['outs'][i] - base; own = r['bl'][i] * block; t = r['st'][i] - base
                        tok += t; resv += min(own, fl) - t; internal += max(0, own - fl); unshared += r['bl'][i]
                else:
                    for i in live:
                        fl = r['p'] + r['outs'][i]; own = r['R'][i]; t = r['st'][i]
                        tok += t; resv += min(own, fl) - t; internal += max(0, own - fl)
                acc['seqs'] += len(live)
            acc['batch'] += len(running); acc['token'] += tok; acc['resv'] += resv; acc['internal'] += internal
            acc['saved'] += saved; acc['unshared'] += unshared
    S = slots; m = max(m, 1)
    out = dict(batch=acc['batch'] / m, seqs=acc['seqs'] / m, token=100 * acc['token'] / m / S, resv=100 * acc['resv'] / m / S,
               internal=100 * acc['internal'] / m / S, preempt=acc['preempt'], finished=acc['finished'], tokens_per_step=acc['gen'] / m,
               saving=100 * acc['saved'] / acc['unshared'] if acc['unshared'] else 0)
    out['external'] = 100 - out['token'] - out['resv'] - out['internal']
    return out

def snapshot(running, waiting, paged, block, free, bud):
    return dict(run=[r['id'] for r in running], wait=[r['id'] for r in waiting])

if __name__ == '__main__':
    F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
    res = {}
    for data in ('sharegpt', 'alpaca'):
        for sysn in ('max', 'pow2', 'oracle', 'vllm'):
            r = run(sysn, data, F); res[data + '_' + sysn] = r
            print(data, sysn, {k: round(v, 2) for k, v in r.items()})
    for n in (2, 4, 6):
        for data in ('alpaca', 'sharegpt'):
            r = run('vllm', data, F, n=n); res['%s_vllm_n%d' % (data, n)] = r
            print(data, 'vllm n', n, {k: round(v, 2) for k, v in r.items()})
            r = run('oracle', data, F, n=n); res['%s_oracle_n%d' % (data, n)] = r
            print(data, 'oracle n', n, {k: round(v, 2) for k, v in r.items()})
    for b in (1, 4, 8, 32, 64, 128, 256):
        r = run('vllm', 'alpaca', F, block=b); res['alpaca_vllm_b%d' % b] = r
        print('alpaca block', b, {k: round(v, 2) for k, v in r.items()})
    json.dump(res, open(os.path.join(HERE, 'inputs', 'sim_check.json'), 'w'), indent=1)
