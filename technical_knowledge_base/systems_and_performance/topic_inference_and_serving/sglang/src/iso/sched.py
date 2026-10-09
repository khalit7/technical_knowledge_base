"""Cache-aware scheduling in isolation: a queue of requests that all arrive at once, a KV pool of C tokens,
and a simplified SGLang prefill loop run in rounds.

Each round: match every waiting request against the tree; order the queue by the policy; admit requests in
that order while each one's new tokens plus its output reservation fit (pool free + evictable - already
reserved) and the round's prefill tokens stay under max_prefill_tokens (16,384, schedule.py); stop at the
first that does not fit (the scheduler breaks out of its loop the same way); run the admitted requests to
completion, inserting each into the tree. Simplification, said on the page: a round runs to completion
(no continuous batching across rounds) and reservations use the request's real output length.

Policies (schedule_policy.py, SGLang v0.5.21): fcfs (default), lpm (longest prefix match, with in-batch
prefix caching, and plain FCFS order while more than 128 requests wait: a request whose own match is <= 32 tokens but which shares >= 32 tokens with an earlier
queued request is moved to the back, L373-L431), dfs-weight (base_prefix_cache.py L325), random.

With --check, every ordering is also computed by SGLang's own SchedulePolicy.calc_priority on a shadow
RadixCache that receives the same operations, and must be identical. Usage: sched.py <trace> <cap> [--check]
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces, ref  # noqa: E402
from traces import sim  # noqa: E402


def shuffle(a, rng):
    """Fisher-Yates with the simulator's mulberry32 generator (the page's JavaScript does the same)."""
    for i in range(len(a) - 1, 0, -1):
        j = int(rng.next() * (i + 1))
        a[i], a[j] = a[j], a[i]

TH = 32           # IN_BATCH_PREFIX_CACHING_CHECK_THRESHOLD and ..._DEPRIORITIZE_THRESHOLD defaults
MAX_PREFILL = 16384


def dfs_order(root, nodes):
    """base_prefix_cache._dfs_weight_order on the ref tree: requests grouped by last matched node; subtrees
    with more waiting requests first; a node's own requests after its children's."""
    at = {}
    for i, n in enumerate(nodes):
        at.setdefault(n, []).append(i)
    w = {n: len(v) for n, v in at.items()}
    stack = [(root, False)]
    while stack:
        n, vis = stack.pop()
        if vis:
            w[n] = w.get(n, 0) + sum(w.get(c, 0) for c in n.children.values())
            continue
        stack.append((n, True))
        for c in reversed(list(n.children.values())):
            stack.append((c, False))
    order = []
    stack = [(root, False)]
    while stack:
        n, vis = stack.pop()
        if vis:
            order.extend(at.get(n, ()))
            continue
        ch = sorted(n.children.values(), key=lambda c: -w.get(c, 0))
        stack.append((n, True))
        for c in reversed(ch):
            stack.append((c, False))
    return order


def order_queue(policy, tree, W, ids_of, rng):
    """Returns the queue reordered, and each request's matched length."""
    m = {}
    nodes = []
    for q in W:
        P = q['P']
        h, node = tree.match(ids_of(q)[:P - 1])
        m[q['id']] = h
        nodes.append(node)
    if policy == 'fcfs' or (policy == 'lpm' and len(W) > 128):
        # LPM turns itself off when more than 128 requests wait (_determine_active_policy, L331)
        return list(W), m
    if policy == 'random':
        W2 = list(W)
        shuffle(W2, rng)
        return W2, m
    if policy == 'dfs-weight':
        return [W[i] for i in dfs_order(tree.root, nodes)], m
    # lpm with in-batch prefix caching (a throwaway tree of the waiting queue's prompts)
    wq = ref.Radix(10 ** 15)
    dep = set()
    for q in W:
        if m[q['id']] <= TH:
            pids = ids_of(q)[:q['P']]
            h, _ = wq.match(pids)
            if h >= TH:
                dep.add(q['id'])
            else:
                wq.insert(pids)
    key = lambda q: (float('inf') if q['id'] in dep else -m[q['id']])
    return sorted(W, key=key), m


def run(name, cap, policy, seed=1, shadow=None, reqs=None):
    reqs = traces.get(name) if reqs is None else reqs
    if shadow is not None:
        shadow.reset()
    order0 = list(reqs)
    shuffle(order0, sim.Rng(seed))            # arrival order: shuffled, all at t = 0
    tree = ref.Radix(cap)
    ids_of = lambda q: traces.tokens(q, q['P'] + q['O'] - 1)
    rng = sim.Rng(seed + 100)
    W = order0
    rounds = []
    hits = {}
    while W:
        Wo, m = order_queue(policy, tree, W, ids_of, rng)
        if shadow is not None:
            shadow.check(policy, W, Wo, m)
        budget = tree.free + tree.size   # between rounds nothing is locked, so the whole tree is evictable
        adm, used_in = [], 0
        for q in Wo:
            new = q['P'] - m[q['id']]
            tot = new + q['O']
            if tot > budget or used_in + new > MAX_PREFILL:
                break
            adm.append(q)
            budget -= tot
            used_in += new
        if not adm:
            raise RuntimeError('nothing fits')
        # run the round: match again, lock, allocate (evicting), insert, unlock
        locked = []
        for q in adm:
            h, node = tree.match(ids_of(q)[:q['P'] - 1])
            tree.lock(node, 1)
            locked.append((q, h, node))
        need_total = sum((q['P'] - h) + (q['O'] - 1) for q, h, _ in locked)
        if tree.free < need_total:
            tree.evict(need_total - tree.free)
        tree.free -= need_total
        for q, h, node in locked:
            ids = ids_of(q)
            pre = tree.insert(ids[:q['P'] + q['O'] - 1])
            tree.insert(ids[:q['P']])
            tree.free += pre - h
            hits[q['id']] = h
        for q, h, node in locked:
            tree.lock(node, -1)
        if shadow is not None:
            shadow.apply(adm, locked, ids_of)
        rounds.append({'admitted': [q['id'] for q in adm], 'hit': sum(h for _, h, _ in locked),
                       'prefill': sum(q['P'] - h for q, h, _ in locked)})
        done = {q['id'] for q in adm}
        W = [q for q in W if q['id'] not in done]
    prompt = sum(q['P'] for q in reqs)
    return {'trace': name, 'cap': cap, 'policy': policy, 'rounds': len(rounds), 'hit_tokens': sum(hits.values()),
            'prompt_tokens': prompt, 'prefill_tokens': prompt - sum(hits.values()), 'round_log': rounds}


if __name__ == '__main__':
    name, cap = sys.argv[1], int(sys.argv[2])
    shadow = None
    if '--check' in sys.argv:
        import shadow_sglang
        shadow = shadow_sglang.Shadow(cap)
    res = {p: run(name, cap, p, shadow=shadow) for p in ['fcfs', 'lpm', 'dfs-weight', 'random']}
    for p, r in res.items():
        print(p, r['rounds'], r['hit_tokens'], r['prefill_tokens'], file=sys.stderr)
    if shadow is not None:
        print('orders checked against SGLang SchedulePolicy:', shadow.checked, 'mismatches:', shadow.bad, file=sys.stderr)
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'round_log'} for k, v in res.items()}))
