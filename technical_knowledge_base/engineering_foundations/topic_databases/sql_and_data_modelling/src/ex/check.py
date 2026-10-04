"""Run every exercise solution in Python's sqlite3 on a fresh copy of the chat data plus messages.parent_id, store the
expected result sets in ../inputs/ex_expected.json, and print a one-line summary per exercise.
Plain python3, no dependencies: python3 check.py   (node check_sqljs.mjs then runs the same solutions in the page's sql.js)"""
import os, sys, json, sqlite3
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from exercises import X
ROOT_SQL = os.path.join(HERE, '..', '..', '..', 'src', 'sql')
PARENT_SQL = ["ALTER TABLE messages ADD COLUMN parent_id INTEGER REFERENCES messages(id)",
              "UPDATE messages SET parent_id = (SELECT MAX(p.id) FROM messages p WHERE p.chat_id = messages.chat_id AND p.id < messages.id)"]

def base():
    D = json.load(open(os.path.join(ROOT_SQL, 'data.json')))
    db = sqlite3.connect(':memory:', isolation_level=None)
    db.executescript(open(os.path.join(ROOT_SQL, 'schema_sqlite.sql')).read())
    for t in ('users', 'chats', 'messages', 'credits'):
        cols = D['cols'][t]; db.executemany(f'INSERT INTO {t} ({",".join(cols)}) VALUES ({",".join("?" * len(cols))})', D[t])
    for s in PARENT_SQL: db.execute(s)
    return db

def last_rows(b, sql):
    db = sqlite3.connect(':memory:', isolation_level=None); b.backup(db)
    cur = None; out = None; buf = ''
    for line in sql.split('\n'):
        buf += line + '\n'
        if sqlite3.complete_statement(buf):
            c = db.execute(buf); buf = ''
            if c.description: out = {'cols': [d[0] for d in c.description], 'rows': [list(r) for r in c.fetchall()]}
    return out

if __name__ == '__main__':
    b = base(); res = {}
    for e in X:
        r = last_rows(b, e['sol']); assert r and r['rows'], e['id']
        res[e['id']] = r
        print(f"{e['id']:16s} L{e['level']} {len(r['rows']):3d} rows  first {r['rows'][0]}")
    json.dump({'sqlite': sqlite3.sqlite_version, 'expected': res}, open(os.path.join(HERE, '..', 'inputs', 'ex_expected.json'), 'w'), separators=(',', ':'))
