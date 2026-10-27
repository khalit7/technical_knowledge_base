"""Replay the paper's test-time memory protocol on the real ALFWorld test tasks (no LLM: only the memory traffic).
Protocol from §3 and Appendix A: the bank starts empty, tasks arrive in a random order in batches of 10 that share
the bank state, BM25 over task descriptions returns the top k = 3 stored trajectories, and a task's trajectory is
stored after its batch if the judge accepts it. Whether a task succeeds is not modelled; it is a coin with
probability p (the judge is assumed to agree with the verifier). BM25 parameters are not given in the paper: Okapi
with k1 = 1.5, b = 0.75 and idf = ln(1 + (N - df + 0.5) / (df + 0.5)); only entries with a positive score are returned.
The same algorithm runs in the page (parts/20_js_stream.js); check_sim.py checks the two agree.
usage: python3 stream_sim.py   (writes inputs/stream.json: averages over 200 orderings at p = 0.774, 0.6 and 1.0)"""
import json, math, os, re, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
G = json.load(open('inputs/alfworld_valid_seen.json'))['games']

def imul(a, b):
    return ((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF)) & 0xFFFFFFFF

def mulberry32js(seed):
    # exact port of the JS mulberry32 in parts/10_js_common.js (Math.imul and >>> semantics)
    s = [seed & 0xFFFFFFFF]
    def r():
        s[0] = (s[0] + 0x6D2B79F5) & 0xFFFFFFFF
        a = s[0]
        t = imul(a ^ (a >> 15), 1 | a)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r

tok = lambda s: [w for w in re.sub(r'[^a-z0-9]+', ' ', s.lower()).split() if w]
TOK = [tok(g['goal']) for g in G]

def run(seed, p, B=10, K=3, k1=1.5, b=0.75):
    rnd = mulberry32js(seed)
    order = list(range(len(G)))
    for i in range(len(order) - 1, 0, -1):
        j = int(rnd() * (i + 1)); order[i], order[j] = order[j], order[i]
    ok = [rnd() < p for _ in order]
    bank = []  # stream positions of stored tasks
    ret = [[] for _ in order]
    for b0 in range(0, len(order), B):
        N = len(bank)
        if N:
            df = {}
            for q in bank:
                for w in set(TOK[order[q]]): df[w] = df.get(w, 0) + 1
            avg = sum(len(TOK[order[q]]) for q in bank) / N
        for pos in range(b0, min(b0 + B, len(order))):
            if not N: continue
            qt = TOK[order[pos]]; sc = []
            for bi, q in enumerate(bank):
                d = TOK[order[q]]; L = len(d); s = 0.0
                for w in qt:
                    f = d.count(w)
                    if not f: continue
                    idf = math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5))
                    s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * L / avg))
                if s > 0: sc.append((-s, bi, q))
            sc.sort()
            ret[pos] = [q for _, _, q in sc[:K]]
        for pos in range(b0, min(b0 + B, len(order))):
            if ok[pos]: bank.append(pos)
    return order, ok, ret

def stats(order, ok, ret):
    n = len(order); typ = lambda pos: G[order[pos]]['type']
    R = [(pos, q) for pos in range(n) for q in ret[pos]]
    uses = {}
    for pos, q in R: uses.setdefault(q, []).append(pos)
    stored = [pos for pos in range(n) if ok[pos] and pos < n - 10]  # stored before the last batch could be used
    first = [min(uses[q]) - q for q in stored if q in uses]
    allu = [pos - q for pos, q in R]
    cons_types = [len(set(typ(c) for c in uses[q])) for q in stored if q in uses]
    other = [any(typ(c) != typ(q) for c in uses[q]) for q in stored if q in uses]
    return {'tasks': n, 'zero_ret': sum(1 for x in ret if not x), 'lt_k': sum(1 for x in ret if len(x) < 3),
            'retrievals': len(R), 'same_type': sum(typ(p) == typ(q) for p, q in R) / max(1, len(R)),
            'top1_same_type': sum(typ(p) == typ(ret[p][0]) for p in range(n) if ret[p]) / max(1, sum(1 for x in ret if x)),
            'stored': len(stored), 'never_used': sum(1 for q in stored if q not in uses) / max(1, len(stored)),
            'first_delay_mean': st.mean(first) if first else 0, 'first_delay_median': st.median(first) if first else 0,
            'use_delay_mean': st.mean(allu) if allu else 0, 'consumers_mean': st.mean(len(uses[q]) for q in stored if q in uses) if first else 0,
            'consumer_types_mean': st.mean(cons_types) if cons_types else 0, 'other_type_share': sum(other) / max(1, len(other)),
            'max_consumers': max((len(v) for v in uses.values()), default=0)}

if __name__ == '__main__':
    out = {}
    for p in (0.774, 0.6, 1.0):
        S = [stats(*run(seed, p)) for seed in range(1, 201)]
        out[str(p)] = {k: round(st.mean(s[k] for s in S), 4) for k in S[0]}
    # one reference run for check_sim.py
    o, ok, ret = run(7, 0.774)
    out['ref'] = {'seed': 7, 'p': 0.774, 'order': o[:20], 'ok': [int(x) for x in ok[:20]], 'ret': ret[:60], 'stats': stats(o, ok, ret)}
    json.dump(out, open('inputs/stream.json', 'w'), indent=1)
    for k in ('0.774', '0.6', '1.0'): print(k, out[k])
