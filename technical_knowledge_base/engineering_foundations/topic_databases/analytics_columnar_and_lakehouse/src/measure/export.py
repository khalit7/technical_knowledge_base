"""Copy the chat data out of this page's PostgreSQL into DuckDB (chat.duckdb: users, chats, messages) and SQLite (chat.sqlite),
the way the root's src/plan/duck.py does (COPY to CSV, then read_csv), so all three engines hold the same rows.
Run after gen_chat.py:
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with pgserver --with duckdb==1.5.6 --with pyarrow python export.py
"""
import os, sys, json, time, subprocess, sqlite3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgcommon import *
import duckdb
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ddb = os.path.join(ROOT, 'chat.duckdb'); sq = os.path.join(ROOT, 'chat.sqlite')
TABLES = {
 'users': ("SELECT id, email, country, city, plan, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'), timezone FROM users ORDER BY id",
           {'id':'BIGINT','email':'VARCHAR','country':'VARCHAR','city':'VARCHAR','plan':'VARCHAR','created_at':'TIMESTAMP','timezone':'VARCHAR'}),
 'chats': ("SELECT id, user_id, title, model, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') FROM chats ORDER BY id",
           {'id':'BIGINT','user_id':'BIGINT','title':'VARCHAR','model':'VARCHAR','created_at':'TIMESTAMP'}),
 'messages': ("SELECT id, chat_id, role, model, tokens, content, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') FROM messages ORDER BY id",
           {'id':'BIGINT','chat_id':'BIGINT','role':'VARCHAR','model':'VARCHAR','tokens':'INTEGER','content':'VARCHAR','created_at':'TIMESTAMP'}),
}
log = {'duckdb': duckdb.__version__, 'sqlite': sqlite3.sqlite_version, 'steps': {}}
print(start())
if os.path.exists(ddb): os.remove(ddb)
if os.path.exists(sq): os.remove(sq)
con = duckdb.connect(ddb)
for name, (sql, cols) in TABLES.items():
    csv = os.path.join(ROOT, name + '.csv')
    with open(csv, 'w') as f:
        subprocess.run([f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-X', '-c', f'COPY ({sql}) TO STDOUT (FORMAT csv)', 'chat'], stdout=f, check=True)
    t = time.time()
    colspec = '{' + ','.join(f"'{k}':'{v}'" for k, v in cols.items()) + '}'
    con.execute(f"CREATE TABLE {name} AS SELECT * FROM read_csv('{csv}', header=false, columns={colspec})")
    log['steps'][name + '_duckdb_s'] = round(time.time() - t, 1); print(name, 'duckdb', log['steps'][name + '_duckdb_s'], flush=True)
con.execute('CHECKPOINT'); con.close()
print(stop())
# SQLite: same rows, loaded from DuckDB in batches (timestamps as ISO text, SQLite's usual choice)
s = sqlite3.connect(sq); s.execute('PRAGMA journal_mode=OFF'); s.execute('PRAGMA synchronous=OFF')
s.executescript('''CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT, country TEXT, city TEXT, plan TEXT, created_at TEXT, timezone TEXT);
CREATE TABLE chats(id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT, model TEXT, created_at TEXT);
CREATE TABLE messages(id INTEGER PRIMARY KEY, chat_id INTEGER, role TEXT, model TEXT, tokens INTEGER, content TEXT, created_at TEXT);''')
con = duckdb.connect(ddb, read_only=True)
for name, (sql, cols) in TABLES.items():
    t = time.time()
    sel = ', '.join(f"strftime(created_at, '%Y-%m-%d %H:%M:%S')" if k == 'created_at' else k for k in cols)
    cur = con.execute(f'SELECT {sel} FROM {name} ORDER BY id')
    ph = ','.join('?' * len(cols))
    while True:
        rows = cur.fetchmany(200_000)
        if not rows: break
        s.executemany(f'INSERT INTO {name} VALUES ({ph})', rows)
    s.commit(); log['steps'][name + '_sqlite_s'] = round(time.time() - t, 1); print(name, 'sqlite', log['steps'][name + '_sqlite_s'], flush=True)
s.execute('CREATE INDEX chats_user ON chats(user_id)'); s.execute('CREATE INDEX messages_chat ON messages(chat_id, created_at)'); s.execute('ANALYZE'); s.commit(); s.close()
for name in TABLES:
    os.remove(os.path.join(ROOT, name + '.csv'))
log['rows'] = {n: con.execute(f'SELECT count(*) FROM {n}').fetchone()[0] for n in TABLES}
log['check_case6'] = [list(r) for r in con.execute('SELECT model, count(*), sum(tokens) FROM messages GROUP BY 1 ORDER BY 1').fetchall()]
log['duckdb_bytes'] = os.path.getsize(ddb); log['sqlite_bytes'] = os.path.getsize(sq)
json.dump(log, open(os.path.join(OUT, 'export_log.json'), 'w'), indent=1); print(json.dumps(log, indent=1))
