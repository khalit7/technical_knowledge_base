"""Fetch the evaluation sample: 200 FineWeb-Edu texts (sample-10BT, train rows 0..199) through the
Hugging Face datasets-server API. The paper's evaluator also scores 200 FineWeb-Edu texts, but its sample
is not pinned (paper v4, section 4.8), so this is a different 200-text sample of the same corpus.
The texts are written to $AGORA_DATA (default ~/.cache/agora_toy), not to the repository; only their
ids, offsets and a checksum go to inputs/eval_sample.json.
usage: python3 fetch_data.py"""
import json, os, urllib.request, hashlib
D = os.environ.get('AGORA_DATA', os.path.expanduser('~/.cache/agora_toy'))
os.makedirs(D, exist_ok=True)
rows = []
for off in (0, 100):
    u = 'https://datasets-server.huggingface.co/rows?dataset=HuggingFaceFW/fineweb-edu&config=sample-10BT&split=train&offset=%d&length=100' % off
    j = json.load(urllib.request.urlopen(u, timeout=60))
    rows += [r['row'] for r in j['rows']]
assert len(rows) == 200
texts = [r['text'] for r in rows]
json.dump(texts, open(os.path.join(D, 'eval_texts.json'), 'w'))
h = hashlib.sha256(json.dumps(texts).encode()).hexdigest()
here = os.path.dirname(os.path.abspath(__file__))
json.dump({'dataset': 'HuggingFaceFW/fineweb-edu', 'config': 'sample-10BT', 'split': 'train', 'rows': '0-199',
           'ids': [r['id'] for r in rows], 'sha256_texts_json': h, 'utf8_bytes': sum(len(t.encode()) for t in texts)},
          open(os.path.join(here, 'inputs', 'eval_sample.json'), 'w'), indent=0)
print('saved', len(texts), 'texts', sum(len(t.encode()) for t in texts), 'bytes; sha', h[:12])
