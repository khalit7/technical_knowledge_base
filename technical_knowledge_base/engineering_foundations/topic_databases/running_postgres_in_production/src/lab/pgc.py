"""Shared helpers for this page's measurements: local PostgreSQL clusters from the pgserver wheel (16.2),
plus PostgreSQL 17 and PgBouncer 1.24.1 installed into a scratch folder (see ../README.md). Nothing is installed system-wide.

Every cluster lives under RP_DATA (default ./rp_data next to where you run the script), outside the repo.
Run each script from a scratch directory with:
  RP_DATA=$PWD/rp_data uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <repo>/.../src/lab/<script>.py
"""
import os, subprocess, json, time, shutil, datetime, platform
import pgserver

B16 = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
B17 = os.environ.get('PG17_BIN', '')          # e.g. <scratch>/cenv/bin (conda-forge postgresql 17)
PGB = os.environ.get('PGBOUNCER', '')         # e.g. <scratch>/pgbi/bin/pgbouncer (built from source)
ROOT = os.path.abspath(os.environ.get('RP_DATA', 'rp_data'))
HERE = os.path.dirname(os.path.abspath(__file__))
INPUTS = os.path.join(HERE, '..', 'inputs')


def sh(*a, check=False, **k):
    r = subprocess.run([str(x) for x in a], capture_output=True, text=True, **k)
    if check and r.returncode != 0:
        raise RuntimeError(' '.join(map(str, a)) + '\n' + r.stdout + r.stderr)
    return r


def now_iso():
    return datetime.datetime.now().astimezone().isoformat(timespec='milliseconds')


def machine():
    try:
        cpu = sh('sysctl', '-n', 'machdep.cpu.brand_string').stdout.strip()
        mem = int(sh('sysctl', '-n', 'hw.memsize').stdout.strip()) // 2**30
    except Exception:
        cpu, mem = platform.processor(), 0
    return {'cpu': cpu, 'ram_gb': mem, 'os': platform.platform(), 'date': datetime.date.today().isoformat()}


class Cluster:
    """One PostgreSQL data directory, listening on 127.0.0.1:<port> (no Unix socket)."""

    def __init__(self, name, port, bindir=B16):
        self.name, self.port, self.bin = name, int(port), bindir
        self.dir = os.path.join(ROOT, name)
        self.data = os.path.join(self.dir, 'data')
        self.log = os.path.join(self.dir, 'server.log')

    def b(self, tool):
        return os.path.join(self.bin, tool)

    def initdb(self, extra=()):
        if os.path.exists(self.dir):
            self.stop(quiet=True)
            shutil.rmtree(self.dir)
        os.makedirs(self.dir)
        sh(self.b('initdb'), '-D', self.data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C', *extra, check=True)

    def conf(self, **kv):
        """Append settings to postgresql.auto.conf style (postgresql.conf; last value wins)."""
        with open(os.path.join(self.data, 'postgresql.conf'), 'a') as f:
            for k, v in kv.items():
                val = v if isinstance(v, (int, float)) else "'" + str(v).replace("'", "''") + "'"
                f.write(f"{k} = {val}\n")

    def hba(self, line):
        with open(os.path.join(self.data, 'pg_hba.conf'), 'a') as f:
            f.write(line + '\n')

    def start(self, wait=True):
        a = [self.b('pg_ctl'), '-D', self.data, '-o', f"-p {self.port} -k '' -h 127.0.0.1", '-l', self.log]
        if wait:
            a += ['-w', '-t', '600']
        else:
            a += ['-W']
        return sh(*a, 'start').stdout

    def stop(self, mode='fast', quiet=False):
        r = sh(self.b('pg_ctl'), '-D', self.data, '-m', mode, '-w', 'stop')
        return r.stdout + ('' if quiet else r.stderr)

    def running(self):
        return sh(self.b('pg_ctl'), '-D', self.data, 'status').returncode == 0

    def psql(self, sql, db='chat', tuples=True, ok_fail=False, timeout=None, user='postgres', extra=()):
        args = [self.b('psql'), '-h', '127.0.0.1', '-p', str(self.port), '-U', user, '-v', 'ON_ERROR_STOP=1', '-X', '-q', *extra]
        if tuples:
            args.append('-At')
        r = sh(*args, '-c', sql, db, timeout=timeout)
        if r.returncode != 0 and not ok_fail:
            raise RuntimeError(r.stderr + '\nSQL: ' + sql[:400])
        return (r.stdout.strip() + ('\n' + r.stderr.strip() if r.stderr.strip() else '')) if ok_fail else r.stdout.strip()

    def table(self, sql, db='chat'):
        """Aligned psql output, as an on-call engineer would see it."""
        return self.psql(sql, db=db, tuples=False, extra=('-P', 'footer=on'))

    def one(self, sql, db='chat'):
        return self.psql(sql, db=db)

    def logtail(self, n=60):
        try:
            return open(self.log).read().splitlines()[-n:]
        except FileNotFoundError:
            return []


def dump(name, obj):
    os.makedirs(INPUTS, exist_ok=True)
    p = os.path.join(INPUTS, name)
    json.dump(obj, open(p, 'w'), indent=1, default=str)
    print('wrote', p)


# The root page's chat schema and generator (../../../src/plan/gen.py), at one tenth of its size:
# 10,000 users, 100,000 chats, 1,000,000 messages; same columns, same seeds, same distributions.
def load_chat(c, users=10_000, chats=100_000, msgs=1_000_000, autovacuum=True):
    c.psql('DROP DATABASE IF EXISTS chat', db='postgres')
    c.psql('CREATE DATABASE chat', db='postgres')
    geo = [('US', ['New York', 'Los Angeles', 'Chicago']), ('IN', ['Bengaluru', 'Mumbai', 'Delhi']), ('GB', ['London', 'Manchester', 'Leeds']),
           ('DE', ['Berlin', 'Munich', 'Hamburg']), ('FR', ['Paris', 'Lyon', 'Marseille']), ('BR', ['Sao Paulo', 'Rio de Janeiro', 'Recife'])]
    vals = ','.join(f"({i},'{cc}',{j},'{city}','UTC')" for i, (cc, cs) in enumerate(geo) for j, city in enumerate(cs))
    t = time.time()
    c.psql(f'''CREATE TABLE geo(ci int, country text, k int, city text, tz text); INSERT INTO geo VALUES {vals};
CREATE TABLE users(id bigint PRIMARY KEY, email text NOT NULL, country text NOT NULL, city text NOT NULL, plan text NOT NULL, created_at timestamptz NOT NULL, timezone text NOT NULL);
CREATE TABLE chats(id bigint PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id), title text NOT NULL, model text NOT NULL, created_at timestamptz NOT NULL);
CREATE TABLE messages(id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, chat_id bigint NOT NULL REFERENCES chats(id), role text NOT NULL, model text NOT NULL,
  tokens int NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL);
SELECT setseed(0.42);
INSERT INTO users SELECT i, 'user' || i || '@example.com', g.country, g.city,
  CASE WHEN r3 < 0.85 THEN 'free' WHEN r3 < 0.99 THEN 'pro' ELSE 'team' END,
  timestamptz '2024-01-01 00:00+00' + (i * interval '5 minutes'), g.tz
FROM (SELECT i, floor(6 * random()^2)::int AS ci, floor(3 * random())::int AS k, random() AS r3 FROM generate_series(1, {users}) i) s
JOIN geo g ON g.ci = s.ci AND g.k = s.k ORDER BY i;
SELECT setseed(0.43);
INSERT INTO chats SELECT i, 1 + floor({users} * random()^1.6)::bigint, 'Chat ' || i,
  (ARRAY['mini','standard','large','reasoning'])[1 + (i % 4)], timestamptz '2025-09-01 00:00+00' + (i * interval '30 seconds')
FROM generate_series(1, {chats}) i;
SELECT setseed(0.44);
INSERT INTO messages SELECT i, c, CASE WHEN i % 2 = 1 THEN 'user' ELSE 'assistant' END,
  (ARRAY['mini','standard','large','reasoning'])[1 + (c % 4)],
  CASE WHEN i % 2 = 1 THEN 10 + floor(190 * random())::int ELSE 50 + floor(1450 * random()^2)::int END,
  left(repeat(md5(i::text), 4), 30 + floor(100 * random())::int), timestamptz '2025-09-01 00:00+00' + (i * interval '3 seconds')
FROM (SELECT i, least({chats}, greatest(1, ceil(i / 10.0)::bigint + floor(200 * random())::bigint - 100)) AS c
      FROM generate_series(1, {msgs}) i) s;
SELECT setval(pg_get_serial_sequence('messages','id'), {msgs});
CREATE INDEX chats_user_id ON chats(user_id); CREATE INDEX messages_chat_created ON messages(chat_id, created_at);
ANALYZE;''')
    return round(time.time() - t, 1)
