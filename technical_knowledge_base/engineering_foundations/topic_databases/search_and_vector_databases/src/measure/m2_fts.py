"""Full-text, vector and hybrid retrieval on the same queries, scored against BEIR relevance labels, in PostgreSQL 18.6 + pgvector 0.8.7.
Corpora: BEIR Quora (table q from m1_ann.py; first 1,000 test queries) and BEIR SciFact (5,183 abstracts, 300 test claims).
Systems (top 100 each, scored at 10):
  fts_and      tsv @@ plainto_tsquery('english', query), ranked by ts_rank (every word must match)
  fts_or       the query's lexemes OR-ed together, ranked by ts_rank (no IDF: Postgres ranks by term frequency only)
  bm25_pg      BM25 (k1 0.9, b 0.4, Lucene idf) computed here over Postgres's own lexemes (same tokens, BM25 ranking)
  vector       exact cosine kNN (numpy) on all-MiniLM-L6-v2 embeddings
  hnsw         pgvector HNSW, m 16, ef_construction 64, ef_search 40
  rrf_bm25_vec reciprocal rank fusion (k 60) of bm25_pg and vector
  rrf_sql      one SQL statement: fts_or and the HNSW search fused by RRF inside Postgres (what you would deploy)
Metrics as BEIR / pytrec_eval define them: nDCG@10 (linear gain), recall@10, MRR@10.
Also: tsvector and GIN build time and size, ts_debug of one question, phrase and trigram (pg_trgm) fuzzy examples."""
import os, sys, json, time, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svpg
from svpg import lat_summary
OUT = 'm2_fts.json'
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', OUT)
R = json.load(open(P)) if os.path.exists(P) else {}
svpg.start(); c = svpg.connect()
def save(): svpg.save(R, OUT)

def ndcg10(ranked, rel):
    dcg = sum((rel.get(d, 0)) / math.log2(i + 2) for i, d in enumerate(ranked[:10]))
    ideal = sorted(rel.values(), reverse=True)[:10]
    idcg = sum(g / math.log2(i + 2) for i, g in enumerate(ideal))
    return dcg / idcg if idcg else 0.0
def recall10(ranked, rel): return len(set(ranked[:10]) & set(rel)) / len(rel)
def mrr10(ranked, rel):
    for i, d in enumerate(ranked[:10]):
        if d in rel: return 1 / (i + 1)
    return 0.0
def score(runs, qrels):
    out = {}
    for name, run in runs.items():
        n = [ndcg10(run[q], qrels[q]) for q in run]; r = [recall10(run[q], qrels[q]) for q in run]; m = [mrr10(run[q], qrels[q]) for q in run]
        out[name] = {'ndcg10': round(float(np.mean(n)), 4), 'recall10': round(float(np.mean(r)), 4), 'mrr10': round(float(np.mean(m)), 4),
                     'empty_share': round(float(np.mean([len(run[q]) == 0 for q in run])), 4)}
    return out
def rrf(lists, k=60, depth=100):
    s = {}
    for L in lists:
        for i, d in enumerate(L[:depth]): s[d] = s.get(d, 0) + 1 / (k + i + 1)
    return [d for d, _ in sorted(s.items(), key=lambda x: -x[1])]

def setup_table(tab, texts, E):
    if c.execute("select 1 from pg_class where relname=%s", (tab,)).fetchone() and tab == 'q':
        pass
    elif tab != 'q':
        c.execute(f'drop table if exists {tab} cascade')
        c.execute(f'create table {tab} (id int primary key, body text not null, embedding vector(384) not null)')
        with c.cursor().copy(f'copy {tab} (id, body, embedding) from stdin with (format binary)') as cp:
            cp.set_types(['int4', 'text', 'vector'])
            for i in range(len(texts)): cp.write_row((i + 1, texts[i], E[i]))
    info = {}
    if not c.execute("select 1 from information_schema.columns where table_name=%s and column_name='tsv'", (tab,)).fetchone():
        # adding a stored generated column rewrites the table and every index on it: drop the vector index first so the timing is the tsvector's
        c.execute(f'drop index if exists {tab}_hnsw'); c.execute('drop index if exists q_hnsw') if tab == 'q' else None
        t = time.perf_counter(); c.execute(f"alter table {tab} add column tsv tsvector generated always as (to_tsvector('english', body)) stored")
        info['add_tsv_s'] = round(time.perf_counter() - t, 1)
    c.execute(f'drop index if exists {tab}_gin')
    t = time.perf_counter(); c.execute(f'create index {tab}_gin on {tab} using gin (tsv)'); info['gin_build_s'] = round(time.perf_counter() - t, 1)
    info['gin_bytes'] = svpg.size(c, f'{tab}_gin')
    info['tsv_column_bytes'] = c.execute(f'select sum(pg_column_size(tsv)) from {tab}').fetchone()[0]
    info['distinct_lexemes'] = c.execute(f'select count(*) from ts_stat($$select tsv from {tab}$$)').fetchone()[0]
    if not c.execute("select 1 from pg_class where relname=%s", (tab + '_hnsw' if tab != 'q' else 'q_hnsw',)).fetchone():
        hn = tab + '_hnsw' if tab != 'q' else 'q_hnsw'
        t = time.perf_counter(); c.execute(f'create index {hn} on {tab} using hnsw (embedding vector_cosine_ops)'); info['hnsw_build_s'] = round(time.perf_counter() - t, 1)
    c.execute(f'vacuum analyze {tab}')
    return info

def lexeme_tf(tab):
    rows = c.execute(f'select id, (select json_agg(json_build_array(lexeme, coalesce(array_length(positions,1),1))) from unnest(tsv)) from {tab} order by id').fetchall()
    return {r[0]: dict((l, n) for l, n in (r[1] or [])) for r in rows}

def bm25_index(tf, k1=0.9, b=0.4):
    N = len(tf); dl = {d: sum(v.values()) for d, v in tf.items()}; avg = sum(dl.values()) / N
    post = {}
    for d, v in tf.items():
        for t, n in v.items(): post.setdefault(t, []).append((d, n))
    idf = {t: math.log(1 + (N - len(p) + 0.5) / (len(p) + 0.5)) for t, p in post.items()}
    return post, idf, dl, avg, k1, b
def bm25_search(ix, terms, depth=100):
    post, idf, dl, avg, k1, b = ix; s = {}
    for t in terms:
        for d, n in post.get(t, []):
            s[d] = s.get(d, 0) + idf[t] * n * (k1 + 1) / (n + k1 * (1 - b + b * dl[d] / avg))
    return [d for d, _ in sorted(s.items(), key=lambda x: (-x[1], x[0]))[:depth]]

def run_corpus(name, tab, nq):
    E, Q, meta = svpg.load_emb(name); Q = Q[:nq]
    qids = meta['qids'][:nq]; qtext = meta['queries'][:nq]
    id_of = {meta['doc_ids'][i]: i + 1 for i in range(len(meta['doc_ids']))}
    qrels = {q: {id_of[d]: g for d, g in meta['qrels'][q].items() if d in id_of} for q in qids}
    res = {'docs': len(E), 'queries': nq}
    res['index'] = setup_table(tab, meta['texts'], E)
    runs = {k: {} for k in ['fts_and', 'fts_or', 'bm25_pg', 'vector', 'hnsw', 'rrf_bm25_vec', 'rrf_sql']}
    lat = {k: [] for k in ['fts_and', 'fts_or', 'hnsw', 'rrf_sql']}
    t = time.perf_counter(); ix = bm25_index(lexeme_tf(tab)); res['bm25_index_build_s_python'] = round(time.perf_counter() - t, 1)
    S = Q @ E.T
    c.execute('set hnsw.ef_search = 40')
    AND = f"select id from {tab}, plainto_tsquery('english', %(q)s) qq where tsv @@ qq order by ts_rank(tsv, qq) desc, id limit 100"
    ORQ = f"""with qq as (select to_tsquery('simple', coalesce(nullif(string_agg(quote_literal(lexeme), ' | '), ''), 'zzzznomatch')) q from unnest(to_tsvector('english', %(q)s)))
select id from {tab}, qq where tsv @@ qq.q order by ts_rank(tsv, qq.q) desc, id limit 100"""
    HN = f'select id from {tab} order by embedding <=> %(v)s limit 100'
    RRF = f"""with qq as (select to_tsquery('simple', coalesce(nullif(string_agg(quote_literal(lexeme), ' | '), ''), 'zzzznomatch')) q from unnest(to_tsvector('english', %(q)s))),
lex as (select id, row_number() over (order by ts_rank(tsv, qq.q) desc, id) r from {tab}, qq where tsv @@ qq.q order by ts_rank(tsv, qq.q) desc, id limit 100),
sem as (select id, row_number() over (order by embedding <=> %(v)s) r from (select id, embedding from {tab} order by embedding <=> %(v)s limit 100) s)
select coalesce(lex.id, sem.id) id from lex full join sem using (id)
order by coalesce(1.0 / (60 + lex.r), 0) + coalesce(1.0 / (60 + sem.r), 0) desc, id limit 100"""
    c.execute('set hnsw.ef_search = 100')  # 100 candidates need ef_search >= 100
    for p in range(2):
        for i, q in enumerate(qids):
            par = {'q': qtext[i], 'v': Q[i]}
            for k, sql in [('fts_and', AND), ('fts_or', ORQ), ('hnsw', HN), ('rrf_sql', RRF)]:
                t = time.perf_counter(); rows = [r[0] for r in c.execute(sql, par).fetchall()]
                if p == 1: lat[k].append((time.perf_counter() - t) * 1000); runs[k][q] = rows
    for i, q in enumerate(qids):
        terms = [r[0] for r in c.execute("select lexeme from unnest(to_tsvector('english', %s))", (qtext[i],)).fetchall()]
        runs['bm25_pg'][q] = bm25_search(ix, terms)
        runs['vector'][q] = (np.argsort(-S[i])[:100] + 1).tolist()
        runs['rrf_bm25_vec'][q] = rrf([runs['bm25_pg'][q], runs['vector'][q]])
    res['scores'] = score(runs, qrels)
    res['latency'] = {k: lat_summary(v) for k, v in lat.items()}
    # one query shown end to end on the page
    i0 = 0
    res['example'] = {'query': qtext[i0], 'relevant': [meta['texts'][d - 1] for d in qrels[qids[i0]]],
                      'top5': {k: [meta['texts'][d - 1] for d in runs[k][qids[i0]][:5]] for k in ['fts_and', 'fts_or', 'bm25_pg', 'vector', 'rrf_bm25_vec']}}
    # per-query wins (where hybrid helps)
    nd = {k: [ndcg10(runs[k][q], qrels[q]) for q in qids] for k in ['bm25_pg', 'vector', 'rrf_bm25_vec']}
    res['wins'] = {'bm25_better_than_vector': int(sum(a > b for a, b in zip(nd['bm25_pg'], nd['vector']))),
                   'vector_better_than_bm25': int(sum(b > a for a, b in zip(nd['bm25_pg'], nd['vector']))),
                   'tie': int(sum(a == b for a, b in zip(nd['bm25_pg'], nd['vector'])))}
    # sample queries for the page's side-by-side tab: where BM25 wins, where vectors win, where fusion helps
    import random
    rnd = random.Random(7); idx = list(range(len(qids))); rnd.shuffle(idx)
    picks = {'bm25': [], 'vector': [], 'hybrid': [], 'all_fail': []}
    for i in idx:
        a, b, h = nd['bm25_pg'][i], nd['vector'][i], nd['rrf_bm25_vec'][i]
        kind = 'bm25' if a > b + 0.3 else 'vector' if b > a + 0.3 else 'hybrid' if h > max(a, b) + 0.05 else 'all_fail' if max(a, b, h) == 0 else None
        if kind and len(picks[kind]) < (5 if kind != 'all_fail' else 2): picks[kind].append(i)
    def doc(d): return {'id': d, 'text': meta['texts'][d - 1][:300], 'rel': d in qrels[qids[i]]}
    res['samples'] = []
    for kind, L in picks.items():
        for i in L:
            q = qids[i]
            res['samples'].append({'kind': kind, 'query': qtext[i], 'n_relevant': len(qrels[q]),
                'ndcg': {k: round(nd[k][i], 3) for k in nd},
                'top': {k: [doc(d) for d in runs[k][q][:5]] for k in ['fts_and', 'fts_or', 'bm25_pg', 'vector', 'rrf_bm25_vec']},
                'relevant': [meta['texts'][d - 1][:300] for d in list(qrels[q])[:3]]})
    return res

if 'scifact' not in R or os.environ.get('FORCE') == '1':
    R['scifact'] = run_corpus('scifact', 'sf', 300); save()
if 'quora' not in R or os.environ.get('FORCE') == '1':
    R['quora'] = run_corpus('quora', 'q', 1000); save()
if 'demo' not in R or os.environ.get('FORCE') == '1':
    D = {}
    s = 'What is the story of Kohinoor (Koh-i-Noor) Diamond?'
    D['ts_debug'] = c.execute("select alias, token, dictionaries::text, lexemes::text from ts_debug('english', %s)", (s,)).fetchall()
    D['to_tsvector'] = c.execute("select to_tsvector('english', %s)::text", (s,)).fetchone()[0]
    D['plainto'] = c.execute("select plainto_tsquery('english', 'how do I invest in the share market')::text").fetchone()[0]
    D['phraseto'] = c.execute("select phraseto_tsquery('english', 'share market')::text").fetchone()[0]
    D['websearch'] = c.execute("""select websearch_to_tsquery('english', '"share market" -india or stocks')::text""").fetchone()[0]
    D['phrase_hits'] = c.execute("select count(*) from q where tsv @@ phraseto_tsquery('english', 'share market')").fetchone()[0]
    D['and_hits'] = c.execute("select count(*) from q where tsv @@ plainto_tsquery('english', 'share market')").fetchone()[0]
    D['typo_fts_hits'] = c.execute("select count(*) from q where tsv @@ plainto_tsquery('english', 'kohinor diamnd')").fetchone()[0]
    c.execute('create extension if not exists pg_trgm')
    t = time.perf_counter(); c.execute('create index if not exists q_trgm on q using gin (body gin_trgm_ops)'); D['trgm_build_s'] = round(time.perf_counter() - t, 1)
    D['trgm_bytes'] = svpg.size(c, 'q_trgm')
    D['show_trgm'] = c.execute("select show_trgm('kohinor')::text").fetchone()[0]
    c.execute('set pg_trgm.word_similarity_threshold = 0.5')
    t = time.perf_counter()
    D['typo_trgm_top'] = c.execute("select body, round(word_similarity('kohinor diamnd', body)::numeric, 3) from q where 'kohinor diamnd' <% body order by word_similarity('kohinor diamnd', body) desc limit 5").fetchall()
    D['typo_trgm_ms'] = round((time.perf_counter() - t) * 1000, 1)
    D['gin_plan'] = [r[0] for r in c.execute("explain (analyze, buffers, costs off) select id from q where tsv @@ plainto_tsquery('english', 'share market') order by ts_rank(tsv, plainto_tsquery('english', 'share market')) desc limit 10").fetchall()]
    R['demo'] = D; save()
print('ALL DONE')
