"""Replay a trace through a small router in front of N llama-server replicas (standard library only).

The router runs inside this client: for each request, at its arrival time (open loop), it picks a replica
with one of the policies below, then streams the completion from that replica's /completion endpoint
with the prompt given as token ids. llama-server returns, per request, how many prompt tokens came from
its cache (timings.cache_n) and how many it computed (timings.prompt_n): the hit rate is measured, not inferred.

Policies
  rr     round robin
  ll     least loaded: fewest requests in flight from this router (ties: lowest index)
  hash1  consistent (rendezvous) hash of the first block (16 tokens = the shared system prompt here)
  hash2  rendezvous hash of the first two blocks (system prompt + start of the conversation)
  ca     SGLang Model Gateway cache_aware (sgl-model-gateway/src/policies/cache_aware.rs, v0.5.21):
         if (max_load - min_load) > ABS and max_load > REL * min_load: least loaded;
         else longest approximate prefix match; if match rate > THR go to the replica holding it,
         otherwise least loaded (random tie). The tree records what was routed, not what the replica kept.
         CLI defaults THR 0.3, ABS 64, REL 1.5 (main.rs); env CA_THR, CA_ABS, CA_REL override.
  wt     llm-d style weighted scorers: 3 x prefix match fraction + 2 x queue score (min-max scaled,
         shorter queue = 1), highest total wins (weights from Red Hat's llm-d scheduler example).
usage: python3 -I route_client.py <trace.json> <policy> <out.json> <port0> <n_replicas> [seed]
"""
import http.client, json, os, random, sys, threading, time, hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prtrace import tokens_of, B  # noqa: E402


class Router:
    def __init__(self, policy, n, seed):
        self.p, self.n = policy, n
        self.rng = random.Random(seed)
        self.load = [0] * n
        self.k = 0
        self.tree = {}          # prefix (tuple of block-hashes of the token chunks) -> {replica: last use}
        self.lock = threading.Lock()
        self.thr = float(os.environ.get('CA_THR', 0.3)); self.abs = int(os.environ.get('CA_ABS', 64)); self.rel = float(os.environ.get('CA_REL', 1.5))
        self.log = []

    def chunks(self, toks):
        return [hash(tuple(toks[i:i + B])) for i in range(0, len(toks), B)]

    def match(self, ch):
        """longest prefix (in chunks) per replica"""
        best = [0] * self.n
        key = ()
        for j, c in enumerate(ch):
            key = key + (c,)
            owners = self.tree.get(key)
            if not owners:
                break
            for r in owners:
                best[r] = j + 1
        return best

    def insert(self, ch, r, now):
        key = ()
        for c in ch:
            key = key + (c,)
            self.tree.setdefault(key, {})[r] = now

    def least(self, rand=True):
        m = min(self.load)
        c = [i for i in range(self.n) if self.load[i] == m]
        return self.rng.choice(c) if rand else c[0]

    def pick(self, toks, now):
        with self.lock:
            ch = self.chunks(toks)
            info = {}
            if self.p == 'rr':
                r = self.k % self.n; self.k += 1
            elif self.p == 'll':
                r = self.least(rand=False)
            elif self.p in ('hash1', 'hash2'):
                kb = 1 if self.p == 'hash1' else 2
                key = json.dumps(toks[:kb * B]).encode()
                r = max(range(self.n), key=lambda i: hashlib.sha256(key + bytes([i])).digest())
            elif self.p == 'ca':
                mn, mx = min(self.load), max(self.load)
                m = self.match(ch)
                rate = max(m) * B / max(1, len(toks))
                if mx - mn > self.abs and mx > self.rel * mn:
                    r = self.least(); info['mode'] = 'imbalanced'
                elif rate > self.thr:
                    top = max(m); cands = [i for i in range(self.n) if m[i] == top]
                    # among replicas holding the longest match, the one used most recently for it
                    key = tuple(ch[:top])
                    r = max(cands, key=lambda i: self.tree[key].get(i, -1)); info['mode'] = 'cache'
                else:
                    r = self.least(); info['mode'] = 'low-match'
                info['rate'] = round(rate, 3)
            elif self.p == 'wt':
                m = self.match(ch)
                mn, mx = min(self.load), max(self.load)
                qs = [1.0 if mx == mn else (mx - l) / (mx - mn) for l in self.load]
                sc = [3 * min(1.0, m[i] * B / max(1, len(toks))) + 2 * qs[i] for i in range(self.n)]
                top = max(sc); r = self.rng.choice([i for i in range(self.n) if sc[i] == top])
            else:
                raise SystemExit('unknown policy ' + self.p)
            self.insert(ch, r, now)
            self.load[r] += 1
            info['loads'] = list(self.load)
            return r, info

    def done(self, r):
        with self.lock:
            self.load[r] -= 1


GEN = {}   # root8 only: the token ids each conversation's first turn really generated


def prompt_tokens(q):
    if 'parts' in q and q.get('turn') == 2 and q['conv'] in GEN:
        # resend the answer exactly as generated (a chat client resends text, which may re-tokenize differently)
        parts = [p for p in q['parts'] if not p[0].endswith('A')]
        t = tokens_of({'parts': parts[:2]}) + GEN[q['conv']] + tokens_of({'parts': parts[2:]})
        return t
    return tokens_of(q)


def run_one(q, router, port0, t0, res):
    if 'parts' in q and q.get('turn') == 2:
        while q['conv'] not in GEN:     # root8burst: a second turn needs its first turn's answer
            time.sleep(0.01)
    toks = prompt_tokens(q)
    lag = q.get('t', 0) - (time.monotonic() - t0)
    if lag > 0:
        time.sleep(lag)
    ts = time.monotonic() - t0
    r, info = router.pick(toks, ts)
    body = json.dumps({'prompt': toks, 'n_predict': q['n_out'], 'stream': True, 'cache_prompt': True,
                       'ignore_eos': True, 'temperature': 0.0, 'return_tokens': 'parts' in q}).encode()
    rec = {'id': q['id'], 'conv': q.get('conv'), 'rep': r, 'sched': q.get('t', 0), 'send': round(ts, 4), 'n_in': len(toks), 'n_out': q['n_out'], **info}
    try:
        c = http.client.HTTPConnection('127.0.0.1', port0 + r, timeout=600)
        c.request('POST', '/completion', body, {'Content-Type': 'application/json'})
        resp = c.getresponse()
        if resp.status != 200:
            raise RuntimeError('HTTP %d %s' % (resp.status, resp.read()[:160]))
        first = None; last = None; gen = []
        while True:
            line = resp.readline()
            if not line:
                break
            line = line.strip()
            if not line.startswith(b'data: '):
                continue
            d = json.loads(line[6:])
            now = time.monotonic() - t0
            if first is None and (d.get('content') or d.get('tokens')):
                first = now
            gen += d.get('tokens') or []
            if d.get('stop'):
                last = d
                break
        c.close()
        if 'parts' in q and q.get('turn') == 1:
            GEN[q['conv']] = gen[:q['n_out']]
        end = time.monotonic() - t0
        tm = (last or {}).get('timings', {})
        rec.update({'ttft': round((first or end) - ts, 4), 'e2e': round(end - ts, 4), 'cache_n': tm.get('cache_n'), 'prompt_n': tm.get('prompt_n'),
                    'prompt_ms': tm.get('prompt_ms'), 'pred_n': tm.get('predicted_n'), 'pred_ms': tm.get('predicted_ms')})
    except Exception as e:  # recorded, never hidden
        rec['error'] = repr(e)
    router.done(r)
    res.append(rec)


def main():
    trace, policy, out, port0, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
    seed = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    T = json.load(open(trace))['requests']
    seq = os.path.basename(trace) == 'root8.json'   # sequential: each request waits for the one before
    if seq:
        for k, q in enumerate(T):
            q['t'] = 0
    router = Router(policy, n, seed)
    res = []
    la0 = os.getloadavg()[0]
    t0 = time.monotonic()
    if seq:
        for q in T:
            run_one(q, router, port0, t0, res)
    else:
        th = [threading.Thread(target=run_one, args=(q, router, port0, t0, res)) for q in T]
        for t in th:
            t.start()
        for t in th:
            t.join()
    wall = time.monotonic() - t0
    res.sort(key=lambda r: r['id'])
    json.dump({'policy': policy, 'trace': os.path.basename(trace), 'seed': seed, 'n_replicas': n, 'wall_s': round(wall, 2),
               'loadavg_before': round(la0, 2), 'loadavg_after': round(os.getloadavg()[0], 2),
               'ca': {'thr': router.thr, 'abs': router.abs, 'rel': router.rel}, 'requests': res}, open(out, 'w'))
    ok = [r for r in res if 'error' not in r]
    cn = sum(r['cache_n'] or 0 for r in ok); pn = sum(r['prompt_n'] or 0 for r in ok)
    tt = sorted(r['ttft'] for r in ok)
    print(policy, 'n', len(res), 'err', len(res) - len(ok), 'hit %.3f' % (cn / max(1, cn + pn)), 'computed', pn,
          'ttft p50 %.3f p90 %.3f p99 %.3f' % (tt[len(tt) // 2], tt[int(len(tt) * .9)], tt[min(len(tt) - 1, int(len(tt) * .99))]), 'wall %.1f' % wall)


if __name__ == '__main__':
    main()
