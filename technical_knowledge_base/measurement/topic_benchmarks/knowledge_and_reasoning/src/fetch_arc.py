"""Fetch a few public ARC tasks (Apache-2.0) into inputs/arc_tasks.json.
ARC-AGI-1: github.com/fchollet/ARC-AGI (training set); ARC-AGI-2: github.com/arcprize/ARC-AGI-2 (public evaluation set)."""
import json, sys, urllib.request
TASKS = [('arc1', 'training', '007bbfb7'), ('arc1', 'training', '25ff71a9'), ('arc1', 'training', 'd4f3cd78'), ('arc1', 'training', '3c9b0459')]
TASKS += [('arc2', 'evaluation', t) for t in sys.argv[1:]]
BASE = {'arc1': 'https://raw.githubusercontent.com/fchollet/ARC-AGI/master/data/%s/%s.json',
        'arc2': 'https://raw.githubusercontent.com/arcprize/ARC-AGI-2/main/data/%s/%s.json'}
out = []
for v, split, tid in TASKS:
    url = BASE[v] % (split, tid)
    d = json.load(urllib.request.urlopen(url, timeout=60))
    out.append({'v': v, 'split': split, 'id': tid, 'url': url.replace('raw.githubusercontent.com', 'github.com').replace('/master/', '/blob/master/').replace('/main/', '/blob/main/'), **d})
json.dump(out, open('inputs/arc_tasks.json', 'w'), separators=(',', ':'))
for t in out:
    print(t['v'], t['id'], len(t['train']), [(len(p['input']), len(p['input'][0]), len(p['output']), len(p['output'][0])) for p in t['train'] + t['test']])
