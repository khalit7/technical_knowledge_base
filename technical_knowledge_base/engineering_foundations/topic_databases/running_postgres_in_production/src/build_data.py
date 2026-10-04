"""Turn the measured runs (inputs/*.json, written by lab/*.py) into parts/22_js_data.js (window.RPG).
Scratch paths are removed from the outputs; nothing else is changed. Run: python3 build_data.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')
RUNS = ['pitr', 'replication', 'vacuum', 'wraparound', 'connections', 'upgrade', 'monitor']

def clean(s):
    if not isinstance(s, str):
        return s
    s = re.sub(r'/(?:private/)?(?:tmp|var|Users)/\S*?/rp_data/', '', s)
    s = re.sub(r'/Users/\S+/(pgserver|cenv)/\S*', r'\1', s)
    s = s.replace('—', ', ')
    return s

out = {}
for r in RUNS:
    p = os.path.join(INP, r + '.json')
    if not os.path.exists(p):
        print('missing', p); continue
    d = json.load(open(p))
    steps = {}
    for s in d.get('steps', []):
        steps[s['step']] = {k: clean(v) if k in ('cmd', 'out') else v for k, v in s.items() if k in ('cmd', 'out', 'secs', 'log')}
        if 'log' in s:
            steps[s['step']]['log'] = [clean(x) for x in s['log']]
    keep = {k: v for k, v in d.items() if k not in ('steps',)}
    # drop bulky per-sample fields not used by the page
    out[r] = {'steps': steps, **keep}
    for s in d.get('steps', []):
        if 'series' in s:
            out[r]['series_' + s['step']] = s['series']
        for k in ('rows', 'per_n', 'direct', 'bouncer', 'lag_bytes', 'paused', 'times', 'fresh', 'catalog', 'sort', 'opened', 'server_conns', 'batch_secs', 'fail0', 'fail200', 'count', 'bytes', 'ndel', 'more', 'oldest', 'target', 'tps', 'lat', 'visible_after_cancel', 'a', 'b'):
            if k in s:
                out[r].setdefault('x', {}).setdefault(s['step'], {})[k] = s[k]
js = 'window.RPG=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(os.path.join(HERE, 'parts', '22_js_data.js'), 'w').write(js)
print('wrote parts/22_js_data.js', len(js), 'bytes')
