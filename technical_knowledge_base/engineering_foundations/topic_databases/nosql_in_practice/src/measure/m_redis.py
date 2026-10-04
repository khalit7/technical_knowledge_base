"""Redis 8.8.0 (conda-forge build, in the scratch env): data structures, Lua rate limiter, streams, persistence, async replication.
Run from the scratch directory (see common.py); about 4 minutes. Writes inputs/redis.json.
"""
import os, sys, time, json, signal, subprocess, random, multiprocessing as mp, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import redis

BIN = os.path.join(S, 'env', 'bin')
DATA = os.path.join(S, 'redis_data')
res = machine()
procs = []

def start(port, d, extra=()):
    os.makedirs(d, exist_ok=True)
    p = subprocess.Popen([f'{BIN}/redis-server', '--port', str(port), '--bind', '127.0.0.1', '--dir', d, '--daemonize', 'no',
                          '--protected-mode', 'no', *extra], stdout=open(d + '/log', 'a'), stderr=subprocess.STDOUT)
    procs.append(p); wait_port(port, 30); return p

def bench(port, test, c, n, P=1):
    """redis-benchmark: requests per second for one command."""
    r = sh(f'{BIN}/redis-benchmark', '-h', '127.0.0.1', '-p', str(port), '-t', test, '-c', str(c), '-n', str(n), '-P', str(P), '-q', '--csv')
    line = [l for l in r.stdout.splitlines() if l.startswith('"' + test.upper())]
    return round(float(line[0].split(',')[1].strip('"'))) if line else r.stdout[-300:]

# ---------- token bucket in Lua (the page shows this script verbatim) ----------
TOKEN_BUCKET = """
-- KEYS[1]: the bucket; ARGV[1]: capacity; ARGV[2]: refill per second; ARGV[3]: cost
local cap, rate, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local t = redis.call('TIME')                         -- server clock: every client agrees
local now = tonumber(t[1]) + tonumber(t[2]) / 1e6
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens, ts = tonumber(b[1]) or cap, tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) * rate)   -- refill for the time that passed
local ok = 0
if tokens >= cost then tokens = tokens - cost; ok = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], math.ceil(cap / rate) + 1) -- idle buckets disappear
return ok
"""

def naive_take(port, key, n, q):
    """The race: read the count, decide in the app, write it back (two round trips, not atomic)."""
    r = redis.Redis(port=port); ok = 0
    for _ in range(n):
        v = int(r.get(key) or 0)
        if v > 0:
            r.set(key, v - 1); ok += 1
    q.put(ok)

def lua_take(port, key, n, q):
    r = redis.Redis(port=port); tb = r.register_script(TOKEN_BUCKET); ok = 0
    for _ in range(n):
        ok += tb(keys=[key], args=[20, 0.0001, 1])
    q.put(ok)

def lua_rate(port, nkeys, n, q):
    r = redis.Redis(port=port); tb = r.register_script(TOKEN_BUCKET)
    t = time.perf_counter()
    for i in range(n):
        tb(keys=[f'rl:user:{random.randrange(nkeys)}'], args=[100, 10, 1])
    q.put(n / (time.perf_counter() - t))

def window_log(port, n, q):
    """Sliding-window log: one sorted set per user, scores are request times."""
    r = redis.Redis(port=port)
    t = time.perf_counter()
    for i in range(n):
        key = f'sw:user:{random.randrange(10000)}'; now = time.time()
        p = r.pipeline(transaction=True)
        p.zremrangebyscore(key, 0, now - 60); p.zadd(key, {f'{now}:{i}': now}); p.zcard(key); p.expire(key, 61)
        p.execute()
    q.put(n / (time.perf_counter() - t))

def fixed_window(port, n, q):
    r = redis.Redis(port=port)
    t = time.perf_counter()
    for i in range(n):
        key = f'fw:user:{random.randrange(10000)}:{int(time.time() // 60)}'
        p = r.pipeline(transaction=False); p.incr(key); p.expire(key, 60); p.execute()
    q.put(n / (time.perf_counter() - t))

def run_par(f, k, *a):
    q = mp.Queue(); ps = [mp.Process(target=f, args=a + (q,)) for _ in range(k)]
    [p.start() for p in ps]; out = [q.get() for _ in ps]; [p.join() for p in ps]; return out

def writer(port, stop_after, q):
    """Increment a counter as fast as possible; report how many INCRs the server acknowledged."""
    r = redis.Redis(port=port, socket_timeout=2); acked = 0; t = time.time()
    try:
        while time.time() - t < stop_after:
            r.incr('acked'); acked += 1
    except Exception:
        pass
    q.put(acked)

def crash_test(port, d, extra, label):
    """Write for 3 s, kill -9 the server mid-stream, restart it on the same files, count what survived."""
    shutil.rmtree(d, ignore_errors=True)
    p = start(port, d, extra)
    q = mp.Queue(); w = mp.Process(target=writer, args=(port, 30, q)); w.start()
    time.sleep(3); os.kill(p.pid, signal.SIGKILL); p.wait()
    acked = q.get(); w.join()
    p2 = start(port, d, extra); r = redis.Redis(port=port)
    for _ in range(100):
        try:
            got = int(r.get('acked') or 0); break
        except redis.exceptions.BusyLoadingError:
            time.sleep(0.2)
    p2.terminate(); p2.wait()
    out = {'label': label, 'config': ' '.join(extra), 'acked': acked, 'recovered': got, 'lost': acked - got}
    print(out, flush=True); return out

def sections_1_to_6(port):
    shutil.rmtree(DATA, ignore_errors=True)
    p = start(port, DATA, ('--save', '', '--appendonly', 'no'))
    r = redis.Redis(port=port, decode_responses=True)
    res['version'] = r.info('server')['redis_version']

    # 1. one round trip
    r.set('k', 'v'); lat = []
    for _ in range(20000):
        t = time.perf_counter(); r.get('k'); lat.append((time.perf_counter() - t) * 1e6)
    res['get_us'] = {'p50': round(pct(lat, .5), 1), 'p99': round(pct(lat, .99), 1), 'n': 20000}
    # 2. redis-benchmark, the standard tool
    res['benchmark'] = {f'{t}_c{c}_P{P}': bench(port, t, c, n, P) for t, c, n, P in
                        [('set', 1, 50000, 1), ('get', 1, 50000, 1), ('set', 50, 300000, 1), ('get', 50, 300000, 1),
                         ('set', 50, 1000000, 16), ('get', 50, 1000000, 16), ('zadd', 50, 300000, 1), ('xadd', 50, 300000, 1), ('incr', 50, 300000, 1)]}
    print(res['benchmark'], flush=True)

    # 3. leaderboard: 100,000 players
    N = 100_000; random.seed(7)
    pipe = r.pipeline(transaction=False)
    for i in range(N):
        pipe.zadd('lb', {f'user:{i}': random.randint(0, 1_000_000)})
        if i % 5000 == 4999: pipe.execute()
    pipe.execute()
    lb = {'members': r.zcard('lb'), 'memory_bytes': r.memory_usage('lb'), 'encoding': r.object('encoding', 'lb')}
    n = 20000; t = time.perf_counter()
    for _ in range(n): r.zincrby('lb', random.randint(1, 50), f'user:{random.randrange(N)}')
    lb['zincrby_ops_1client'] = round(n / (time.perf_counter() - t))
    lat = []
    for _ in range(5000):
        t = time.perf_counter(); r.zrange('lb', 0, 9, desc=True, withscores=True); lat.append((time.perf_counter() - t) * 1e6)
    lb['top10_us_p50'] = round(pct(lat, .5), 1)
    lat = []
    for _ in range(5000):
        u = f'user:{random.randrange(N)}'; t = time.perf_counter(); r.zrevrank('lb', u); lat.append((time.perf_counter() - t) * 1e6)
    lb['rank_us_p50'] = round(pct(lat, .5), 1)
    lb['sample_top3'] = r.zrange('lb', 0, 2, desc=True, withscores=True)
    lb['sample_rank_user_4242'] = r.zrevrank('lb', 'user:4242')
    res['leaderboard'] = lb; print(lb, flush=True)

    # 4. rate limiting
    rl = {}
    r.set('naive', 20)
    rl['naive_allowed'] = sum(run_par(naive_take, 16, port, 'naive', 50))
    rl['lua_allowed'] = sum(run_par(lua_take, 16, port, 'bucket:race', 50))
    rl['capacity'] = 20; rl['clients'] = 16; rl['attempts'] = 16 * 50
    rl['lua_ops_1client'] = round(run_par(lua_rate, 1, port, 10000, 20000)[0])
    rl['lua_ops_8clients'] = round(sum(run_par(lua_rate, 8, port, 10000, 20000)))
    rl['window_log_ops_1client'] = round(run_par(window_log, 1, port, 20000)[0])
    rl['fixed_window_ops_1client'] = round(run_par(fixed_window, 1, port, 20000)[0])
    rl['script'] = TOKEN_BUCKET.strip()
    res['ratelimit'] = rl; print({k: v for k, v in rl.items() if k != 'script'}, flush=True)

    # 5. streams: a consumer that crashes before acknowledging
    st = {}; r.delete('jobs')
    ids = [r.xadd('jobs', {'chat': c, 'task': 'summarise'}) for c in (101, 102, 103)]
    r.xgroup_create('jobs', 'workers', id='0')
    got = r.xreadgroup('workers', 'worker-a', {'jobs': '>'}, count=2)
    st['worker_a_read'] = [e[0] for e in got[0][1]]
    r.xack('jobs', 'workers', got[0][1][0][0])   # finishes the first, then "crashes" holding the second
    st['pending_after_crash'] = [{'id': x['message_id'], 'consumer': x['consumer'], 'deliveries': x['times_delivered']}
                                 for x in r.xpending_range('jobs', 'workers', '-', '+', 10)]
    time.sleep(0.2)
    cl = r.xautoclaim('jobs', 'workers', 'worker-b', min_idle_time=100, start_id='0-0')
    st['worker_b_claimed'] = [e[0] for e in cl[1]]
    got_b = r.xreadgroup('workers', 'worker-b', {'jobs': '>'}, count=10)
    st['worker_b_new'] = [e[0] for e in got_b[0][1]] if got_b else []
    st['ids'] = ids; res['streams'] = st; print(st, flush=True)
    p.terminate(); p.wait()

    # 6. persistence: throughput under each policy (redis-benchmark SET), then a kill -9 test
    pol = []
    for label, extra in [('no persistence', ('--save', '', '--appendonly', 'no')),
                         ('RDB snapshots (save 60 1000)', ('--save', '60 1000', '--appendonly', 'no')),
                         ('AOF, appendfsync everysec (default)', ('--save', '', '--appendonly', 'yes', '--appendfsync', 'everysec')),
                         ('AOF, appendfsync always', ('--save', '', '--appendonly', 'yes', '--appendfsync', 'always'))]:
        d = os.path.join(S, 'redis_p'); shutil.rmtree(d, ignore_errors=True)
        pp = start(port, d, extra)
        pol.append({'label': label, 'set_c1': bench(port, 'set', 1, 20000), 'set_c50': bench(port, 'set', 50, 200000)})
        pp.terminate(); pp.wait(); print(pol[-1], flush=True)
    res['persistence'] = pol
    res['crash'] = [crash_test(port, os.path.join(S, 'redis_c1'), ('--save', '60 1000', '--appendonly', 'no'), 'RDB snapshots only'),
                    crash_test(port, os.path.join(S, 'redis_c2'), ('--save', '', '--appendonly', 'yes', '--appendfsync', 'everysec'), 'AOF everysec')]


def replication(port):
    # 7. async replication: acknowledged writes lost on failover
    port2 = free_port(port + 1)
    d1, d2 = os.path.join(S, 'redis_r1'), os.path.join(S, 'redis_r2')
    for d in (d1, d2): shutil.rmtree(d, ignore_errors=True)
    prim = start(port, d1, ('--save', '', '--appendonly', 'no'))
    repl = start(port2, d2, ('--save', '', '--appendonly', 'no', '--replicaof', '127.0.0.1', str(port)))
    rp, rr = redis.Redis(port=port), redis.Redis(port=port2)
    for _ in range(100):
        if rr.info('replication').get('master_link_status') == 'up': break
        time.sleep(0.1)
    for i in range(1000): rp.set(f'before:{i}', 1)
    w = rp.wait(1, 1000)                      # all 1,000 are on the replica before the fault
    os.kill(repl.pid, signal.SIGSTOP)         # the replica stalls (a GC-like pause, a slow network)
    acked = 0
    val = 'v' * 10240                                         # 10 KB values: 50 MB in all, more than the socket buffers hold
    for i in range(5000): rp.set(f'during:{i}', val); acked += 1   # every one of these gets OK
    w2 = rp.wait(1, 500)                      # WAIT reports how many replicas confirmed: 0
    os.kill(prim.pid, signal.SIGKILL); prim.wait()   # the primary dies
    os.kill(repl.pid, signal.SIGCONT); time.sleep(2)   # let it apply whatever reached it
    rr.replicaof('NO', 'ONE')                 # failover: the replica becomes the primary
    survived = len(rr.keys('during:*')); before = len(rr.keys('before:*'))
    res['replication'] = {'value_bytes': 10240, 'before_acked': 1000, 'before_on_replica': before, 'wait_before': w, 'during_acked': acked,
                          'wait_during': w2, 'during_survived': survived, 'lost': acked - survived}
    print(res['replication'], flush=True)
    repl.terminate(); repl.wait()
    save('redis.json', res)
    for x in procs:
        if x.poll() is None: x.terminate()

if __name__ == '__main__':
    port = free_port(56410); res['port'] = port
    if sys.argv[1:] == ['repl']:   # rerun only section 7, keeping the rest of redis.json
        res = json.load(open(os.path.join(INPUTS, 'redis.json')))
    else:
        sections_1_to_6(port)
    replication(port)
