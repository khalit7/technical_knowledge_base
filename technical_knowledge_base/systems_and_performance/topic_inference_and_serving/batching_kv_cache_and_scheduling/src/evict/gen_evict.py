"""Replay every policy on the Mooncake traces at many cache sizes; write out/evict_grid.json (embedded by the page).
usage: python3 -I gen_evict.py <traces dir> <out.json>
Traces (kvcache-ai/Mooncake, FAST25-release, files fetched 2026-10-08): traces/conversation_trace.jsonl,
traces/toolagent_trace.jsonl, traces/synthetic_trace.jsonl, arxiv-trace/mooncake_trace.jsonl."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import evict

D, OUT = sys.argv[1], sys.argv[2]
CAPS = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144]
POL = ['lru', 'lru_head', 'fifo', 'lfu', 'arc', 'opt']
TRACES = [('conversation', 'conversation_trace.jsonl'), ('toolagent', 'toolagent_trace.jsonl'),
          ('synthetic', 'synthetic_trace.jsonl')]


def stats(R):
    n = len(R)
    return {'n': n, 'mean_in': sum(r['input_length'] for r in R) / n, 'mean_out': sum(r['output_length'] for r in R) / n,
            'blocks': sum(len(r['hash_ids']) for r in R), 'unique': len(set(h for r in R for h in r['hash_ids'])),
            'span_s': (R[-1]['timestamp'] - R[0]['timestamp']) / 1000.0}


out = {'caps': CAPS, 'policies': POL, 'block_tokens': 512, 'traces': {}, 'tiers': {}, 'table1': {}}
for name, fn in TRACES:
    t0 = time.time()
    R = evict.load(os.path.join(D, fn))
    nu = evict.next_uses(R)
    st = stats(R)
    inf = evict.replay(R, 'lru', None)
    st['inf_hit'], st['inf_hit_tok'] = inf['hit'], inf['hit_tok']
    grid = {}
    for p in POL:
        row = []
        for cap in CAPS:
            o = evict.replay(R, p, cap, nu)
            row.append([round(o['hit'], 5), round(o['hit_tok'], 5), o['orphan']])
        grid[p] = row
    tiers = []
    for cg in (256, 1024, 4096):
        for ch in (0, 1024, 4096, 16384, 65536, 262144):
            o = evict.replay_tiers(R, cg, ch)
            tiers.append([cg, ch, round(o['gpu_blocks'] / o['blocks'], 5), round(o['host_blocks'] / o['blocks'], 5),
                          round(o['gpu_tokens'] / o['tokens'], 5), round(o['host_tokens'] / o['tokens'], 5)])
    out['traces'][name] = {'file': fn, 'stats': st, 'grid': grid}
    out['tiers'][name] = tiers
    print(name, 'done in', round(time.time() - t0, 1), 's', flush=True)

# Mooncake arXiv report, Table 1 (LRU, LFU, LengthAware at 1,000 to 100,000 blocks and infinite)
R = evict.load(os.path.join(D, 'mooncake_trace.jsonl'))
nu = evict.next_uses(R)
st = stats(R)
t1 = {'stats': st, 'caps': [None, 100000, 50000, 30000, 10000, 1000],
      'published': {'lru': [0.51, 0.51, 0.50, 0.48, 0.40, 0.30], 'lfu': [0.51, 0.51, 0.49, 0.43, 0.35, 0.30],
                    'lengthaware': [0.51, 0.50, 0.48, 0.42, 0.35, 0.30]}, 'ours': {}}
for p in ('lru', 'lfu', 'arc', 'opt', 'fifo'):
    t1['ours'][p] = [round(evict.replay(R, p, c, nu)['hit'], 4) for c in t1['caps']]
out['table1'] = t1

# FAST'25 Fig. 9: LRU at a 3M-token local cache, as a share of the infinite-cache hit rate
fig9 = {}
alls = []
off = 0
for name, fn in TRACES:
    R = evict.load(os.path.join(D, fn))
    for r in R:
        alls.append(dict(r, hash_ids=[h + off for h in r['hash_ids']]))
    off += 10 ** 7
    a = evict.replay(R, 'lru', 3000000 // 512)
    fig9[name] = round(a['hit'] / out['traces'][name]['stats']['inf_hit'], 4)
alls.sort(key=lambda r: r['timestamp'])
fig9['all'] = round(evict.replay(alls, 'lru', 3000000 // 512)['hit'] / evict.replay(alls, 'lru', None)['hit'], 4)
out['fig9'] = {'ours': fig9, 'published_labels': [0.75, 0.46, 0.48, 0.41],
               'note': 'labels printed on FAST25 Fig. 9 (75%, 46%, 48%, 41% max); which label belongs to which workload is read from the figure layout and our numbers'}
json.dump(out, open(OUT, 'w'))
print('wrote', OUT)
