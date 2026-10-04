"""Parquet byte by byte. (1) A tiny file: the first 1,000 chat messages, 2 row groups of 500, no compression, written by pyarrow,
decoded with thrift_compact.py: magic, every page header, the footer fields with their byte offsets, and the role column's
dictionary and data pages decoded by hand. Every offset is checked against pyarrow's own reading of the footer.
(2) The full 10M-row file as DuckDB writes it by default: real footer metadata (row groups, column chunks, encodings, statistics).
Writes inputs/anatomy.json.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with duckdb==1.5.6 --with pyarrow python anatomy.py
"""
import os, sys, json, struct, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import duckdb, pyarrow as pa, pyarrow.parquet as pq
from thrift_compact import R, TYPES, ENC, CODEC, PAGE
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
con = duckdb.connect(DDB, read_only=True)
res = {'pyarrow': pa.__version__, 'duckdb': duckdb.__version__, 'date': datetime.date.today().isoformat()}
# ---- (1) tiny file ----
t = con.execute('SELECT id, chat_id, role, model, tokens, created_at FROM messages ORDER BY id LIMIT 1000').arrow()
if hasattr(t, 'read_all'): t = t.read_all()
t = t.cast(pa.schema([pa.field(f.name, f.type, nullable=False) for f in t.schema]))
tiny = os.path.join(ROOT, 'tiny.parquet')
pq.write_table(t, tiny, row_group_size=500, compression='NONE', data_page_version='1.0', write_page_index=False, use_dictionary=['role', 'model'],
               column_encoding={'id': 'DELTA_BINARY_PACKED', 'chat_id': 'PLAIN', 'tokens': 'PLAIN', 'created_at': 'PLAIN'})
buf = open(tiny, 'rb').read(); n = len(buf)
flen = struct.unpack('<I', buf[-8:-4])[0]; fstart = n - 8 - flen
assert buf[:4] == b'PAR1' and buf[-4:] == b'PAR1'
fm = R(buf, fstart).struct()
schema = [e.get(4, b'').decode() for e in fm[2]][1:]
regions = [{'kind': 'magic', 'start': 0, 'end': 4, 'label': 'PAR1'}]
chunks = []
pf = pq.ParquetFile(tiny); md = pf.metadata
for gi, g in enumerate(fm[4]):
    for ci, cc in enumerate(g[1]):
        m = cc[3]; col = schema[ci]
        start = m.get(11, m[9]); end = start + m[7]
        mm = md.row_group(gi).column(ci)
        assert (m[9], m[7], m[6]) == (mm.data_page_offset, mm.total_compressed_size, mm.total_uncompressed_size), col
        pages = []; p = start
        while p < end:
            r = R(buf, p); h = r.struct(); hdr_end = r.p; body_end = hdr_end + h[3]
            pg = {'type': PAGE[h[1]], 'hdr_start': p, 'hdr_end': hdr_end, 'body_end': body_end, 'uncompressed': h[2], 'compressed': h[3]}
            if 5 in h: pg['num_values'] = h[5][1]; pg['encoding'] = ENC[h[5][2]]
            if 7 in h: pg['num_values'] = h[7][1]; pg['encoding'] = ENC[h[7][2]]
            pg['hdr_hex'] = buf[p:hdr_end].hex(' '); pg['body_head_hex'] = buf[hdr_end:min(body_end, hdr_end + 48)].hex(' ')
            pages.append(pg); p = body_end
            regions.append({'kind': 'page', 'col': col, 'rg': gi, 'page': pg['type'], 'start': pg['hdr_start'], 'hdr_end': hdr_end, 'end': body_end})
        st = m.get(12, {})
        def dec(v, c=col):
            if v is None: return None
            if c in ('role', 'model'): return v.decode()
            return struct.unpack('<q' if len(v) == 8 else '<i', v)[0]
        chunks.append({'rg': gi, 'col': col, 'type': TYPES[m[1]], 'encodings': [ENC[e] for e in m[2]], 'codec': CODEC[m[4]], 'num_values': m[5],
                       'uncompressed': m[6], 'compressed': m[7], 'data_page_offset': m[9], 'dictionary_page_offset': m.get(11),
                       'min': dec(st.get(6)), 'max': dec(st.get(5)), 'pages': pages})
regions.append({'kind': 'footer', 'start': fstart, 'end': n - 8}); regions.append({'kind': 'footer_len', 'start': n - 8, 'end': n - 4, 'value': flen})
regions.append({'kind': 'magic', 'start': n - 4, 'end': n, 'label': 'PAR1'})
# the role column's pages decoded by hand (row group 0)
rc = [c for c in chunks if c['col'] == 'role' and c['rg'] == 0][0]
dp = rc['pages'][0]; body = buf[dp['hdr_end']:dp['body_end']]
r = R(body); words = []
for _ in range(dp['num_values']):
    nlen = struct.unpack('<I', body[r.p:r.p + 4])[0]; words.append(body[r.p + 4:r.p + 4 + nlen].decode()); r.p += 4 + nlen
dpg = rc['pages'][1]; body = buf[dpg['hdr_end']:dpg['body_end']]
bw = body[0]; r = R(body, 1); runs = []; idx = []
while r.p < len(body):
    h = r.varint()
    if h & 1:
        groups = h >> 1; nb = groups * bw; raw = body[r.p:r.p + nb]; r.p += nb
        bits = [(raw[i // 8] >> (i % 8)) & 1 for i in range(groups * 8)] if bw == 1 else []
        runs.append({'kind': 'bit-packed', 'groups_of_8': groups, 'bytes': raw[:8].hex(' ')}); idx += bits
    else:
        cnt = h >> 1; v = body[r.p]; r.p += (bw + 7) // 8; runs.append({'kind': 'rle', 'count': cnt, 'value': v}); idx += [v] * cnt
res['tiny'] = {'bytes': n, 'footer_len': flen, 'footer_start': fstart, 'num_rows': fm[3], 'created_by': fm.get(6, b'').decode(),
               'schema': [{'name': e.get(4, b'').decode(), 'type': TYPES[e[1]] if 1 in e else None} for e in fm[2]],
               'head_hex': buf[:64].hex(' '), 'tail_hex': buf[-16:].hex(' '), 'footer_head_hex': buf[fstart:fstart + 48].hex(' '),
               'regions': regions, 'chunks': chunks,
               'role_dictionary': words, 'role_bit_width': bw, 'role_runs': runs[:6], 'role_first_indices': idx[:16],
               'role_first_values': t.column('role').to_pylist()[:16]}
assert [words[i] for i in idx[:16]] == res['tiny']['role_first_values']
print('tiny ok', n, flen, len(regions))
# ---- (2) the full file as DuckDB writes it by default ----
full = os.path.join(ROOT, 'messages.parquet')
if not os.path.exists(full):
    con.execute(f"COPY (SELECT * FROM messages ORDER BY id) TO '{full}' (FORMAT parquet)")
md = pq.ParquetFile(full).metadata
g0 = md.row_group(0)
cols = []
for c in range(g0.num_columns):
    cc = g0.column(c); st = cc.statistics
    cols.append({'col': cc.path_in_schema, 'physical': cc.physical_type, 'encodings': list(cc.encodings), 'codec': cc.compression,
                 'num_values': cc.num_values, 'compressed': cc.total_compressed_size, 'uncompressed': cc.total_uncompressed_size,
                 'dictionary_page_offset': cc.dictionary_page_offset, 'data_page_offset': cc.data_page_offset,
                 'min': str(st.min)[:40] if st and st.has_min_max else None, 'max': str(st.max)[:40] if st and st.has_min_max else None,
                 'null_count': st.null_count if st else None})
ca = [md.row_group(i).column(6).statistics for i in range(md.num_row_groups)]
ch = [md.row_group(i).column(1).statistics for i in range(md.num_row_groups)]
res['full'] = {'bytes': os.path.getsize(full), 'num_rows': md.num_rows, 'row_groups': md.num_row_groups, 'created_by': md.created_by,
               'format_version': md.format_version, 'footer_bytes': md.serialized_size, 'rg0_rows': g0.num_rows, 'rg0_columns': cols,
               'created_at_ranges': [[str(s.min), str(s.max)] for s in ca[:5]] + [[str(ca[-1].min), str(ca[-1].max)]],
               'chat_id_ranges': [[s.min, s.max] for s in ch[:5]] + [[ch[-1].min, ch[-1].max]],
               'duckdb_metadata_sample': [list(map(str, r)) for r in con.execute(f"SELECT row_group_id, path_in_schema, type, encodings, compression, stats_min, stats_max, total_compressed_size FROM parquet_metadata('{full}') WHERE row_group_id = 0").fetchall()]}
# every row group's statistics and chunk sizes (for the pruning animation), and bytes DuckDB really reads for two filtered queries
names = [md.schema.column(i).name for i in range(md.num_columns)]
rgs = []
for i in range(md.num_row_groups):
    g = md.row_group(i); d = {'rows': g.num_rows}
    for c in range(g.num_columns):
        cc = g.column(c); st = cc.statistics; nm = names[c]
        d[nm + '_bytes'] = cc.total_compressed_size
        if nm in ('created_at', 'chat_id', 'id'): d[nm + '_min'] = str(st.min); d[nm + '_max'] = str(st.max)
    rgs.append(d)
res['full']['row_groups_detail'] = rgs
from countfs import counted
QS = {'day': "SELECT count(*), sum(tokens) FROM read_parquet('cnt://%s') WHERE created_at >= TIMESTAMP '2026-03-01' AND created_at < TIMESTAMP '2026-03-02'" % full,
      'chat': "SELECT count(*), sum(tokens) FROM read_parquet('cnt://%s') WHERE chat_id = 424242" % full,
      'all': "SELECT model, count(*), sum(tokens) FROM read_parquet('cnt://%s') GROUP BY model ORDER BY model" % full,
      'content_selective': "SELECT count(*), max(length(content)) FROM read_parquet('cnt://%s') WHERE tokens > 1495" % full,
      'content_all': "SELECT count(*), max(length(content)) FROM read_parquet('cnt://%s')" % full}
res['full']['counted'] = {}
for k, q in QS.items():
    rows, b, n = counted(duckdb, q)
    res['full']['counted'][k] = {'rows': [list(map(str, r)) for r in rows], 'bytes_read': b, 'reads': n}
    print(k, rows[:2], b, n)
json.dump(res, open(os.path.join(OUT, 'anatomy.json'), 'w'), indent=1, default=str)
print(json.dumps(res['full'], indent=1, default=str)[:3000])
