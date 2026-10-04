"""Recompute every number the Scale simulator shows for the presets, the fix chains and 40 random
configurations; write recompute.json for check_js.mjs to compare against the page's JavaScript.
Also prints the derived GPU constants and what the defaults reproduce."""
import json, math, os, random
import model as M

H = os.path.dirname(os.path.abspath(__file__))
B = M.BASE
PRESETS = [
    ('p1', dict(B, users=1, idx=False)),
    ('p2', dict(B, users=1000, idx=False)),
    ('p3', dict(B, users=1e5, app_n=2, idx=False, gpu_r=8)),
    ('p4', dict(B, users=1e6, app_n=2, idx=True, gpu_r=80)),
    ('p5', dict(B, users=1e7, app_n=3, idx=True, db_size=2, cache_n=1, workers_n=5, gpu_r=800, **{'async': True})),
    ('p6', dict(B, users=1e6, app_n=3, idx=True, db_size=2, cache_n=1, workers_n=5, gpu_r=80, isl=8000, osl=1500, **{'async': True})),
]


def summ(o):
    f = lambda x: None if x is None else (str(x) if isinstance(x, float) and math.isinf(x) else x)
    s = {'rho': {k: f(x) for k, x in o['rho'].items()}, 'cost': o['cost']}
    if 'lat' in o:
        s['lat'] = {k: f(x) for k, x in o['lat'].items()}
    g = o['gpu']
    s['gpu'] = {k: g[k] for k in ('mu_rep', 'tps_rep', 'n_eff', 'd_eff', 'pf', 'speed', 'bmax', 'B', 'kv_used', 'C')}
    s['app_C'] = o['app']['C']; s['prim_C'] = o['prim']['C']
    if o['work']:
        s['work_avg'] = o['work']['rho_avg']
    return s


cases = []
for name, st in PRESETS:
    chain, s = [], st
    for _ in range(12):
        s2, what, comp = M.suggest_fix(s)
        chain.append([what, comp])
        if s2 is None:
            break
        s = s2
    cases.append(dict(name=name, st=st, out=summ(M.evaluate(st)), chain=chain, end=s))
random.seed(3)
for i in range(40):
    st = dict(B, users=10 ** random.uniform(0, 7), peak=random.choice([1, 2, 3, 5]), app_n=random.randint(1, 60), idx=random.random() < 0.8,
              db_size=random.randint(0, 5), replicas=random.randint(0, 5), shards=random.choice([1, 2, 4, 8, 16]),
              cache_n=random.randint(0, 4), hit=round(random.uniform(0.5, 0.99), 2), workers_n=random.randint(1, 80),
              gpu_r=random.randint(1, 2000), batch=random.randint(1, 256), isl=random.choice([500, 1000, 4000, 8000]),
              osl=random.choice([100, 400, 1500]), **{'async': random.random() < 0.5})
    cases.append(dict(name='r%d' % i, st=st, out=summ(M.evaluate(st)), chain=None))
g = M.gpu_consts(B)
info = dict(gpu=g, kv_tok_bytes=g['kv_tok'], reproduce_tps=g['tps0'],
            check_tps_at_fit=1000 / (g['pf0'] + 1000 * (g['a'] / g['bmax0'] + g['b'])),
            b_vs_compute=2 * M.D['gpu']['params'] / (2 * M.D['gpu']['fp8_dense_flops'] * 0.4))
json.dump(dict(info=info, cases=cases), open(os.path.join(H, 'recompute.json'), 'w'), indent=1)
print(json.dumps(info, indent=1))
for c in cases[:6]:
    print(c['name'], c['out']['rho'], round(c['out']['cost']['total']), c['out'].get('lat'), c['chain'])
