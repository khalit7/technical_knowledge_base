"""Shared helpers for the storage engines page's measurements.
Two local PostgreSQL builds, nothing installed system-wide (see ../README.md, "Reproduce"):
  SE_PG16: the pgserver wheel's PostgreSQL 16.2 (the root's version) copied to a scratch folder, plus contrib modules
           (pageinspect, pg_walinspect, pgstattuple, pg_visibility, pg_buffercache, pg_freespacemap) built with PGXS from the 16.2 source.
  SE_PG18: PostgreSQL 18.6 built from source into a scratch folder (for skip scan and uuidv7, new in 18).
Data directories live under SE_DATA (default ./se_data in the folder you run from).
"""
import os, subprocess, json, time
DATA_ROOT = os.path.abspath(os.environ.get('SE_DATA', 'se_data'))

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

class Pg:
    def __init__(self, name, bindir, port, conf=''):
        self.B = bindir; self.port = str(port); self.root = os.path.join(DATA_ROOT, name); self.data = self.root + '/data'; self.conf = conf
    def init(self, fresh=False):
        if fresh and os.path.exists(self.data):
            self.stop(); sh('rm', '-rf', self.data)
        os.makedirs(self.root, exist_ok=True)
        if not os.path.exists(self.data):
            r = sh(f'{self.B}/initdb', '-D', self.data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
            if r.returncode: raise RuntimeError(r.stderr)
            with open(self.data + '/postgresql.auto.conf', 'a') as f: f.write(self.conf)
        return self
    def start(self, extra=''):
        r = sh(f'{self.B}/pg_ctl', '-D', self.data, '-o', f"-p {self.port} -k '' -h 127.0.0.1 {extra}", '-l', self.root + '/log', '-w', 'start')
        return r.stdout + r.stderr
    def stop(self, mode='fast'):
        return sh(f'{self.B}/pg_ctl', '-D', self.data, '-m', mode, '-w', 'stop').stdout
    def psql(self, sql, db='chat', tuples=True):
        args = [f'{self.B}/psql', '-h', '127.0.0.1', '-p', self.port, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q']
        if tuples: args.append('-At')
        r = sh(*args, '-c', sql, db)
        if r.returncode: raise RuntimeError(r.stderr + '\nSQL: ' + sql[:400])
        return r.stdout.strip()
    def jsql(self, sql, db='chat'):
        """rows of a SELECT as a list of dicts (wraps it in json_agg)."""
        out = self.psql(f'SELECT coalesce(json_agg(t), \'[]\') FROM ({sql}) t', db)
        return json.loads(out)
    def timed(self, sql, db='chat'):
        t = time.perf_counter(); self.psql(sql, db); return time.perf_counter() - t
    def explain(self, sql, db='chat', pre=''):
        return json.loads(self.psql(pre + 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql, db))[0]

def pg16(name='pg16', port=54771, conf=''):
    return Pg(name, os.environ['SE_PG16'] + '/bin', port, conf)
def pg18(name='pg18', port=54772, conf=''):
    return Pg(name, os.environ['SE_PG18'] + '/bin', port, conf)

# The root page's 1M-message table (src/read/measure_read.py, same seed), so page and index counts agree with the root.
MESSAGES_1M = '''SELECT setseed(0.44);
CREATE TABLE messages(id bigint PRIMARY KEY, chat_id bigint NOT NULL, role text NOT NULL, model text NOT NULL,
  tokens int NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL);
INSERT INTO messages SELECT i, c, CASE WHEN i % 2 = 1 THEN 'user' ELSE 'assistant' END,
  (ARRAY['mini','standard','large','reasoning'])[1 + (c % 4)],
  CASE WHEN i % 2 = 1 THEN 10 + floor(190 * random())::int ELSE 50 + floor(1450 * random()^2)::int END,
  left(repeat(md5(i::text), 4), 30 + floor(100 * random())::int),
  timestamptz '2025-09-01 00:00+00' + (i * interval '3 seconds')
FROM (SELECT i, greatest(1, least({chats}, (i / 10) + floor(2000 * (random() - 0.5))::bigint)) AS c FROM generate_series(1, {n}) i) s;'''
def messages_sql(n=1_000_000, chats=100_000, name='messages'):
    return MESSAGES_1M.format(n=n, chats=chats).replace('TABLE messages', 'TABLE ' + name).replace('INTO messages', 'INTO ' + name)

def save(obj, name):
    here = os.path.dirname(os.path.abspath(__file__))
    p = os.path.join(here, '..', 'inputs', name)
    json.dump(obj, open(p, 'w'), indent=1, default=str); print('wrote', p)
