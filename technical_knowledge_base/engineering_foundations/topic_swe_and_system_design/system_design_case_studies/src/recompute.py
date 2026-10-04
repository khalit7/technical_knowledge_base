"""Recompute every estimate on the page and check it against published figures.
Run from src/:  python3 recompute.py
Reads est_spec.json (the formulas the page evaluates) and inputs/pg_measured.json (the local measurement);
writes recompute_out.json (every row at the default inputs) and parts/23_js_est_data.js (the same spec and
measurements for the page). check_page.mjs evaluates the page's JavaScript on the same spec and compares.
"""
import json, math, os
here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(os.path.join(here, 'est_spec.json')))
meas = json.load(open(os.path.join(here, 'inputs', 'pg_measured.json')))
num = json.load(open(os.path.join(here, '..', '..', 'src', 'num', 'num_data.json')))
C = spec['consts']
FN = {'ceil': math.ceil, 'max': max, 'min': min, 'log2': math.log2}

# constants must agree with the parent root's Numbers to know data
assert C['SRV_HR'] == num['defaults']['srvp'] == 0.2016
assert C['SRV_RPS'] == num['defaults']['srv'] == 500
assert C['HOURS_MONTH'] == num['hours_month'] == 730
assert C['DERATE'] == num['defaults']['derate']
assert C['REDIS_OPS'] == [r['v'] for r in num['thr']['redis'] if 'SET, 50 clients' in r['lab']][0]
assert C['PG_READ'] == [r['v'] for r in num['thr']['pg'] if 'oltp_read_only' in r['lab']][0]
assert C['PG_MIX'] == [r['v'] for r in num['thr']['pg'] if 'TPCC' in r['lab']][0]
assert C['RTT_MS'] == [l for l in num['ladder'] if l['id'] == 'dcrtt'][0]['pts'][0]['v'] * 1000

def evaluate(d, inputs=None):
    env = dict(C); env.update(FN)
    for i in spec['designs'][d]['inputs']:
        env[i['k']] = (inputs or {}).get(i['k'], i['v'])
    out = {}
    for r in spec['designs'][d]['rows']:
        out[r['k']] = eval(r['e'], {'__builtins__': {}}, env)
        if 'cap' in r: out[r['k'] + '__cap'] = eval(r['cap'], {'__builtins__': {}}, env)
    return out

res = {d: evaluate(d) for d in spec['designs']}
checks = []
def check(name, got, want, tol, how):
    ok = abs(got - want) <= tol * abs(want)
    checks.append({'check': name, 'got': round(got, 4), 'want': want, 'tol': tol, 'ok': ok, 'how': how}); assert ok, name

u = res['url']
check('Bitly reads per write', u['ratio'], 10, 0, 'by construction: 6 billion clicks / 600 million shortens (High Scalability 2014)')
check('62^6', 62 ** 6, 56800235584, 0, 'arithmetic'); check('62^7', 62 ** 7, 3521614606208, 0, 'arithmetic')
check('URL writes/s', u['w_avg'], 231.48, 0.001, 'arithmetic'); check('URL storage TB', u['tb'], 18.0, 0.001, 'arithmetic')
check('URL servers', u['srv'], 12, 0, 'ceil(5,092.6 / 500) + 1')
r = res['rl']
check('Redis shards at 50k/s', r['shards'], 1, 0, 'arithmetic'); check('local limit leak', r['local'], 5000, 0, 'arithmetic')
c = res['chat']
check('chat sends peak', c['send'], 46296.3, 0.001, 'arithmetic'); check('chat presence/s', c['pres'], 333333.3, 0.001, 'arithmetic')
check('chat polling/s', c['poll'], 2000000, 0, 'arithmetic'); check('chat gateways', c['gws'], 100, 0, 'arithmetic')
f = res['feed']
check('feed reads per write', f['rw'], 60, 0, 'by construction from 300K reads and 5K writes (High Scalability 2013)')
check('feed RAM TB', f['ram'], 2.88, 0.001, 'arithmetic')
check('deliveries per post', 30e9 / 400e6, 75, 0, 'High Scalability 2013: 30 b deliveries a day, 400 m tweets a day')
check('feed deliveries/s', f['deliv'], 375000, 0, 'compare the reported 300k deliveries/s (30 b / 86,400 = 347k): same order, not a reproduction')
check('celebrity rate', f['celeb_rate'], 103333.3, 0.001, 'derived from "up to 5 minutes" for 31 M followers')
g = res['gw']
check('gateway requests/month', g['rmon'], 15600000, 0, 'compare Uber: 16 M a month, peak 25 QPS (2024); independent order-of-magnitude check, not a reproduction')
check('gateway spend/day', g['cday'], 4160, 0.0001, 'arithmetic')
rg = res['rag']
check('RAG chunks', rg['chunks'], 35000000, 0, '5 M x ceil(3,000 / 450) = 5 M x 7')
check('RAG vectors GB', rg['vgb'], 215.32, 0.001, 'chunks x (1536 x 4 + 8) bytes (pgvector storage formula)')
check('RAG answer cost', rg['acost'], 0.013, 0.0001, 'arithmetic')
j = res['job']
check('job burst', j['burst'], 125000, 0, 'arithmetic'); check('job workers', j['work'], 48, 0, 'ceil(2,314.8 / 50) + 1')
# the parent root's Twitter 2013 drill: 500 M a day is about 5,700 a second
check('Twitter 2013 average', 500e6 / 86400, 5787, 0.001, 'root drill: Twitter said "about 5,700"')

# measurement summary
race = meas['race']
nav = [x['admitted'] for x in race['naive']]; atm = [x['admitted'] for x in race['atomic']]
assert all(a == race['limit'] for a in atm) and all(n > race['limit'] for n in nav)
feed = meas['feed']
summary = {'race_naive': nav, 'race_atomic': atm, 'race_over_pct': [round((n - race['limit']) / race['limit'] * 100) for n in nav],
           'read_speedup': round(feed['read_on_read']['median_ms'] / feed['read_precomputed']['median_ms'], 1),
           'fanout_ratio': round(feed['fanout_ms_top'] / feed['fanout_ms_median'], 1),
           'bytes_per_row': round(feed['timeline_bytes'] / feed['timeline_rows'], 1)}
out = {'defaults': res, 'checks': checks, 'measured': summary}
json.dump(out, open(os.path.join(here, 'recompute_out.json'), 'w'), indent=1)
js = '// Generated by recompute.py from est_spec.json and inputs/pg_measured.json. Do not edit by hand.\n'
js += 'window.EST_SPEC=' + json.dumps(spec, separators=(',', ':')) + ';\n'
js += 'window.MEAS=' + json.dumps(meas, separators=(',', ':')) + ';\n'
js += 'window.EST_EXPECT=' + json.dumps(res, separators=(',', ':')) + ';\n'
open(os.path.join(here, 'parts', '23_js_est_data.js'), 'w').write(js)
print(json.dumps({k: {kk: round(vv, 3) for kk, vv in v.items()} for k, v in res.items()}, indent=0))
print(json.dumps(summary)); print('checks ok:', len(checks))
