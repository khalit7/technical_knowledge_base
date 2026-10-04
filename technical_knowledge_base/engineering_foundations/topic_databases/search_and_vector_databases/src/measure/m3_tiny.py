"""The page's worked example: six real Quora questions and one query.
Postgres gives the lexemes (to_tsvector 'english') and ts_debug; all-MiniLM-L6-v2 gives the cosine similarities;
the BM25 and RRF arithmetic is done by the page's JavaScript and checked by ../recompute.py.
Also: how long a LIKE '%...%' scan takes on the 522,931-row table, against the GIN index.
Usage: uv run --no-project --python 3.12 --with 'psycopg[binary]' --with pgvector --with numpy --with sentence-transformers python m3_tiny.py"""
import os, sys, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svpg
svpg.start(); c = svpg.connect()
DOCS = {2: None, 26479: None, 28373: None, 30587: None, 8918: None, 3: None}
QUERY = 'How do I start investing in shares?'
out = {'query': QUERY, 'docs': []}
E, Qe, meta = svpg.load_emb('quora')
from sentence_transformers import SentenceTransformer
m = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu')
qv = m.encode([QUERY], normalize_embeddings=True)[0]
for bid in DOCS:
    row = meta['doc_ids'].index(str(bid))
    text = meta['texts'][row]
    lex = c.execute("select (select json_agg(json_build_array(lexeme, positions)) from unnest(to_tsvector('english', %s)))", (text,)).fetchone()[0]
    out['docs'].append({'beir_id': bid, 'text': text, 'lexemes': lex, 'cos': round(float(E[row] @ qv), 4),
                        'cos_stored_vs_fresh': round(float(E[row] @ m.encode([text], normalize_embeddings=True)[0]), 4)})
out['query_lexemes'] = c.execute("select (select json_agg(json_build_array(lexeme, positions)) from unnest(to_tsvector('english', %s)))", (QUERY,)).fetchone()[0]
out['query_ts_debug'] = c.execute("select alias, token, lexemes::text from ts_debug('english', %s)", (QUERY,)).fetchall()
out['first_dims'] = [round(float(x), 4) for x in qv[:8]]
out['norm'] = round(float(np.linalg.norm(qv)), 4)
# LIKE against GIN. The table also has a pg_trgm GIN index (made by m2_fts.py), which Postgres can use for ILIKE too,
# so three runs: ILIKE forced to a sequential scan, ILIKE with the trigram index, full-text with the tsvector GIN index.
LIKE = "select count(*) from q where body ilike '%diamond%'"
FTS = "select count(*) from q where tsv @@ to_tsquery('english', 'diamond')"
def run(sql, pre=()):
    c = svpg.connect()  # a fresh session per variant, so no setting leaks between them
    for x in pre: c.execute(x)
    ts = []
    for p in range(5):
        t = time.perf_counter(); n = c.execute(sql).fetchone()[0]; ts.append((time.perf_counter() - t) * 1000)
    plan = [r[0] for r in c.execute('explain (analyze, costs off) ' + sql).fetchall()]
    c.close()
    return {'rows': n, 'ms_median_of_5': round(sorted(ts)[2], 2), 'plan': plan}
out['like_vs_gin'] = {'ilike_seqscan': run(LIKE, ['set enable_bitmapscan = off', 'set enable_indexscan = off', 'set max_parallel_workers_per_gather = 0']),
                      'ilike_seqscan_parallel': run(LIKE, ['set enable_bitmapscan = off', 'set enable_indexscan = off']),
                      'ilike_trigram_index': run(LIKE), 'fts_gin': run(FTS)}
svpg.save(out, 'm3_tiny.json')
