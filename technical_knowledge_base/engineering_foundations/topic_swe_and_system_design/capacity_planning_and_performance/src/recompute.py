"""Recompute every default number shown on the page from src/model.py and the measured inputs,
and write recompute_out.json. `node check_model.mjs` then runs the page's JavaScript on the same
cases and compares (relative tolerance 1e-9). Run from src/: python3 recompute.py"""
import json, math, os
import model as M

HERE = os.path.dirname(os.path.abspath(__file__))
inp = lambda f: json.load(open(os.path.join(HERE, 'inputs', f)))
cases = []          # [name, function, args, result] checked against the JS


def case(name, fn, *args):
    py = dict(mmcQuantile='mmc_quantile', kingmanWait='kingman_wait', lbSummary='lb_summary', cacheBackend='cache_backend',
              cacheLatency='cache_latency', poolSize='pool_size', erlangC='erlang_c').get(fn, fn)
    r = getattr(M, py)(*args)
    cases.append(dict(name=name, fn=fn, args=list(args), out=r))
    return r


out = {}

# ---- percentiles and the tail at scale (Dean and Barroso, CACM 2013)
out['fanout_1pct_100'] = case('fanout 1% x 100', 'fanout', 0.01, 100)          # paper: 63%
out['fanout_1e4_2000'] = case('fanout 0.01% x 2000', 'fanout', 1e-4, 2000)     # paper: "almost one in five"
out['fanout_1pct'] = {n: case('fanout 1%% x %d' % n, 'fanout', 0.01, n) for n in [1, 10, 50, 100, 500]}

# ---- the hockey stick: M/M/1 and M/M/c in multiples of the service time
out['wait_multiplier'] = {}
for c in [1, 2, 8]:
    for rho in [0.5, 0.7, 0.8, 0.9, 0.95, 0.99]:
        r = case('mmc rho %.2f c %d' % (rho, c), 'mmc', rho, c, 1.0)
        q = case('mmc p99 rho %.2f c %d' % (rho, c), 'mmcQuantile', 0.99, rho, c, 1.0)
        out['wait_multiplier']['c%d_rho%.2f' % (c, rho)] = dict(W=r['W'], Wq=r['Wq'], C=r['C'], p99=q)

# ---- Kingman at 80%: arrivals Poisson (ca2 = 1), service cv 0, 1, 2
out['kingman_80'] = {cv: case('kingman 0.8 cv %g' % cv, 'kingmanWait', 0.8, 1.0, cv * cv, 1.0) for cv in [0, 1, 2]}

# ---- Mitzenmacher's supermarket limit
out['supermarket'] = {'%g_d%d' % (lam, d): case('supermarket %g d%d' % (lam, d), 'supermarket', lam, d)
                      for lam in [0.5, 0.7, 0.9, 0.95, 0.99] for d in [1, 2, 3]}

# ---- the load-balancing lab defaults (8 servers, exponential service) and the animation's run
LAB = dict(n=8, N=20000, warm=2000, seed=3, dist='exp', cv=2.0, slow=1)
out['lab'] = {}
for pol in ['random', 'rr', 'p2c', 'lor', 'shared']:
    for rho in [0.5, 0.7, 0.9]:
        o = dict(LAB, policy=pol, rho=rho)
        out['lab']['%s_%.1f' % (pol, rho)] = case('lab %s %.1f' % (pol, rho), 'lbSummary', o)
for pol in ['random', 'p2c']:
    o = dict(LAB, policy=pol, rho=0.7, dist='lognormal')
    out['lab']['%s_0.7_lognormal' % pol] = case('lab %s 0.7 lognormal' % pol, 'lbSummary', o)
    o = dict(LAB, policy=pol, rho=0.7, slow=3)
    out['lab']['%s_0.7_slow3' % pol] = case('lab %s 0.7 slow3' % pol, 'lbSummary', o)
# the simulation at Experiment 3's real utilisations (75% and 96%), to set beside the measurement
for pol in ['random', 'rr', 'p2c', 'lor']:
    for rho in [0.75, 0.96]:
        out['lab']['%s_%.2f' % (pol, rho)] = case('lab %s %.2f' % (pol, rho), 'lbSummary', dict(LAB, policy=pol, rho=rho))
for pol in ['random', 'rr', 'p2c', 'lor']:
    out['lab']['%s_0.75_slow3' % pol] = case('lab %s 0.75 slow3' % pol, 'lbSummary', dict(LAB, policy=pol, rho=0.75, slow=3))
# theory for the same settings: random splitting of Poisson arrivals gives each server an M/M/1 queue;
# one shared queue is M/M/8
out['lab_theory'] = {'random_0.9_p99': M.mmc_quantile(0.99, 0.9, 1, 1.0), 'shared_0.9_p99': M.mmc_quantile(0.99, 0.9, 8, 1.0),
                     'random_0.9_mean': 1 / (1 - 0.9), 'shared_0.9_mean': M.mmc(0.9, 8, 1.0)['W']}

# ---- caching
out['cache_db_90'] = case('cache backend 90%', 'cacheBackend', 1000, 0.9)
out['cache_db_99'] = case('cache backend 99%', 'cacheBackend', 1000, 0.99)
out['cache_lat'] = {h: case('cache latency %g' % h, 'cacheLatency', h, 0.143, 5.0) for h in [0, 0.5, 0.9, 0.99]}
st = {}
for mode in ['none', 'coalesce', 'xfetch']:
    r = M.stampede(mode, 200, 0.3, 2.0, 5)
    w = sorted(r['waits'])
    st[mode] = dict(db=r['db'], waiting=sum(1 for x in w if x > 0), p99_wait=M.pct(w, 0.99), first_start=r['starts'][0])
    cases.append(dict(name='stampede ' + mode, fn='stampede', args=[mode, 200, 0.3, 2.0, 5], out=dict(db=r['db'], waits=r['waits'], starts=r['starts'])))
out['stampede'] = st

# ---- capacity planning: the root's chat assistant (1M daily active users, 10 messages each, 1 + 4 requests per message);
# per server: 4 vCPU / 5.2 ms of CPU per request (the Scale simulator with the queue on: 5 ms + 0.4 x 0.5 ms enqueue)
avg_now = 1_000_000 * 10 * 5 / 86400
P0 = dict(avg_now=avg_now, growth=0.0, months=0, peak_factor=2.0, per_server=4 / 0.0052, target_util=0.6, spares=1, price_h=0.2016)
out['plan_default'] = case('plan default', 'plan', P0)
out['plan_growth'] = case('plan growth', 'plan', dict(P0, growth=0.10, months=6))
out['plan_no_headroom'] = case('plan 100%', 'plan', dict(P0, target_util=1.0, spares=0))
out['pool_erlang'] = {c: case('pool erlang c%d' % c, 'erlangC', avg_now * 2 * 3 * 0.001, c) for c in [4, 5, 6, 8, 10]}
out['pool'] = dict(busy=case('pool', 'poolSize', avg_now * 2 * 3, 0.001), qps=avg_now * 2 * 3)

# ---- measured inputs, carried through so the page's numbers come from one place
meas = inp('measured.json')
out['measured_hockey'] = [dict(util=h['util'], p50=h['p50'], p99=h['p99'], mean=h['mean'], S=h['mean_service_ms'],
                               mm1_mean=(h['mean_service_ms'] / (1 - h['util']) if h['util'] < 1 else None),
                               mm1_p99=(math.log(100) * h['mean_service_ms'] / (1 - h['util']) if h['util'] < 1 else None))
                          for h in meas['hockey']]
wk = inp('wiki_hourly.json')
out['peak_factors'] = {p: dict(month=v['peak_over_mean_month'], daily_median=v['peak_over_mean_daily_median'],
                               shape=v['peak_over_mean_shape'], trough=v['trough_over_mean_shape'])
                       for p, v in wk['projects'].items()}
try:
    out['gil'] = dict(gil=inp('gil_314.json'), ft=inp('gil_314t.json'))
except FileNotFoundError:
    pass

json.dump(dict(out=out, cases=cases), open(os.path.join(HERE, 'recompute_out.json'), 'w'), indent=0, default=str)
for k, v in out.items():
    if k not in ('cases',):
        s = json.dumps(v, default=str)
        print(k, s[:300])
