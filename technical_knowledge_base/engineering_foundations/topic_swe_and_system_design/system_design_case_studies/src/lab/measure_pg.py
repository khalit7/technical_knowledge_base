"""Two small real measurements on a local PostgreSQL (binaries from the pgserver wheel, nothing installed system-wide).
Run from a scratch directory (keeps the repo .venv untouched):
  uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <this file> <out.json>
About 3 to 5 minutes on an Apple M1 Pro laptop.

A. The rate-limiter race (design 2). One counter row, limit 100, 32 threads each trying 25 requests at once.
   naive:  SELECT n; if n < limit: UPDATE n = n + 1      (check and act are two round trips)
   atomic: UPDATE ... SET n = n + 1 WHERE n < limit RETURNING n   (check and act in one statement)
   The same race exists with Redis GET then INCR; a Lua script (or INCR then compare) is Redis's atomic form.
B. Fan-out on read against fan-out on write (design 4). 10,000 users, each following 100 accounts chosen with a
   Zipf-like skew (a few accounts have most followers), 100,000 posts. Read: the newest 50 posts for a user.
   on read:  join follows to posts at read time (index on posts(author, id desc))
   on write: a precomputed timelines table (user_id, post_id), capped at the newest 800 per user
   Also timed: inserting one post's timeline rows for the most-followed account and for a median account.
"""
import os, sys, json, time, random, tempfile, shutil, subprocess, statistics, threading, datetime, platform
import pgserver, psycopg

OUT = sys.argv[1] if len(sys.argv) > 1 else 'pg_measured.json'
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
d = tempfile.mkdtemp(prefix='sdcs'); data = os.path.join(d, 'data'); port = '54331'
def sh(*a): return subprocess.run(list(a), capture_output=True, text=True)
sh(f'{B}/initdb', '-D', data, '-U', 'postgres', '--auth=trust')
sh(f'{B}/pg_ctl', '-D', data, '-o', f'-p {port} -k {d} -c max_connections=100', '-l', d + '/log', '-w', 'start')
DSN = f'host=127.0.0.1 port={port} user=postgres dbname=postgres'
def conn(): return psycopg.connect(DSN, autocommit=True)
out = {'date': datetime.date.today().isoformat(), 'machine': 'Apple M1 Pro laptop, macOS ' + platform.mac_ver()[0] + ', TCP loopback'}
try:
    c = conn(); out['postgres'] = c.execute('show server_version').fetchone()[0]
    # ---------- A. rate-limiter race ----------
    c.execute('create table counters(k text primary key, n int not null)')
    LIMIT, THREADS, TRIES = 100, 32, 25
    def run(mode):
        c.execute("insert into counters values ('alice', 0) on conflict (k) do update set n = 0")
        admitted = [0] * THREADS; bar = threading.Barrier(THREADS)
        def worker(i):
            cc = conn(); bar.wait()
            for _ in range(TRIES):
                if mode == 'naive':
                    n = cc.execute("select n from counters where k='alice'").fetchone()[0]
                    if n < LIMIT:
                        cc.execute("update counters set n = n + 1 where k='alice'"); admitted[i] += 1
                else:
                    r = cc.execute("update counters set n = n + 1 where k='alice' and n < %s returning n", (LIMIT,)).fetchone()
                    if r: admitted[i] += 1
            cc.close()
        ts = [threading.Thread(target=worker, args=(i,)) for i in range(THREADS)]
        t0 = time.perf_counter(); [t.start() for t in ts]; [t.join() for t in ts]
        return {'admitted': sum(admitted), 'counter': c.execute("select n from counters where k='alice'").fetchone()[0], 'seconds': round(time.perf_counter() - t0, 3)}
    out['race'] = {'limit': LIMIT, 'threads': THREADS, 'tries_each': TRIES,
                   'naive': [run('naive') for _ in range(3)], 'atomic': [run('atomic') for _ in range(3)]}
    print(json.dumps(out['race']), flush=True)
    # ---------- B. fan-out ----------
    random.seed(7)
    U, F, P, CAP = 10000, 100, 100000, 800
    w = [1 / (r + 1) ** 1.1 for r in range(U)]          # Zipf-like popularity of accounts (illustrative skew)
    from itertools import accumulate
    cw = list(accumulate(w))
    c.execute('create table follows(follower int, followee int, primary key(follower, followee))')
    c.execute('create table posts(id bigint primary key, author int not null)')
    rows = []
    for u in range(U):
        s = set()
        while len(s) < F:
            v = random.choices(range(U), cum_weights=cw, k=F)
            for x in v:
                if x != u and len(s) < F: s.add(x)
        rows += [(u, v) for v in s]
    with c.cursor() as cur:
        with cur.copy('copy follows from stdin') as cp:
            for r in rows: cp.write_row(r)
        # authors: active accounts post more; posts get increasing ids (time order)
        aw = [0.5 + random.random() for _ in range(U)]
        authors = random.choices(range(U), weights=aw, k=P)
        with cur.copy('copy posts from stdin') as cp:
            for i, a in enumerate(authors): cp.write_row((i + 1, a))
    c.execute('create index on posts(author, id desc)')
    c.execute('create index on follows(followee)')
    t0 = time.perf_counter()
    c.execute('create table timelines(user_id int, post_id bigint, primary key(user_id, post_id))')
    c.execute(f'''insert into timelines
      select follower, id from (select f.follower, p.id, row_number() over (partition by f.follower order by p.id desc) rn
        from follows f join posts p on p.author = f.followee) x where rn <= {CAP}''')
    out_build = round(time.perf_counter() - t0, 1)
    c.execute('analyze')
    nfol = c.execute('select followee, count(*) from follows group by followee order by 2 desc').fetchall()
    counts = [n for _, n in nfol] + [0] * (U - len(nfol))
    top_author, top_n = nfol[0]
    med_n = int(statistics.median(counts))
    med_author = next(a for a, n in nfol if n == med_n) if any(n == med_n for _, n in nfol) else nfol[len(nfol) // 2][0]
    users = random.sample(range(U), 500)
    def timeit(sql, args):
        ts = []
        for u in users:
            t = time.perf_counter(); c.execute(sql, args(u)).fetchall(); ts.append((time.perf_counter() - t) * 1000)
        ts.sort(); return {'median_ms': round(statistics.median(ts), 3), 'p99_ms': round(ts[int(0.99 * len(ts)) - 1], 3)}
    q_read = 'select p.id from follows f join posts p on p.author = f.followee where f.follower = %s order by p.id desc limit 50'
    q_tl = 'select post_id from timelines where user_id = %s order by post_id desc limit 50'
    timeit(q_read, lambda u: (u,)); timeit(q_tl, lambda u: (u,))   # warm
    r_read = timeit(q_read, lambda u: (u,)); r_tl = timeit(q_tl, lambda u: (u,))
    def fan(author):
        best = []
        for k in range(5):
            pid = 10_000_000 + author * 10 + k
            t = time.perf_counter()
            c.execute('insert into timelines select follower, %s from follows where followee = %s', (pid, author))
            best.append((time.perf_counter() - t) * 1000)
        return round(statistics.median(best), 2)
    tl_rows = c.execute('select count(*) from timelines').fetchone()[0]
    tl_bytes = c.execute("select pg_total_relation_size('timelines')").fetchone()[0]
    out['feed'] = {'users': U, 'follows_each': F, 'posts': P, 'cap': CAP, 'zipf_s': 1.1,
                   'top_followers': top_n, 'median_followers': med_n,
                   'read_on_read': r_read, 'read_precomputed': r_tl,
                   'fanout_ms_top': fan(top_author), 'fanout_ms_median': fan(med_author),
                   'timeline_rows': tl_rows, 'timeline_bytes': tl_bytes, 'timeline_build_s': out_build}
    print(json.dumps(out['feed']), flush=True)
finally:
    sh(f'{B}/pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'); shutil.rmtree(d, ignore_errors=True)
json.dump(out, open(OUT, 'w'), indent=1); print('wrote', OUT)
