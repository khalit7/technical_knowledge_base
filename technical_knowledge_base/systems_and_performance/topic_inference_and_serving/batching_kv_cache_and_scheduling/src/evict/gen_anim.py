"""The Reading tab's eviction animation: 16 consecutive requests of the Mooncake tool-and-agent trace (requests 11,890
to 11,905, chosen by searching the trace for a stretch where the policies differ) through a tiny cache.
usage: python3 -I gen_anim.py <traces dir> <out.json>"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import evict
R = evict.load(os.path.join(sys.argv[1], 'toolagent_trace.jsonl'))
S0 = 11890
W = R[S0:S0 + 16]
# short labels: shared families keep their order, request-specific blocks get a running number
fam = {46: 'A', 74: 'B', 0: 'S'}
lab = {}
for r in W:
    H = r['hash_ids']
    f = fam.get(H[0])
    for i, h in enumerate(H):
        if h in lab:
            continue
        if f == 'A' and 46 <= h <= 57:
            lab[h] = 'A' + str(h - 46)
        elif f == 'B' and 74 <= h <= 78:
            lab[h] = 'B' + str(h - 74)
        elif h == 0:
            lab[h] = 'S'
        else:
            lab[h] = 'u' + str(sum(1 for v in lab.values() if v.startswith('u')))
out = {'start': S0, 'reqs': [{'t': r['timestamp'], 'P': r['input_length'], 'O': r['output_length'], 'b': [lab[h] for h in r['hash_ids']]} for r in W],
       'caps': [16, 24, 32], 'pol': {}}
for cap in out['caps']:
    for p in ('lru', 'lru_head', 'fifo', 'lfu', 'opt'):
        st = evict.trace_steps(W, p, cap)
        out['pol']['%s|%d' % (p, cap)] = [{'hit': s['hit'], 'ev': [lab[k] for k in s['evicted']], 'c': [lab[k] for k in s['cache']], 'orph': s['orphan_in_req']} for s in st]
json.dump(out, open(sys.argv[2], 'w'))
for k, v in out['pol'].items():
    print(k, sum(s['hit'] for s in v), sum(len(r['b']) for r in out['reqs']))
