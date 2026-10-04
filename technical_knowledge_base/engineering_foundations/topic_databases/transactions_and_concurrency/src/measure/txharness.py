"""Two (or three) real database sessions driven step by step from one script.

Each session is a real connection in its own thread. The coordinator hands a session one statement,
waits up to BLOCK_WAIT seconds for it to finish, and if it has not, records it as blocked (on Postgres it
also asks pg_stat_activity what the backend waits for) and moves on. Statements that finish later
(because the blocker committed, or a deadlock was detected) are recorded with the step during which
they finished. So the recorded trace is the real order of events, not a model of it.

Servers (all in a scratch directory, nothing installed system-wide):
  pg     PostgreSQL 16.2 from the pgserver wheel (same build as the Topic: databases root)
  pgx    PostgreSQL 16.15 from conda-forge, used only because it ships the pageinspect extension
  mysql  MySQL 9.7.2 (InnoDB) from conda-forge
"""
import os, time, threading, queue, subprocess, json

SCR = os.path.abspath(os.environ.get('TX_SCRATCH', '.'))
BLOCK_WAIT = 0.5      # seconds a statement may take before it is called blocked
SETTLE = 1.5          # extra seconds to wait while something is blocked (> deadlock_timeout of 1 s)

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

def port_free(port):
    import socket
    with socket.socket() as so:
        return so.connect_ex(('127.0.0.1', int(port))) != 0

# ---------------------------------------------------------------- servers
class PG:
    kind = 'postgres'
    def __init__(self, bindir, root, port):
        self.B, self.root, self.port = bindir, root, port
        self.data = os.path.join(root, 'data')
    def start(self, extra=''):
        os.makedirs(self.root, exist_ok=True)
        if not os.path.exists(self.data):
            sh(f'{self.B}/initdb', '-D', self.data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
        if not port_free(self.port): raise RuntimeError(f'port {self.port} is in use by another server')
        r = sh(f'{self.B}/pg_ctl', '-D', self.data, '-o', f"-p {self.port} -k '' -h 127.0.0.1 {extra}", '-l', self.root + '/log', '-w', 'start')
        return r.stdout + r.stderr
    def stop(self):
        sh(f'{self.B}/pg_ctl', '-D', self.data, '-m', 'fast', '-w', 'stop')
    def connect(self, db='txlab'):
        import psycopg
        c = psycopg.connect(host='127.0.0.1', port=self.port, user='postgres', dbname=db, autocommit=True)
        return c
    def ensure_db(self):
        c = self.connect('postgres')
        if not c.execute("SELECT 1 FROM pg_database WHERE datname='txlab'").fetchone():
            c.execute('CREATE DATABASE txlab')
        c.close()
    def begin_sql(self, level):
        return ['BEGIN ISOLATION LEVEL ' + level.upper()]
    def version(self):
        c = self.connect(); v = c.execute('SHOW server_version').fetchone()[0]; c.close(); return v

def pgserver_bin():
    import pgserver
    return os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')

class MY:
    kind = 'mysql'
    def __init__(self, envdir, root, port):
        self.E, self.root, self.port = envdir, root, port
        self.data = os.path.join(root, 'data'); self.sock = os.path.join(root, 'mysql.sock')
    def start(self, extra=()):
        os.makedirs(self.root, exist_ok=True)
        if not os.path.exists(self.data):
            sh(f'{self.E}/bin/mysqld', '--initialize-insecure', f'--datadir={self.data}', f'--basedir={self.E}')
        if not port_free(self.port): raise RuntimeError(f'port {self.port} is in use by another server')
        self.p = subprocess.Popen([f'{self.E}/bin/mysqld', f'--datadir={self.data}', f'--basedir={self.E}', f'--port={self.port}',
                                   '--socket=m.sock', '--bind-address=127.0.0.1', '--mysqlx=OFF',
                                   f'--lc-messages-dir={self.E}/share/mysql', *extra], cwd=self.data,
                                  stdout=open(self.root + '/out.log', 'w'), stderr=subprocess.STDOUT)
        for _ in range(120):
            try:
                c = self.connect(None); c.close(); return 'started'
            except Exception:
                time.sleep(0.5)
        raise RuntimeError('mysqld did not start')
    def stop(self):
        try:
            c = self.connect(None); c.cursor().execute('SHUTDOWN'); c.close()
        except Exception:
            pass
        try: self.p.wait(30)
        except Exception: self.p.kill()
    def connect(self, db='txlab'):
        import pymysql
        return pymysql.connect(host='127.0.0.1', port=self.port, user='root', password='', database=db, autocommit=True)
    def ensure_db(self):
        c = self.connect(None); c.cursor().execute('CREATE DATABASE IF NOT EXISTS txlab'); c.close()
    def begin_sql(self, level):
        return ['SET TRANSACTION ISOLATION LEVEL ' + level.upper(), 'START TRANSACTION']
    def version(self):
        c = self.connect(); cur = c.cursor(); cur.execute('SELECT VERSION()'); v = cur.fetchone()[0]; c.close(); return v

# ---------------------------------------------------------------- one session
class Session(threading.Thread):
    def __init__(self, name, srv, done):
        super().__init__(daemon=True)
        self.name_, self.srv = name, srv
        self.conn = srv.connect()
        self.q = queue.Queue(); self.done = done; self.failed = False
        if srv.kind == 'postgres':
            self.pid = self.conn.info.backend_pid
        else:
            cur = self.conn.cursor(); cur.execute('SELECT CONNECTION_ID()'); self.pid = cur.fetchone()[0]
        self.start()
    def run(self):
        while True:
            item = self.q.get()
            if item is None: break
            step_no, sqls = item
            t0 = time.perf_counter(); res = {'rows': None, 'status': None, 'error': None, 'code': None}
            try:
                for s in sqls:
                    if s.startswith(('BEGIN', 'START', 'SET TRANSACTION')): self.failed = False
                    res = self._exec(s)
                    if res['error']: self.failed = True; break
                    if s in ('COMMIT', 'ROLLBACK') and self.failed:
                        res['tx_failed'] = True; self.failed = False
            except Exception as e:  # driver-level failure
                res = {'rows': None, 'status': None, 'error': str(e), 'code': 'driver'}
            res['ms'] = round((time.perf_counter() - t0) * 1000, 1)
            res['t_end'] = time.perf_counter()
            self.done.put((step_no, res))
    def _exec(self, s):
        if self.srv.kind == 'postgres':
            import psycopg
            try:
                cur = self.conn.execute(s)
                rows = cur.fetchall() if cur.description else None
                return {'rows': [list(map(_j, r)) for r in rows] if rows is not None else None,
                        'status': cur.statusmessage, 'rowcount': cur.rowcount, 'error': None, 'code': None}
            except psycopg.Error as e:
                d = e.diag
                return {'rows': None, 'status': None, 'error': (d.message_primary or str(e)).strip(),
                        'detail': (d.message_detail or '').strip(), 'hint': (d.message_hint or '').strip(),
                        'code': e.sqlstate}
        else:
            import pymysql
            cur = self.conn.cursor()
            try:
                n = cur.execute(s)
                rows = cur.fetchall() if cur.description else None
                return {'rows': [list(map(_j, r)) for r in rows] if rows is not None else None,
                        'status': None, 'rowcount': n, 'error': None, 'code': None}
            except pymysql.MySQLError as e:
                return {'rows': None, 'status': None, 'error': str(e.args[1]) if len(e.args) > 1 else str(e),
                        'code': str(e.args[0])}
    def close(self):
        self.q.put(None)
        try: self.conn.close()
        except Exception: pass

def _j(v):
    if isinstance(v, (int, float, str, bool)) or v is None: return v
    return str(v)

# ---------------------------------------------------------------- the coordinator
def run_trace(srv, names, steps, reset_sql, final_sql, probe=None):
    """steps: list of dicts {s: session name, sql: str | list | callable(named results) -> str|list, note, key, begin: level}
    reset_sql: statements run first on an admin connection; final_sql: dict label -> SQL read at the end.
    probe(admin, step_index) -> dict: optional state captured after each step.
    Every statement that finishes is recorded under the step during which it finished, in finishing order."""
    admin = srv.connect()
    for s in reset_sql:
        if srv.kind == 'postgres': admin.execute(s)
        else: admin.cursor().execute(s)
    done = queue.Queue()
    sess = {n: Session(n, srv, done) for n in names}
    results, named, issued, out = {}, {}, set(), []
    def drain(until_i, timeout):
        got = []; end = time.perf_counter() + timeout
        while time.perf_counter() < end:
            try:
                k, r = done.get(timeout=0.01)
                results[k] = r; got.append((k, r))
                if steps[k].get('key'): named[steps[k]['key']] = _clean(r)
            except queue.Empty:
                pass
            if until_i is not None and until_i in results: break
            if until_i is None and issued <= set(results): break
        return got
    for i, st in enumerate(steps):
        n = st['s']
        if 'begin' in st: sqls = srv.begin_sql(st['begin'])
        else:
            q = st['sql']
            if callable(q): q = q(named)
            sqls = q if isinstance(q, list) else [q]
        rec = {'i': i, 's': n, 'sql': '; '.join(sqls), 'note': st.get('note', '')}
        busy = [k for k in issued if k not in results and steps[k]['s'] == n]
        if busy: rec['queued_behind'] = busy[0]
        issued.add(i); sess[n].q.put((i, sqls))
        got = drain(i, BLOCK_WAIT)
        if i not in results:
            rec['blocked'] = True
            if not busy: rec['wait'] = _wait_info(srv, admin, sess[n].pid)
        if not issued <= set(results):
            got += drain(None, SETTLE)
        rec['finished'] = [{'i': k, 's': steps[k]['s'], **_clean(r)} for k, r in sorted(got, key=lambda x: x[1]['t_end'])]
        if probe: rec['probe'] = probe(admin, i)
        out.append(rec)
    tail = drain(None, 5) if not issued <= set(results) else []
    if tail:
        out.append({'i': len(steps), 's': None, 'sql': '', 'note': 'after the script', 'finished': [{'i': k, 's': steps[k]['s'], **_clean(r)} for k, r in tail]})
    final = {}
    for lab, q in final_sql.items():
        if srv.kind == 'postgres': final[lab] = [list(map(_j, r)) for r in admin.execute(q).fetchall()]
        else:
            cur = admin.cursor(); cur.execute(q); final[lab] = [list(map(_j, r)) for r in cur.fetchall()]
    for s in sess.values(): s.close()
    admin.close()
    return {'steps': out, 'final': final, 'named': named}

def _clean(r):
    return {k: v for k, v in r.items() if k not in ('t_end',) and v not in (None, '')}

def _wait_info(srv, admin, pid):
    if srv.kind == 'postgres':
        r = admin.execute("SELECT wait_event_type, wait_event, pg_blocking_pids(pid) FROM pg_stat_activity WHERE pid = %s", (pid,)).fetchone()
        return {'wait_event_type': r[0], 'wait_event': r[1], 'blocked_by_pids': list(r[2])} if r else None
    cur = admin.cursor()
    cur.execute("SELECT trx_state FROM information_schema.innodb_trx WHERE trx_mysql_thread_id = %s", (pid,))
    r = cur.fetchone()
    return {'trx_state': r[0]} if r else None
