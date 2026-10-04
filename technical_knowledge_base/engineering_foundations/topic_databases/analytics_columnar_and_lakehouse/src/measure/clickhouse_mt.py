"""ClickHouse MergeTree, for real, in-process (chDB 3.7.2, which embeds ClickHouse 25.8): the 10M chat messages inserted in
10 batches into a MergeTree ordered by (chat_id, created_at); system.parts after the inserts and after OPTIMIZE (merge);
EXPLAIN indexes = 1 for a one-chat query (granules selected out of all); compression per column from system.columns; and an
incremental materialised view keeping tokens per model per day. Writes inputs/clickhouse.json. A few minutes.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with 'chdb<4' python clickhouse_mt.py
"""
import os, json, time, datetime, shutil
import chdb
from chdb import session
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); PQ = os.path.join(ROOT, 'messages.parquet')
D = os.path.join(ROOT, 'chdb'); shutil.rmtree(D, ignore_errors=True)
s = session.Session(D)
def q(sql, fmt='JSONCompact'):
    r = s.query(sql, fmt)
    t = r.bytes().decode() if hasattr(r, 'bytes') else str(r)
    return json.loads(t)['data'] if fmt == 'JSONCompact' and t.strip() else t
res = {'chdb': chdb.__version__, 'clickhouse': q('SELECT version()')[0][0], 'date': datetime.date.today().isoformat()}
q('CREATE DATABASE IF NOT EXISTS chat', 'CSV')
q('''CREATE TABLE chat.messages (id UInt64, chat_id UInt64, role LowCardinality(String), model LowCardinality(String), tokens UInt32,
     content String, created_at DateTime) ENGINE = MergeTree ORDER BY (chat_id, created_at)''', 'CSV')
q('''CREATE TABLE chat.tokens_per_day (day Date, model LowCardinality(String), messages UInt64, tokens UInt64)
     ENGINE = SummingMergeTree ORDER BY (day, model)''', 'CSV')
q('''CREATE MATERIALIZED VIEW chat.tokens_per_day_mv TO chat.tokens_per_day AS
     SELECT toDate(created_at) AS day, model, count() AS messages, sum(tokens) AS tokens FROM chat.messages GROUP BY day, model''', 'CSV')
q('SYSTEM STOP MERGES chat.messages', 'CSV')
t = time.time()
for b in range(10):
    q(f"INSERT INTO chat.messages SELECT id, chat_id, role, model, tokens, content, created_at FROM file('{PQ}', Parquet) WHERE id > {b * 1_000_000} AND id <= {(b + 1) * 1_000_000}", 'CSV')
res['insert_s'] = round(time.time() - t, 1)
PARTS = "SELECT name, rows, formatReadableSize(bytes_on_disk) size, bytes_on_disk, marks, level FROM system.parts WHERE database = 'chat' AND table = 'messages' AND active ORDER BY name"
res['parts_after_inserts'] = q(PARTS)
res['mv_rows_before_merge'] = q("SELECT count() FROM chat.tokens_per_day")[0][0]
res['mv_sample'] = q("SELECT day, model, sum(messages), sum(tokens) FROM chat.tokens_per_day WHERE day = '2026-03-01' GROUP BY day, model ORDER BY model")
EXPL = "EXPLAIN indexes = 1 SELECT count(), sum(tokens) FROM chat.messages WHERE chat_id = 424242"
res['explain_before_merge'] = q(EXPL, 'TabSeparatedRaw')
q('SYSTEM START MERGES chat.messages', 'CSV')
t = time.time(); q('OPTIMIZE TABLE chat.messages FINAL', 'CSV'); res['optimize_s'] = round(time.time() - t, 1)
res['parts_after_merge'] = q(PARTS)
res['explain_after_merge'] = q(EXPL, 'TabSeparatedRaw')
res['one_chat'] = q("SELECT count(), sum(tokens) FROM chat.messages WHERE chat_id = 424242")
res['columns'] = q("SELECT name, type, data_compressed_bytes, data_uncompressed_bytes FROM system.columns WHERE database = 'chat' AND table = 'messages'")
res['settings'] = q("SELECT name, value FROM system.merge_tree_settings WHERE name IN ('index_granularity', 'parts_to_delay_insert', 'parts_to_throw_insert', 'fsync_after_insert', 'min_bytes_for_wide_part')")
res['by_time_query'] = q("EXPLAIN indexes = 1 SELECT count() FROM chat.messages WHERE created_at >= '2026-03-01' AND created_at < '2026-03-02'", 'TabSeparatedRaw')
json.dump(res, open(os.path.join(OUT, 'clickhouse.json'), 'w'), indent=1, default=str)
print(json.dumps(res, indent=1, default=str)[:4000])
