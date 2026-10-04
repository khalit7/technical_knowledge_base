"""A local filesystem for DuckDB that counts the bytes DuckDB actually reads from a file (fsspec, registered with
con.register_filesystem). Paths are written cnt:///abs/path. Used to measure bytes read, not to time queries
(timings always use plain local paths)."""
from fsspec.implementations.local import LocalFileSystem
STATS = {'bytes': 0, 'reads': 0}
class _F:
    def __init__(s, f): s.f = f
    def read(s, n=-1):
        b = s.f.read(n); STATS['bytes'] += len(b); STATS['reads'] += 1; return b
    def __getattr__(s, k): return getattr(s.f, k)
    def __enter__(s): return s
    def __exit__(s, *a): s.f.close()
class CountingFS(LocalFileSystem):
    protocol = 'cnt'
    def _open(self, path, mode='rb', **kw):
        return _F(super()._open(path.replace('cnt://', ''), mode, **kw))
def counted(duckdb, sql, settings=()):
    """Run sql on a fresh connection with the counting filesystem; return (rows, bytes read, read calls)."""
    con = duckdb.connect(); con.register_filesystem(CountingFS())
    for s in settings: con.execute(s)
    try:
        con.execute('SET enable_external_file_cache = false')
    except Exception:
        pass
    STATS.update(bytes=0, reads=0)
    rows = con.execute(sql).fetchall(); con.close()
    return rows, STATS['bytes'], STATS['reads']
