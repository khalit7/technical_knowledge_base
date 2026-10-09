"""ref.py against the real classes: per-request hits must be identical. Reads the JSON the real replays wrote
(dir given as argv[1]: s_<trace>_<cap>.json from real_sglang.py, u_... from real_unified.py, v_... from real_vllm.py)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import traces, ref  # noqa: E402
d = sys.argv[1]
res = []
for f in sorted(os.listdir(d)):
    if not f.endswith('.json') or f[0] not in 'suv':
        continue
    real = json.load(open(os.path.join(d, f)))
    reqs = traces.get(real['trace'])
    kind = 'blocks' if f[0] == 'v' else 'radix'   # s: legacy RadixCache, u: UnifiedRadixCache (default), v: vLLM
    mine, _ = ref.run(kind, reqs, traces.tokens, real['cap'])
    a = [r[1] for r in real['reqs']]
    b = [r[1] for r in mine]
    same = a == b
    if f[0] in 'su':
        same = same and [r[2] for r in real['reqs']] == [r[2] for r in mine]
    first = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), None)
    res.append({'file': f, 'kind': kind, 'trace': real['trace'], 'cap': real['cap'], 'requests': len(a),
                'hit_tokens': sum(a), 'identical': same, 'first_diff': first})
    print(json.dumps(res[-1]))
print('ALL IDENTICAL' if all(r['identical'] for r in res) else 'MISMATCH', len(res))
json.dump({'runs': len(res), 'identical': sum(r['identical'] for r in res), 'requests': sum(r['requests'] for r in res),
           'by_kind': {k: sum(1 for r in res if r['file'][0] == k) for k in 'suv'}},
          open(os.path.join(HERE, 'out', 'check_real.json'), 'w'))
