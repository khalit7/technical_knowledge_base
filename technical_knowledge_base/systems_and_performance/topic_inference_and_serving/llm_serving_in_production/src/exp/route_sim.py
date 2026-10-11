"""Routing what-if: the same Mooncake-derived trace through N replicas with a simple cache model, to extend
the three-replica measurement to other replica counts and cache sizes (simulated, labelled so on the page).

Cache model per replica: an LRU set of prefix blocks (16-token blocks, the trace's own block hashes), capacity
C blocks; a request hits its longest cached prefix, then inserts all its blocks (LRU touch). Requests are
instantaneous for the cache, but hold a load count for `dur` seconds (each request's measured end-to-end time
in the round-robin run) so that least-loaded and the cache-aware rules see load.
Policies: rr, ll, hash2, ca (SGLang rules, defaults 0.3/64/1.5; approximate tree = everything ever routed).
usage: python3 -I route_sim.py <conv.json> <measured rr run json> <out.json>
"""
import hashlib, json, sys
from collections import OrderedDict


def run(trace, dur, policy, N, C, thr=0.3, abs_t=64, rel=1.5):
    caches = [OrderedDict() for _ in range(N)]
    tree = {}                       # prefix tuple -> set of replicas (approximate, never evicted)
    ends = [[] for _ in range(N)]   # end times of requests in flight per replica
    hit = tot = 0; k = 0; per = [0] * N
    for q in trace:
        t = q['t']; b = q['blocks']; n_in = q['n_in']
        for r in range(N):
            ends[r] = [e for e in ends[r] if e > t]
        load = [len(e) for e in ends]
        if policy == 'rr':
            r = k % N; k += 1
        elif policy == 'll':
            r = min(range(N), key=lambda i: (load[i], i))
        elif policy == 'hash2':
            key = json.dumps(b[:2]).encode()
            r = max(range(N), key=lambda i: hashlib.sha256(key + bytes([i])).digest())
        else:  # ca
            m = [0] * N; key = ()
            for j, h in enumerate(b):
                key = key + (h,)
                s = tree.get(key)
                if not s:
                    break
                for i in s:
                    m[i] = j + 1
            mn, mx = min(load), max(load)
            if mx - mn > abs_t and mx > rel * mn:
                r = min(range(N), key=lambda i: (load[i], i))
            elif max(m) * 16 / max(1, n_in) > thr:
                r = max(range(N), key=lambda i: (m[i], -i))
            else:
                r = min(range(N), key=lambda i: (load[i], i))
        if policy == 'ca':
            key = ()
            for h in b:
                key = key + (h,); tree.setdefault(key, set()).add(r)
        c = caches[r]; j = 0; key = ()
        while j < len(b):
            key2 = key + (b[j],)
            if key2 in c:
                key = key2; j += 1
            else:
                break
        hit += min(j * 16, n_in); tot += n_in
        key = ()
        for h in b:
            key = key + (h,)
            c[key] = 1; c.move_to_end(key)
        while len(c) > C:
            c.popitem(last=False)
        ends[r].append(t + dur[q['id']]); per[r] += 1
    return hit / tot, max(per) / len(trace)


def main():
    tr = json.load(open(sys.argv[1]))['requests']
    rr = json.load(open(sys.argv[2]))
    dur = {r['id']: r['e2e'] for r in rr['requests']}
    out = {'N': [1, 2, 3, 4, 8, 16], 'C': [64, 128, 256, 1024, 100000], 'pol': ['rr', 'll', 'hash2', 'ca'], 'hit': {}, 'maxshare': {}}
    for p in out['pol']:
        for N in out['N']:
            for C in out['C']:
                h, ms = run(tr, dur, p, N, C)
                out['hit']['%s_%d_%d' % (p, N, C)] = round(h, 4); out['maxshare']['%s_%d_%d' % (p, N, C)] = round(ms, 4)
        print(p, [out['hit']['%s_%d_256' % (p, N)] for N in out['N']], [out['hit']['%s_%d_100000' % (p, N)] for N in out['N']])
    json.dump(out, open(sys.argv[3], 'w'))


if __name__ == '__main__':
    main()
