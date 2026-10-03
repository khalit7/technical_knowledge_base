"""Small open-weight models on Artificial Analysis, from a saved model page (its embedded data lists every model).

  curl -sL -A "Mozilla/5.0" https://artificialanalysis.ai/models/qwen3-8b-instruct-reasoning -o <scratch>/aa_m_q8.html
  python3 aa_small.py <scratch>/aa_m_q8.html      # writes inputs/aa_small.json

Keeps open-weight models with total parameters <= 16B that AA lists, with AA's own fields: parameters (billions),
active parameters, release date, Intelligence Index (and whether AA marks it estimated), and the individual
evaluations AA runs itself (GPQA Diamond, IFBench, HLE, LiveCodeBench, AIME 2025, tau2, Terminal-Bench Hard).
Nothing is computed here except rounding."""
import json, re, sys, os
src = sys.argv[1]
s = open(src, encoding='utf-8').read()
parts = re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', s)
t = ''.join(json.loads(p) for p in parts)
dec = json.JSONDecoder(); out = {}
for m in re.finditer(r'\{"id":"[0-9a-f-]{36}","slug":"', t):
    try: o, _ = dec.raw_decode(t, m.start())
    except Exception: continue
    if 'parameters' in o:
        k = o['slug']
        if k not in out or len(o) > len(out[k]): out[k] = o
EV = ['gpqa', 'ifbench', 'hle', 'livecodebench', 'aime25', 'tau2', 'terminalbenchHard', 'lcr', 'scicode']
rows = []
for k, o in out.items():
    p = o.get('parameters')
    if not o.get('isOpenWeights') or p is None or p > 16: continue
    r = dict(slug=k, name=o['name'], creator=(o.get('creator') or {}).get('name'), params=p,
             active=o.get('inferenceParametersActiveBillions'), release=o.get('releaseDate'),
             reasoning=o.get('isReasoning'), deprecated=o.get('deprecated'),
             aa_index=None if o.get('intelligenceIndex') is None else round(o['intelligenceIndex'], 1),
             aa_index_estimated=o.get('intelligenceIndexIsEstimated'),
             license=o.get('licenseName'))
    for e in EV:
        v = o.get(e)
        r[e] = None if v is None else round(v * 100, 1)
    rows.append(r)
rows.sort(key=lambda r: (r['release'] or '', r['slug']))
meta = dict(source='https://artificialanalysis.ai/models/qwen3-8b-instruct-reasoning (embedded data of all models)',
            read_date='2026-10-03', index='Artificial Analysis Intelligence Index v4.3',
            note='AA marks some index values "estimated"; every such model has an empty intelligenceIndexEvaluations list (no v4.3 suite results). Individual evaluations are AA runs.',
            n=len(rows))
json.dump(dict(meta=meta, rows=rows), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'aa_small.json'), 'w'), indent=0)
print(len(rows))
for r in rows: print(r['release'], r['slug'], r['params'], r['aa_index'], r['aa_index_estimated'], r['gpqa'], r['ifbench'])
