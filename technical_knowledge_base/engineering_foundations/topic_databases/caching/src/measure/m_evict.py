"""Redis 8.8 as a cache under real and Zipf workloads: hit ratio by maxmemory-policy and memory size.
Replays the traces written by m_skew.py through cache-aside against a real local Redis:
GET the key; on a miss "load from the database" (not timed here) and SET it (a 100-byte value).
Requests are pipelined in batches of 200 GETs followed by the batch's SETs (a key missed twice in one batch is set twice).
Each run: FLUSHALL, CONFIG SET maxmemory-policy / maxmemory / maxmemory-samples, CONFIG RESETSTAT, replay 2,000,000 requests;
hit ratio is counted on requests 500,001 to 2,000,000 (the first 500,000 warm the cache) and checked against INFO keyspace_hits.
One key in ten is "expensive" (chosen by a hash of its id, independent of popularity); hits are counted per class
for the cost-weighted hit ratio.
Usage: python m_evict.py [quick]            all workloads and the extra runs (about 25 minutes alone)
       python m_evict.py only=<workload>   one workload's grid, merged into evict.json (about 5 minutes)
       python m_evict.py extras            maxmemory-samples 10 and volatile-lru runs, merged (about 3 minutes)
Writes inputs/evict.json.
"""
import os, sys, time, json
import numpy as np, redis
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine, start_redis, HERE

QUICK = 'quick' in sys.argv
WARM, BATCH = 500_000, 200
VAL = b'x' * 100
POLICIES = ['allkeys-lru', 'allkeys-lfu', 'allkeys-random', 'allkeys-lrm', 'noeviction']   # noeviction on the real trace only
SIZES = [20_000, 50_000, 100_000, 200_000]          # target capacity in keys; memory set from measured bytes per key
WORK = ['wiki', 'zipf0.7', 'zipf0.9', 'zipf1.1']

proc, port = start_redis()
r = redis.Redis(port=port)
print('redis', r.info('server')['redis_version'], 'port', port, flush=True)


def bytes_per_key():
    r.flushall(); r.config_set('maxmemory', 0)
    base = r.info('memory')['used_memory']
    pipe = r.pipeline(transaction=False)
    for i in range(200_000):
        pipe.set(f'k:{i}', VAL)
        if i % 5000 == 4999: pipe.execute()
    pipe.execute()
    used = r.info('memory')['used_memory']
    r.flushall()
    return base, (used - base) / 200_000


_EXP = np.random.default_rng(11).random(2_000_000) < 0.1   # fixed random 10% of key ids, independent of rank


def expensive(ids):
    return _EXP[ids]


def run(trace, policy, cap, bpk, base, samples=5, ttl=None):
    r.flushall()
    r.config_set('maxmemory-policy', policy)
    r.config_set('maxmemory-samples', samples)
    r.config_set('maxmemory', int(base + cap * bpk))
    r.config_resetstat()
    hits = np.zeros(len(trace), dtype=bool)
    errors = 0
    t0 = time.time()
    for s in range(0, len(trace), BATCH):
        ids = trace[s:s + BATCH]
        keys = [f'k:{i}' for i in ids]
        got = r.mget(keys)
        miss = [k for k, g in zip(keys, got) if g is None]
        hits[s:s + len(ids)] = [g is not None for g in got]
        if miss:
            pipe = r.pipeline(transaction=False)
            for k in miss:
                if ttl: pipe.set(k, VAL, ex=ttl)
                else: pipe.set(k, VAL)
            for res in pipe.execute(raise_on_error=False):
                if isinstance(res, Exception): errors += 1
    dt = time.time() - t0
    st = r.info('stats'); mem = r.info('memory')
    h = hits[WARM:]; ex = expensive(trace[WARM:])
    return {'policy': policy, 'cap_keys': cap, 'samples': samples, 'ttl': ttl,
            'maxmemory_mb': round((base + cap * bpk) / 2**20, 2),
            'hit': float(h.mean()), 'hit_all': float(hits.mean()),
            'hit_cheap': float(h[~ex].mean()), 'hit_exp': float(h[ex].mean()), 'exp_share': float(ex.mean()),
            'keyspace_hits': st['keyspace_hits'], 'keyspace_misses': st['keyspace_misses'],
            'info_hit_all': st['keyspace_hits'] / max(1, st['keyspace_hits'] + st['keyspace_misses']),
            'evicted': st['evicted_keys'], 'set_errors': errors, 'keys_held': r.dbsize(),
            'used_mb': round(mem['used_memory'] / 2**20, 2), 'seconds': round(dt, 1)}


base, bpk = bytes_per_key()
print('bytes per key', round(bpk, 1), 'base', base, flush=True)
out = {**machine(), 'redis': r.info('server')['redis_version'], 'bytes_per_key': bpk, 'base_bytes': base,
       'value_bytes': len(VAL), 'warm': WARM, 'batch': BATCH, 'runs': []}
ONLY = [a.split('=', 1)[1] for a in sys.argv if a.startswith('only=')]
EXTRAS = 'extras' in sys.argv
main = lambda x: x['samples'] == 5 and x['ttl'] is None and x['policy'] in POLICIES
if ONLY or EXTRAS:   # merge into an existing evict.json: one workload's grid (about 5 minutes) or the extra runs
    prev = json.load(open(os.path.join(os.path.dirname(HERE), 'inputs', 'evict.json')))
    out['runs'] = [x for x in prev['runs'] if not ((ONLY and main(x) and x['work'] == ONLY[0]) or (EXTRAS and not main(x)))]
    WORK = ONLY   # empty for extras: no grid
traces = {w: np.load(os.path.join(S, f'trace_{w}.npy')) for w in set(WORK) | {'wiki'}}
if QUICK:
    print(json.dumps(run(traces['wiki'], 'allkeys-lru', 50_000, bpk, base)), flush=True)
    proc.terminate(); sys.exit()
for w in WORK:
    for pol in POLICIES:
        if pol == 'noeviction' and w != 'wiki': continue
        for cap in SIZES:
            res = run(traces[w], pol, cap, bpk, base); res['work'] = w
            out['runs'].append(res); print(w, json.dumps(res), flush=True)
            save('evict.json', out)
if not ONLY:
    # sampling precision: maxmemory-samples 10 against the default 5 (real trace)
    for cap in SIZES:
        for pol in ('allkeys-lru', 'allkeys-lfu'):
            res = run(traces['wiki'], pol, cap, bpk, base, samples=10); res['work'] = 'wiki'
            out['runs'].append(res); print('s10', json.dumps(res), flush=True)
    # the 3 a.m. outage: volatile-lru with no TTLs set behaves like noeviction; with TTLs on every key it evicts
    for ttl in (None, 3600):
        res = run(traces['wiki'], 'volatile-lru', 50_000, bpk, base, ttl=ttl); res['work'] = 'wiki'
        out['runs'].append(res); print('vol', json.dumps(res), flush=True)
save('evict.json', out)
proc.terminate()
