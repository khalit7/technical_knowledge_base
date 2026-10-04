"""A real Delta Lake table on the local disk (deltalake, the delta-rs Python binding): the same steps as iceberg_walk.py
(create with one day, append a day, add a column by schema merge, delete one chat, read version 0), recording each commit file
in _delta_log/ and its actions. Writes inputs/delta.json. Seconds.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with deltalake --with duckdb==1.5.6 --with pyarrow python delta_walk.py
"""
import os, json, shutil, datetime, glob
import duckdb, pyarrow as pa, deltalake
from deltalake import DeltaTable, write_deltalake
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
P = os.path.join(ROOT, 'delta_messages'); shutil.rmtree(P, ignore_errors=True)
con = duckdb.connect(DDB, read_only=True)
def day(d):
    t = con.execute(f"SELECT id, chat_id, role, model, tokens, created_at FROM messages WHERE created_at >= TIMESTAMP '{d}' AND created_at < TIMESTAMP '{d}' + INTERVAL 1 DAY ORDER BY id").arrow()
    return t.read_all() if hasattr(t, 'read_all') else t
seen = set(); steps = []
def trim(a):
    a = json.loads(json.dumps(a))
    for k in ('add', 'remove'):
        if k in a:
            a[k]['path'] = a[k]['path'][:60]
            if 'stats' in a[k] and a[k]['stats']:
                st = json.loads(a[k]['stats']); a[k]['stats'] = {'numRecords': st.get('numRecords'), 'minValues': {x: st['minValues'].get(x) for x in ('chat_id', 'created_at')}, 'maxValues': {x: st['maxValues'].get(x) for x in ('chat_id', 'created_at')}}
    if 'metaData' in a:
        a['metaData']['schemaString'] = [f['name'] + ':' + str(f['type']) for f in json.loads(a['metaData']['schemaString'])['fields']]
    return a
def record(name, what):
    new = []
    for p in sorted(glob.glob(os.path.join(P, '**', '*'), recursive=True)):
        if os.path.isdir(p) or p in seen: continue
        seen.add(p); rel = os.path.relpath(p, P); e = {'path': rel, 'bytes': os.path.getsize(p)}
        if rel.startswith('_delta_log') and rel.endswith('.json'):
            e['actions'] = [trim(json.loads(l)) for l in open(p) if l.strip()]
        new.append(e)
    dt = DeltaTable(P)
    steps.append({'step': name, 'what': what, 'version': dt.version(), 'new_files': new, 'rows_now': dt.to_pyarrow_table().num_rows})
    print(name, dt.version(), [n['path'] for n in new], flush=True)
write_deltalake(P, day('2026-03-01')); record('create', 'CREATE TABLE AS one day of messages (2026-03-01)')
write_deltalake(P, day('2026-03-02'), mode='append'); record('append', 'INSERT a second day')
d3 = day('2026-03-03'); d3 = d3.append_column(pa.field('lang', pa.string()), pa.array(['en' if i % 3 else 'fr' for i in range(d3.num_rows)]))
write_deltalake(P, d3, mode='append', schema_mode='merge'); record('append with new column', 'INSERT a third day with a new column lang (schema merge)')
victim = int(day('2026-03-01').column('chat_id')[100].as_py())
DeltaTable(P).delete(f'chat_id = {victim}'); record('delete', f'DELETE WHERE chat_id = {victim}')
v0 = DeltaTable(P, version=0).to_pyarrow_table()
res = {'deltalake': deltalake.__version__, 'date': datetime.date.today().isoformat(), 'steps': steps, 'time_travel': {'version': 0, 'rows': v0.num_rows, 'columns': v0.column_names},
       'history': [{k: h.get(k) for k in ('version', 'operation')} for h in DeltaTable(P).history()]}
json.dump(res, open(os.path.join(OUT, 'delta.json'), 'w'), indent=1, default=str)
print(res['time_travel'], res['history'])
