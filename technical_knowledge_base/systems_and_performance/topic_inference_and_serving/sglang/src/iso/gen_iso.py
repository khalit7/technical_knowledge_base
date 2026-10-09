"""Every isolated result the page shows, from the reference models (held identical to the real SGLang and vLLM
classes by check_real.py and sched.py --check). Writes out/iso.json; check_js.mjs requires the page's JavaScript
to reproduce all of it."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces, ref, sched  # noqa: E402

CAPS = [6000, 12000, 24000, 48000, 96000, 1000000]
out = {'cache': [], 'sched': []}
for name in ['chat', 'agent', 'unique', 'rag']:
    reqs = traces.get(name)
    prompt = sum(q['P'] for q in reqs)
    for cap in CAPS:
        row = {'trace': name, 'cap': cap, 'prompt_tokens': prompt, 'requests': len(reqs)}
        for kind in ['radix', 'blocks']:
            res, c = ref.run(kind, reqs, traces.tokens, cap)
            row[kind] = {'hit': sum(r[1] for r in res), 'evicted': sum(r[2] for r in res)}
            if kind == 'radix':
                row[kind]['nodes'] = c.nodes
                row[kind]['per_req'] = [r[1] for r in res]
            else:
                row[kind]['per_req'] = [r[1] for r in res]
                row[kind]['cached_blocks'] = sum(1 for h in c.hash if h is not None)
        out['cache'].append(row)
        print(name, cap, row['radix']['hit'], row['blocks']['hit'], file=sys.stderr)
# curves: hit share against pool size, more capacities, totals only
CURVE = [3000, 4000, 6000, 8000, 12000, 16000, 24000, 32000, 48000, 64000, 96000]
out['curve'] = {}
for name in ['chat', 'agent', 'unique', 'rag']:
    reqs = traces.get(name)
    need = max(q['P'] + q['O'] - 1 for q in reqs)
    pts = []
    for cap in CURVE:
        if cap < need:
            continue
        rr, _ = ref.run('radix', reqs, traces.tokens, cap)
        bb, _ = ref.run('blocks', reqs, traces.tokens, cap)
        pts.append([cap, sum(r[1] for r in rr), sum(r[1] for r in bb)])
    out['curve'][name] = pts
    print('curve', name, file=sys.stderr)
# scheduling: questions about documents, all arriving at once in a shuffled order
for nq in (96, 160):
    for cap in (3000, 6000):
        for policy in ['fcfs', 'lpm', 'dfs-weight', 'random']:
            for seed in range(1, 11):
                reqs = traces.rag_trace(nq=nq)
                r = sched.run('rag', cap, policy, seed=seed, reqs=reqs)
                out['sched'].append({'nq': nq, 'cap': cap, 'policy': policy, 'seed': seed, 'rounds': r['rounds'],
                                     'hit': r['hit_tokens'], 'prompt': r['prompt_tokens']})
json.dump(out, open(os.path.join(HERE, 'out', 'iso.json'), 'w'))
