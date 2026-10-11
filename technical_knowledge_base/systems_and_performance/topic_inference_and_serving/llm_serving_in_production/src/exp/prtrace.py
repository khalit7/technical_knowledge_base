"""Request traces for the routing experiment (standard library only).

conv: multi-turn chat sampled from Mooncake's released conversation trace (kvcache-ai/Mooncake,
  FAST25-release/traces/conversation_trace.jsonl, sha256 b8cbb061...). A request whose block-hash list
  extends an earlier request's list (beyond the shared first block) is a later turn of that conversation.
  We keep every turn of a deterministic sample of conversations, compress time, and scale each
  512-token Mooncake block to B token ids (the same hash id always gives the same B ids, so the
  trace's prefix sharing is kept exactly; the text itself is synthetic).
root8: the parent page's routing animation (4 conversations x 2 turns, 1,000-token system prompt).
usage: python3 -I prtrace.py <traces dir> <out dir>
"""
import json, os, sys

B = 16           # tokens per Mooncake block (512 tokens in the original)
OUT_DIV = 16     # outputs scaled by the same factor
OUT_CAP = 48
MAX_IN = 1800    # tokens; conversations with a longer turn are left out (replica context 4,096)


def block_tokens(h, n=B):
    return [1000 + (h * 2654435761 + j * 40503 + (h * j) % 9973) % 140000 for j in range(n)]


def conv_trace(path, every=12, t_end=1800.0, compress=20.0):
    R = [json.loads(l) for l in open(path)]
    owner, root = {}, [0] * len(R)
    for i, r in enumerate(R):
        h = r['hash_ids']; p = None
        for k in range(len(h), 1, -1):
            if tuple(h[:k]) in owner:
                p = owner[tuple(h[:k])]; break
        root[i] = root[p] if p is not None else i
        for k in range(2, len(h) + 1):
            owner[tuple(h[:k])] = i
    keep_roots = {i for i in range(len(R)) if root[i] == i and R[i]['timestamp'] / 1000 < t_end and (i * 7919) % every == 0}
    sel = [i for i in range(len(R)) if root[i] in keep_roots]
    toolong = {root[i] for i in sel if round(R[i]['input_length'] * B / 512) > MAX_IN}
    sel = [i for i in sel if root[i] not in toolong]
    t0 = R[sel[0]]['timestamp']
    out = []
    for i in sel:
        r = R[i]; n = max(1, round(r['input_length'] * B / 512))
        toks = []
        for h in r['hash_ids']:
            toks += block_tokens(h)
        out.append({'id': len(out), 'src': i, 'conv': root[i], 't': round((r['timestamp'] - t0) / 1000 / compress, 3),
                    'blocks': r['hash_ids'], 'n_in': min(n, len(toks)), 'n_out': max(1, min(OUT_CAP, round(r['output_length'] / OUT_DIV)))})
    meta = {'source': 'Mooncake conversation_trace.jsonl', 'every': every, 't_end_s': t_end, 'compress': compress, 'B': B,
            'dropped_conversations_too_long': len(toolong), 'requests': len(out), 'conversations': len({q['conv'] for q in out})}
    return out, meta


def root8():
    # system prompt S (1,000 tokens), conversation c's first user turn U1 (1,000), its answer A (300), second user turn U2 (200)
    out = []
    for k, c in enumerate('ABCD'):
        out.append({'id': k, 'conv': c, 'turn': 1, 'parts': [['S', 1000], [c + 'U1', 1000]], 'n_out': 300})
    for k, c in enumerate('ABCD'):
        out.append({'id': 4 + k, 'conv': c, 'turn': 2, 'parts': [['S', 1000], [c + 'U1', 1000], [c + 'A', 300], [c + 'U2', 200]], 'n_out': 300})
    return out


def tokens_of(q):
    if 'parts' in q:
        toks = []
        for name, n in q['parts']:
            h = sum(ord(ch) * 131 ** j for j, ch in enumerate(name)) % 1000003
            toks += block_tokens(h + 7, n)
        return toks
    toks = []
    for h in q['blocks']:
        toks += block_tokens(h)
    return toks[:q['n_in']]


def ideal(trace):
    """Share of prompt tokens already seen as a prefix (infinite cache on one replica), counted in whole blocks."""
    seen, hit, tot = set(), 0, 0
    for q in trace:
        b = q['blocks']; k = 0
        while k < len(b) and tuple(b[:k + 1]) in seen:
            k += 1
        hit += min(k * B, q['n_in']); tot += q['n_in']
        for j in range(1, len(b) + 1):
            seen.add(tuple(b[:j]))
    return hit / tot


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    tr, meta = conv_trace(os.path.join(src, 'conversation_trace.jsonl'))
    span = tr[-1]['t']
    meta.update({'span_s': span, 'rate_per_s': round(len(tr) / span, 3), 'mean_in': round(sum(q['n_in'] for q in tr) / len(tr), 1),
                 'mean_out': round(sum(q['n_out'] for q in tr) / len(tr), 1), 'turns_gt1': sum(1 for q in tr if q['src'] != q['conv']), 'ideal_hit_one_replica': round(ideal(tr), 4)})
    json.dump({'meta': meta, 'requests': tr}, open(os.path.join(dst, 'conv.json'), 'w'))
    json.dump({'requests': root8()}, open(os.path.join(dst, 'root8.json'), 'w'))
    burst = root8()
    for q in burst:   # the four first turns together at t = 0, the four second turns together at t = 15 s
        q['t'] = 0.0 if q['turn'] == 1 else 15.0
    json.dump({'requests': burst}, open(os.path.join(dst, 'root8burst.json'), 'w'))
    print(json.dumps(meta))
