"""Download MMLU-Redux 2.0 (edinburgh-dawg/mmlu-redux-2.0, CC BY 4.0): 57 subjects x 100 re-annotated MMLU test questions.
Raw rows go to a cache dir (argv[1], default ./_cache, not committed); the per-subject counts and a few flagged
items go to inputs/redux_counts.json. Run: uv run --with pyarrow python3 fetch_redux.py [cache_dir]"""
import json, os, sys, time, urllib.request, urllib.parse, collections

CACHE = sys.argv[1] if len(sys.argv) > 1 else '_cache'
os.makedirs(CACHE, exist_ok=True)
DS = 'edinburgh-dawg/mmlu-redux-2.0'
API = 'https://datasets-server.huggingface.co'


def get(url):
    for k in range(5):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # rate limit or transient
            time.sleep(3 * (k + 1))
    raise RuntimeError(url)


splits = get(f'{API}/splits?dataset={urllib.parse.quote(DS, safe="")}')['splits']
configs = sorted({s['config'] for s in splits})
rows = {}
for c in configs:
    p = os.path.join(CACHE, f'redux_{c}.json')
    if not os.path.exists(p):
        # the datasets-server rate-limits after about 35 calls; read the hub's Arrow file instead (needs pyarrow)
        import pyarrow as pa
        a = os.path.join(CACHE, f'redux_{c}.arrow')
        urllib.request.urlretrieve(f'https://huggingface.co/datasets/{DS}/resolve/main/{c}/data-00000-of-00001.arrow', a)
        t = pa.ipc.open_stream(open(a, 'rb')).read_all()
        json.dump(t.to_pylist(), open(p, 'w'))
    rows[c] = json.load(open(p))

out = {'source': f'https://huggingface.co/datasets/{DS}', 'licence': 'CC BY 4.0', 'read': time.strftime('%Y-%m-%d'),
       'subjects': {}, 'types': collections.Counter(), 'examples': []}
for c, rs in rows.items():
    cnt = collections.Counter(r['error_type'] for r in rs)
    out['subjects'][c] = {'n': len(rs), **cnt}
    out['types'].update(cnt)
    for r in rs:
        if r['error_type'] == 'wrong_groundtruth' and r.get('correct_answer'):
            out['examples'].append({'subject': c, **r})
out['types'] = dict(out['types'])
out['n'] = sum(v['n'] for v in out['subjects'].values())
json.dump(out, open('inputs/redux_all.json', 'w'), indent=0, ensure_ascii=False)
print(out['n'], out['types'], len(out['examples']))
