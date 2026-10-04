"""Recompute every derived duration of the Saturation timeline independently of the page's JavaScript,
for all 16 settings (threshold 80/90%, ceiling human/100%, base zero/chance, lab points in/out), and
write expected.json. check_core.mjs runs the page's SAT_CORE on the same data and compares.
Also checks the data: every series is a record sequence, every source exists, dates parse."""
import json, datetime as dt, pathlib, itertools
H = pathlib.Path(__file__).parent
d = json.load(open(H.parent / 'data' / 'saturation.json'))
D = lambda s: dt.date.fromisoformat(s)
KR = {'ind': 0, 'board': 1, 'bench': 2, 'lab': 3}
problems = []
for b in d['benchmarks']:
    for s in b['series']:
        prev = None
        for p in s['pts']:
            if p['s'] not in d['sources']: problems.append(('source', b['id'], p))
            if prev and (p['d'] < prev['d'] or p['v'] <= prev['v']): problems.append(('not a record sequence', b['id'], s['id'], p['m']))
            prev = p
def crossing(b, f, mode, chance, ind_only):
    c = b['human']['v'] if (mode == 'human' and b['human']) else 100
    z = (b.get('chance') or 0) if chance else 0
    t = z + f * (c - z)
    best = None
    for s in b['series']:
        for p in s['pts']:
            if p.get('ub') or (ind_only and p['k'] == 'lab') or p['v'] < t - 1e-9: continue
            key = (p['d'], KR[p['k']], -p['v'])
            if best is None or key < best[0]: best = (key, p, s['id'])
    L = D(b['launch']['d'])
    if best: return {'status': 'reached', 'days': max(0, (D(best[1]['d']) - L).days), 'model': best[1]['m'], 'series': best[2], 'thr': round(t, 4)}
    end = D(b['retired']['d']) if b.get('retired') else D(d['as_of'])
    return {'status': 'retired' if b.get('retired') else 'open', 'days': (end - L).days, 'thr': round(t, 4)}
exp = {}
for f, mode, chance, ind in itertools.product((0.8, 0.9), ('human', 'max'), (False, True), (False, True)):
    key = f'{f}|{mode}|{int(chance)}|{int(ind)}'
    exp[key] = {b['id']: crossing(b, f, mode, chance, ind) for b in d['benchmarks']}
(H / 'expected.json').write_text(json.dumps(exp, indent=1))
print('data problems:', len(problems)); [print(' ', x) for x in problems[:20]]
dflt = exp['0.8|human|0|0']; d90 = exp['0.9|human|0|0']
for k in dflt: print(f"{k:18s} 80%: {dflt[k]['status']:8s} {dflt[k]['days']:5d}   90%: {d90[k]['status']:8s} {d90[k]['days']:5d}  {d90[k].get('model','')}")
