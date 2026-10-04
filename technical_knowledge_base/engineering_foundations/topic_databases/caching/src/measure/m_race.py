"""The write/fill race in cache-aside, reproduced with two real clients against a local PostgreSQL 16.2 and Redis 8.8,
and the fixes measured. One row of the chat database (chats.id = 42) is renamed while another client is filling the cache.
Per trial: the cache is emptied and the title set to a known value; then two threads start together:
  reader  GET the cache key; on a miss SELECT the title from Postgres, pause (the slow path: a GC pause, a busy CPU,
          a long network hop), then write the value it read into the cache
  writer  wait, UPDATE the title (autocommit), then invalidate the cache the strategy's way
Reader pauses: 90% uniform 0 to 10 ms, 10% uniform 10 to 100 ms; writer waits uniform 0 to 10 ms (illustrative timings,
fixed seed). After both finish (and any delayed delete), the trial is stale if the cache holds a value that differs from Postgres.
Strategies: delete (cache-aside, delete on write), double_delete (delete, then delete again 50 ms later),
lease (Facebook memcache leases emulated in Redis: a token on miss, a fill accepted only while the token is valid; a delete
revokes it), version (versioned keys: the writer bumps a version counter after the commit; readers use the key of the
current version), set_on_write (two writers each UPDATE then SET the new value in the cache; no reader).
Env: CA_SCRATCH. Writes inputs/race.json.
"""
import os, sys, time, json, random, threading, subprocess
import psycopg, redis
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine, free_port, wait_port, start_redis

B = os.path.join(S, 'pg16', 'bin'); DATA = os.path.join(S, 'pgdata')
PORT = free_port(55730)
TRIALS = 400
subprocess.run([f'{B}/pg_ctl', '-D', DATA, '-o', f"-p {PORT} -k '' -h 127.0.0.1", '-l', os.path.join(S, 'pg_race.log'), '-w', 'start'], capture_output=True)
wait_port(PORT)
proc, RP = start_redis(46440)
pg = lambda: psycopg.connect(host='127.0.0.1', port=PORT, user='postgres', dbname='chat', autocommit=True)
rc = lambda: redis.Redis(port=RP, decode_responses=True)
K, L, V = 'chat:42:title', 'lease:chat:42:title', 'ver:chat:42'
FILL = rc().register_script("if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', 300); redis.call('DEL', KEYS[2]); return 1 else return 0 end")
rng = random.Random(2026)
T0 = [0.0]


def now():
    return round((time.perf_counter() - T0[0]) * 1000, 2)


def reader(strategy, pause, log, r, c):
    if strategy == 'version':
        v = r.get(V) or '0'; key = f'{K}:v{v}'
        if r.get(key) is not None: log.append((now(), 'reader', 'hit')); return
        log.append((now(), 'reader', f'miss on version {v}'))
        val = c.execute('SELECT title FROM chats WHERE id = 42').fetchone()[0]; log.append((now(), 'reader', f'read "{val}" from Postgres'))
        time.sleep(pause); r.set(key, val, ex=300); log.append((now(), 'reader', f'filled version {v} with "{val}"')); return
    if r.get(K) is not None: log.append((now(), 'reader', 'hit')); return
    log.append((now(), 'reader', 'miss'))
    tok = None
    if strategy == 'lease':
        tok = str(r.incr('lease:ctr'))
        if not r.set(L, tok, nx=True, px=10000):
            log.append((now(), 'reader', 'lease held by another client: wait and retry')); return
        log.append((now(), 'reader', f'got lease {tok}'))
    val = c.execute('SELECT title FROM chats WHERE id = 42').fetchone()[0]; log.append((now(), 'reader', f'read "{val}" from Postgres'))
    time.sleep(pause)
    if strategy == 'lease':
        ok = FILL(keys=[K, L], args=[tok, val]); log.append((now(), 'reader', f'fill "{val}" ' + ('accepted' if ok else 'rejected: lease revoked')))
    else:
        r.set(K, val, ex=300); log.append((now(), 'reader', f'filled "{val}"'))


def writer(strategy, wait, new, log, r, c, extra):
    time.sleep(wait)
    c.execute('UPDATE chats SET title = %s WHERE id = 42', (new,)); log.append((now(), 'writer', f'committed "{new}"'))
    if strategy == 'version':
        r.incr(V); log.append((now(), 'writer', 'bumped version'))
    elif strategy == 'lease':
        r.delete(K, L); log.append((now(), 'writer', 'deleted key and lease'))
    elif strategy == 'set_on_write':
        time.sleep(extra); r.set(K, new, ex=300); log.append((now(), 'writer', f'set cache "{new}"'))
    else:
        r.delete(K); log.append((now(), 'writer', 'deleted key'))
        if strategy == 'double_delete':
            time.sleep(0.05); r.delete(K); log.append((now(), 'writer', 'deleted key again (50 ms later)'))


def cached_view(strategy, r):
    if strategy == 'version':
        return r.get(f'{K}:v{r.get(V) or "0"}')
    return r.get(K)


res = {**machine(), 'trials': TRIALS, 'postgres': '16.2', 'redis': rc().info('server')['redis_version'], 'strategies': {}, 'examples': {}}
conns = [(rc(), pg()) for _ in range(2)]
for strategy in ('delete', 'double_delete', 'lease', 'version', 'set_on_write'):
    rng.seed(2026)
    stale = 0; stale_ms = []; logs = []; rejected = 0
    for t in range(TRIALS):
        r0, c0 = conns[0]
        r0.flushall(); c0.execute("UPDATE chats SET title = 'Trip plan' WHERE id = 42")
        pause = rng.uniform(0, 0.01) if rng.random() < 0.9 else rng.uniform(0.01, 0.1)
        wait = rng.uniform(0, 0.01)
        log = []; T0[0] = time.perf_counter()
        if strategy == 'set_on_write':
            ths = [threading.Thread(target=writer, args=(strategy, rng.uniform(0, 0.005), nm, log, *conns[i], rng.uniform(0, 0.01)))
                   for i, nm in enumerate(('Trip plan v2', 'Trip plan v3'))]
        else:
            ths = [threading.Thread(target=reader, args=(strategy, pause, log, *conns[0])),
                   threading.Thread(target=writer, args=(strategy, wait, 'Trip plan v2', log, *conns[1], 0))]
        for th in ths: th.start()
        for th in ths: th.join()
        db = c0.execute('SELECT title FROM chats WHERE id = 42').fetchone()[0]
        cv = cached_view(strategy, r0)
        bad = cv is not None and cv != db
        rejected += any('rejected' in e[2] for e in log)
        if bad:
            stale += 1; stale_ms.append(r0.ttl(K) if strategy != 'version' else None)
        logs.append({'trial': t, 'wait_ms': round(wait * 1000, 2), 'stale': bad, 'cache': cv, 'db': db, 'pause_ms': round(pause * 1000, 2), 'log': sorted(log)})
    ex = logs[:30]   # the first 30 trials: the same seed gives every strategy the same pauses, so trial i is comparable across strategies
    res['strategies'][strategy] = {'stale': stale, 'stale_share': stale / TRIALS, 'fills_rejected': rejected,
                                   'stale_ttl_left_s': stale_ms[:5]}
    res['examples'][strategy] = ex
    print(strategy, json.dumps(res['strategies'][strategy]), flush=True)
c0 = conns[0][1]; c0.execute("UPDATE chats SET title = 'Chat 42' WHERE id = 42")
save('race.json', res)
proc.terminate()
subprocess.run([f'{B}/pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop'], capture_output=True)
