"""A real Apache Iceberg table on the local disk (pyiceberg, SQLite catalog), built from the chat messages in steps:
create (partitioned by day(created_at)), append one day, append a second day, add a column (schema evolution), append a third
day with the new column, delete one chat's messages, change the partition spec to month (partition evolution), append, then
read an old snapshot (time travel). After each step it records every new file the step wrote, and decodes them:
metadata.json (JSON), the manifest list and manifests (Avro, read with fastavro). Writes inputs/iceberg.json. Under a minute.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with 'pyiceberg[sql-sqlite,pyarrow,pyiceberg-core]' --with fastavro --with duckdb==1.5.6 python iceberg_walk.py
"""
import os, sys, json, shutil, datetime, struct, glob
import duckdb, pyarrow as pa, fastavro, pyiceberg
from pyiceberg.catalog.sql import SqlCatalog
from pyiceberg.partitioning import PartitionSpec, PartitionField
from pyiceberg.transforms import DayTransform, MonthTransform
from pyiceberg.types import StringType
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
WH = os.path.join(ROOT, 'iceberg_wh'); shutil.rmtree(WH, ignore_errors=True); os.makedirs(WH)
con = duckdb.connect(DDB, read_only=True)
def day(d):
    t = con.execute(f"SELECT id, chat_id, role, model, tokens, created_at FROM messages WHERE created_at >= TIMESTAMP '{d}' AND created_at < TIMESTAMP '{d}' + INTERVAL 1 DAY ORDER BY id").arrow()
    t = t.read_all() if hasattr(t, 'read_all') else t
    return t.cast(pa.schema([pa.field(f.name, pa.timestamp('us') if f.name == 'created_at' else f.type, nullable=True) for f in t.schema]))
cat = SqlCatalog('local', uri=f'sqlite:///{WH}/catalog.db', warehouse=f'file://{WH}')
cat.create_namespace('chat')
seen = set(); steps = []
def short(p): return p.replace('file://', '').replace(WH + '/', '')
def decode(path):
    rel = short(path); full = os.path.join(WH, rel)
    if rel.endswith('.metadata.json'):
        m = json.load(open(full))
        return {'kind': 'metadata.json', 'format-version': m['format-version'], 'current-snapshot-id': m.get('current-snapshot-id'),
                'last-sequence-number': m.get('last-sequence-number'), 'current-schema-id': m.get('current-schema-id'),
                'schemas': [{'schema-id': s['schema-id'], 'fields': [f"{f['id']}:{f['name']}" for f in s['fields']]} for s in m['schemas']],
                'partition-specs': [{'spec-id': s['spec-id'], 'fields': [f"{f['transform']}({f['source-id']}) as {f['name']}" for f in s['fields']]} for s in m['partition-specs']],
                'default-spec-id': m.get('default-spec-id'),
                'snapshots': [{'snapshot-id': s['snapshot-id'], 'parent': s.get('parent-snapshot-id'), 'sequence-number': s.get('sequence-number'),
                               'operation': s['summary'].get('operation'), 'manifest-list': short(s['manifest-list']),
                               'summary': {k: v for k, v in s['summary'].items() if k in ('added-data-files', 'deleted-data-files', 'added-records', 'deleted-records', 'total-records', 'total-data-files')}}
                              for s in m.get('snapshots', [])],
                'metadata-log': [short(x['metadata-file']) for x in m.get('metadata-log', [])], 'bytes': os.path.getsize(full)}
    if rel.endswith('.avro'):
        with open(full, 'rb') as fo:
            r = fastavro.reader(fo); recs = list(r)
        if os.path.basename(rel).startswith('snap-'):
            return {'kind': 'manifest list', 'bytes': os.path.getsize(full), 'entries': [{'manifest_path': short(e['manifest_path']), 'content': e.get('content'),
                    'sequence_number': e.get('sequence_number'), 'added_snapshot_id': e.get('added_snapshot_id'), 'added_files': e.get('added_files_count', e.get('added_data_files_count')),
                    'existing_files': e.get('existing_files_count', e.get('existing_data_files_count')), 'deleted_files': e.get('deleted_files_count', e.get('deleted_data_files_count')),
                    'added_rows': e.get('added_rows_count'), 'partition_spec_id': e.get('partition_spec_id')} for e in recs]}
        out = []
        for e in recs:
            d = e['data_file']; lb = dict((x['key'], x['value']) for x in (d.get('lower_bounds') or [])); ub = dict((x['key'], x['value']) for x in (d.get('upper_bounds') or []))
            def ts(b): return str(datetime.datetime(1970, 1, 1) + datetime.timedelta(microseconds=struct.unpack('<q', b)[0])) if b else None
            def i64(b): return struct.unpack('<q', b)[0] if b else None
            out.append({'status': ['EXISTING', 'ADDED', 'DELETED'][e['status']], 'snapshot_id': e.get('snapshot_id'), 'file_path': short(d['file_path']),
                        'partition': {k: (str(v)) for k, v in (d.get('partition') or {}).items()}, 'record_count': d['record_count'], 'file_size_in_bytes': d['file_size_in_bytes'],
                        'created_at_min': ts(lb.get(6)), 'created_at_max': ts(ub.get(6)), 'chat_id_min': i64(lb.get(2)), 'chat_id_max': i64(ub.get(2))})
        return {'kind': 'manifest', 'bytes': os.path.getsize(full), 'entries': out}
    if rel.endswith('.parquet'):
        return {'kind': 'data file (Parquet)', 'bytes': os.path.getsize(full)}
    return {'kind': 'other', 'bytes': os.path.getsize(full)}
def record(name, what, extra=None):
    new = []
    for p in sorted(glob.glob(os.path.join(WH, '**', '*'), recursive=True)):
        if os.path.isdir(p) or p.endswith('catalog.db') or p in seen: continue
        seen.add(p); new.append({'path': short(p), **decode(p)})
    tbl = cat.load_table('chat.messages')
    cur = cat._read_metadata_location if False else None
    st = {'step': name, 'what': what, 'new_files': new, 'metadata_location': short(tbl.metadata_location),
          'snapshot_id': tbl.current_snapshot().snapshot_id if tbl.current_snapshot() else None,
          'rows_now': tbl.scan().to_arrow().num_rows if tbl.current_snapshot() else 0}
    if extra: st.update(extra)
    steps.append(st); print(name, len(new), [n['path'] for n in new], st['rows_now'], flush=True)
    return tbl
d1 = day('2026-03-01'); schema = d1.schema
tbl = cat.create_table('chat.messages', schema=schema)
with tbl.update_spec() as u:
    u.add_field('created_at', DayTransform(), 'created_at_day')
record('create', 'CREATE TABLE chat.messages, partitioned by day(created_at)')
tbl = cat.load_table('chat.messages'); tbl.append(d1); tbl = record('append 1', 'INSERT one day of messages (2026-03-01)')
s1 = tbl.current_snapshot().snapshot_id
tbl.append(day('2026-03-02')); tbl = record('append 2', 'INSERT a second day (2026-03-02)')
with tbl.update_schema() as u:
    u.add_column('lang', StringType(), doc='language of the message')
tbl = record('add column', 'ALTER TABLE ADD COLUMN lang (no data file is rewritten)')
d3 = day('2026-03-03'); d3 = d3.append_column(pa.field('lang', pa.string()), pa.array(['en' if i % 3 else 'fr' for i in range(d3.num_rows)]))
tbl.append(d3); tbl = record('append 3', 'INSERT a third day, with lang filled')
victim = int(d1.column('chat_id')[100].as_py())
tbl.delete(f'chat_id == {victim}'); tbl = record('delete', f'DELETE FROM messages WHERE chat_id = {victim} (copy-on-write: affected files rewritten)')
with tbl.update_spec() as u:
    u.remove_field('created_at_day'); u.add_field('created_at', MonthTransform(), 'created_at_month')
tbl = record('evolve partitions', 'Change the partition spec from day to month for new data (old files keep their day layout)')
tbl.append(day('2026-03-04').append_column(pa.field('lang', pa.string()), pa.nulls(day('2026-03-04').num_rows, pa.string()))); tbl = record('append 4', 'INSERT a fourth day under the new month spec')
old = tbl.scan(snapshot_id=s1).to_arrow()
tt = {'snapshot_id': s1, 'rows': old.num_rows, 'columns': old.column_names,
      'now_rows': tbl.scan().to_arrow().num_rows, 'now_columns': tbl.scan().to_arrow().column_names,
      'history': [{'snapshot_id': h.snapshot_id, 'timestamp_ms': h.timestamp_ms} for h in tbl.history()]}
# pruning: a scan for one day plans only that day's files
plan = [short(t.file.file_path) for t in tbl.scan(row_filter="created_at >= '2026-03-02T00:00:00' and created_at < '2026-03-03T00:00:00'").plan_files()]
res = {'pyiceberg': pyiceberg.__version__, 'date': datetime.date.today().isoformat(), 'victim_chat': victim, 'steps': steps, 'time_travel': tt, 'scan_plan_one_day': plan,
       'tree': sorted(short(p) for p in seen)}
json.dump(res, open(os.path.join(OUT, 'iceberg.json'), 'w'), indent=1, default=str)
print(json.dumps(tt, default=str)[:500]); print(plan)
