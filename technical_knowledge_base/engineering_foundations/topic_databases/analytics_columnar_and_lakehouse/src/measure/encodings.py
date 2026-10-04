"""Encodings and compression, measured per column on the 10M chat messages: each column written alone by pyarrow with each
applicable encoding (PLAIN, dictionary, delta, byte-stream-split) and codec (none, snappy, zstd level 3), as stored (time order)
and, for the low-cardinality columns, with the table sorted by (model, role) so runs form. Sizes are the column chunk bytes in
the footer (total_compressed_size). Writes inputs/encodings.json. About 3 minutes.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with duckdb==1.5.6 --with pyarrow python encodings.py
"""
import os, sys, json, time, datetime
import duckdb, pyarrow as pa, pyarrow.parquet as pq
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
con = duckdb.connect(DDB, read_only=True)
def arrow(sql):
    t = con.execute(sql).arrow()
    return t.read_all() if hasattr(t, 'read_all') else t
tables = {'time': arrow('SELECT * FROM messages ORDER BY id'), 'sorted': arrow('SELECT role, model FROM messages ORDER BY model, role, id')}
INTS = ['id', 'chat_id', 'tokens', 'created_at']; STRS = ['role', 'model', 'content']
ENCS = {'int': ['PLAIN', 'DICT', 'DELTA_BINARY_PACKED', 'BYTE_STREAM_SPLIT'], 'str': ['PLAIN', 'DICT', 'DELTA_LENGTH_BYTE_ARRAY', 'DELTA_BYTE_ARRAY']}
CODECS = [('none', 'NONE', None), ('snappy', 'SNAPPY', None), ('zstd', 'ZSTD', 3)]
f = os.path.join(ROOT, 'enc.parquet'); res = {'pyarrow': pa.__version__, 'date': datetime.date.today().isoformat(), 'rows': tables['time'].num_rows, 'cols': []}
for order, cols in [('time', INTS + STRS), ('sorted', ['role', 'model'])]:
    t = tables[order]
    for c in cols:
        col = t.select([c])
        raw = col.column(0).nbytes
        rec = {'col': c, 'order': order, 'arrow_bytes': raw, 'arrow_type': str(col.schema[0].type), 'sizes': {}}
        for e in ENCS['int' if c in INTS else 'str']:
            for cname, codec, lvl in CODECS:
                kw = dict(compression=codec, row_group_size=1 << 20, write_statistics=False)
                if lvl: kw['compression_level'] = lvl
                if e == 'DICT': kw['use_dictionary'] = True
                else: kw['use_dictionary'] = False; kw['column_encoding'] = {c: e}
                try:
                    pq.write_table(col, f, **kw)
                except Exception as ex:
                    rec['sizes'][f'{e}|{cname}'] = None; continue
                md = pq.ParquetFile(f).metadata
                b = sum(md.row_group(i).column(0).total_compressed_size for i in range(md.num_row_groups))
                encs = sorted({x for i in range(md.num_row_groups) for x in md.row_group(i).column(0).encodings})
                rec['sizes'][f'{e}|{cname}'] = b; rec.setdefault('encs', {})[e] = encs
        res['cols'].append(rec); print(order, c, raw, rec['sizes'], flush=True)
        json.dump(res, open(os.path.join(OUT, 'encodings.json'), 'w'), indent=1)
os.remove(f)
