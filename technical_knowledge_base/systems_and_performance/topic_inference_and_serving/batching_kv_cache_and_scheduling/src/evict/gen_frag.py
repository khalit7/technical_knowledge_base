"""How much of the KV memory holds real tokens under each allocation scheme, on the Mooncake traces' real prompt and
answer lengths; writes out/frag.json. Time-averaged over each request's decode: at decode step t (0..O) the request
holds P + t tokens; a contiguous scheme has reserved R slots from the start, a paged one ceil((P + t) / b) blocks of b.
Schemes as PagedAttention section 6.1 defines its Orca baselines: Max reserves the model's maximum length, Pow2
reserves the next power of two at or above the true output length, Oracle reserves exactly the true length.
External fragmentation (gaps between allocations) depends on the allocator and arrival order and is not counted.
usage: python3 -I gen_frag.py <traces dir> <out.json>"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import evict


def share(reqs, alloc):
    used = held = 0
    for r in reqs:
        P, O = r['input_length'], max(1, r['output_length'])
        used += (O + 1) * P + O * (O + 1) / 2
        held += alloc(P, O)
    return used / held


def paged(b):
    def f(P, O):
        s = 0
        for t in range(O + 1):
            s += -(-(P + t) // b) * b
        return s
    return f


out = {'traces': {}}
for name, fn in (('conversation', 'conversation_trace.jsonl'), ('toolagent', 'toolagent_trace.jsonl')):
    R = evict.load(os.path.join(sys.argv[1], fn))
    row = {'oracle': share(R, lambda P, O: (O + 1) * (P + O)),
           'pow2': share(R, lambda P, O: (O + 1) * (P + 2 ** math.ceil(math.log2(O)))),
           'max': {}, 'paged': {}}
    for M in (1024, 4096, 16384):
        row['max'][M] = share(R, lambda P, O: (O + 1) * (P + M))
    for b in (1, 16, 32, 128, 512, 2048):
        row['paged'][b] = share(R, paged(b))
    row['n'] = len(R)
    row['mean_P'] = sum(r['input_length'] for r in R) / len(R)
    row['mean_O'] = sum(r['output_length'] for r in R) / len(R)
    row['max_O'] = max(r['output_length'] for r in R)
    out['traces'][name] = row
    print(name, json.dumps(row))
json.dump(out, open(sys.argv[2], 'w'))
