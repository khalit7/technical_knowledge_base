"""M5: an LSM-tree measured. RocksDB through the rocksdict Python binding (embedded RocksDB), statistics on.
Workload, same for both compaction styles (leveled, the RocksDB default, and universal, RocksDB's tiered style):
  load N unique random 16-byte keys with 100-byte values, then overwrite N keys drawn at random from the same set.
Write amplification = (bytes flushed from memtables + bytes written by compaction) / bytes the application wrote (keys + values).
Space amplification = SST bytes on disk / estimated live data. Reads: random gets of present and absent keys, bloom filter counters.
Memtable and level sizes are scaled down (8 MB memtable, 32 MB level 1) so a laptop-sized run has several levels; compression off.
Run: uv run --no-project --python 3.12 --with rocksdict python m5_lsm.py [N]   (default N = 4,000,000; about 5 minutes)
Writes inputs/m5_lsm.json.
"""
import sys, os, time, random, shutil, re, json
from rocksdict import Rdict, Options, BlockBasedOptions, DBCompressionType, DBCompactionStyle, WriteBatch, ReadOptions
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4_000_000
VAL = 100
def opts(style, bloom=True):
    o = Options(raw_mode=True); o.create_if_missing(True); o.enable_statistics()
    o.set_write_buffer_size(8 << 20); o.set_max_bytes_for_level_base(32 << 20); o.set_target_file_size_base(8 << 20)
    o.set_max_bytes_for_level_multiplier(10); o.set_level_zero_file_num_compaction_trigger(4)
    o.set_compression_type(DBCompressionType.none()); o.set_max_background_jobs(4)
    o.set_compaction_style(DBCompactionStyle.universal() if style == 'universal' else DBCompactionStyle.level())
    b = BlockBasedOptions()
    if bloom: b.set_bloom_filter(10, False)
    b.set_cache_index_and_filter_blocks(False)
    o.set_block_based_table_factory(b)
    return o
def tickers(o):
    s = o.get_statistics(); d = {}
    for m in re.finditer(r'^(rocksdb\.[\w.]+) COUNT : (\d+)', s, re.M): d[m.group(1)] = int(m.group(2))
    return d
def levels(db):
    return [int(db.property_value(f'rocksdb.num-files-at-level{i}') or 0) for i in range(7)]
def wait(db, cap=180):
    """until no flush or compaction has run for 2 s (compaction-pending can stay set under universal compaction), at most cap seconds"""
    t0 = time.time(); quiet = 0
    while time.time() - t0 < cap and quiet < 4:
        busy = int(db.property_int_value('rocksdb.num-running-compactions') or 0) + int(db.property_int_value('rocksdb.num-running-flushes') or 0)
        quiet = 0 if busy else quiet + 1; time.sleep(0.5)
rng = random.Random(7)
keys = [rng.getrandbits(128).to_bytes(16, 'big') for _ in range(N)]
over = [keys[rng.randrange(N)] for _ in range(N)]
absent = [rng.getrandbits(128).to_bytes(16, 'big') for _ in range(100_000)]
present = [keys[rng.randrange(N)] for _ in range(100_000)]
val = bytes(VAL)
R = {'date': time.strftime('%Y-%m-%d'), 'N': N, 'key_bytes': 16, 'value_bytes': VAL, 'config': {'write_buffer_size': '8 MB', 'max_bytes_for_level_base': '32 MB',
     'target_file_size_base': '8 MB', 'level_multiplier': 10, 'l0_trigger': 4, 'compression': 'none', 'bloom_bits_per_key': 10}, 'runs': []}
try:
    import rocksdict; R['rocksdict'] = getattr(rocksdict, '__version__', 'unknown')
except Exception: pass
def phase(db, o, ks, label, run):
    t0 = tickers(o); t = time.time()
    for i in range(0, len(ks), 10000):
        wb = WriteBatch(raw_mode=True)
        for k in ks[i:i + 10000]: wb.put(k, val)
        db.write(wb)
    db.flush(); wait(db); el = time.time() - t; t1 = tickers(o)
    g = lambda n: t1.get(n, 0) - t0.get(n, 0)
    user = g('rocksdb.bytes.written'); fl = g('rocksdb.flush.write.bytes'); cw = g('rocksdb.compact.write.bytes'); cr = g('rocksdb.compact.read.bytes'); wal = g('rocksdb.wal.bytes')
    sst = int(db.property_int_value('rocksdb.total-sst-files-size')); live = int(db.property_int_value('rocksdb.estimate-live-data-size'))
    p = {'phase': label, 'seconds': round(el, 1), 'user_bytes': user, 'wal_bytes': wal, 'flush_bytes': fl, 'compact_write_bytes': cw, 'compact_read_bytes': cr,
         'write_amp': round((fl + cw) / user, 2), 'write_amp_with_wal': round((fl + cw + wal) / user, 2), 'sst_bytes': sst, 'live_bytes': live,
         'space_amp': round(sst / live, 2) if live else None, 'files_per_level': levels(db)}
    run['phases'].append(p); print(style, p, flush=True)
def reads(db, o, ks, label, run):
    t0 = tickers(o); t = time.time(); found = 0
    for k in ks:
        if db.get(k) is not None: found += 1
    el = time.time() - t; t1 = tickers(o); g = lambda n: t1.get(n, 0) - t0.get(n, 0)
    r = {'gets': label, 'n': len(ks), 'found': found, 'us_per_get': round(el / len(ks) * 1e6, 1), 'bloom_useful': g('rocksdb.bloom.filter.useful'),
         'bloom_full_positive': g('rocksdb.bloom.filter.full.positive'), 'bloom_true_positive': g('rocksdb.bloom.filter.full.true.positive'),
         'data_blocks_read': g('rocksdb.block.cache.data.miss') + g('rocksdb.block.cache.data.hit'), 'data_block_misses': g('rocksdb.block.cache.data.miss')}
    r['data_blocks_per_get'] = round(r['data_blocks_read'] / len(ks), 2)
    run['reads'].append(r); print(style, r, flush=True)
for style, bloom in [('leveled', True), ('universal', True), ('leveled', False)]:
    path = f'lsm_{style}_{bloom}'; shutil.rmtree(path, ignore_errors=True)
    o = opts(style, bloom); db = Rdict(path, o)
    run = {'style': style, 'bloom': bloom, 'phases': [], 'reads': []}
    if bloom or style == 'leveled':
        phase(db, o, keys, 'load (unique keys)', run)
        phase(db, o, over, 'overwrite (random existing keys)', run)
    reads(db, o, present, 'present keys', run); reads(db, o, absent, 'absent keys', run)
    stats = db.property_value('rocksdb.stats'); run['stats_excerpt'] = '\n'.join(stats.splitlines()[:14])
    R['runs'].append(run); db.close(); shutil.rmtree(path, ignore_errors=True)
here = os.path.dirname(os.path.abspath(__file__))
json.dump(R, open(os.path.join(here, '..', 'inputs', 'm5_lsm.json'), 'w'), indent=1); print('done')
