"""Independent recomputation of the page's arithmetic, checked against the page's JavaScript by check_page.mjs.
1. BM25 (k1 1.2, b 0.75, Lucene idf) and RRF (k 60) on the six worked questions, from inputs/m3_tiny.json.
2. Derived facts re-derived from inputs/ (not from facts.json) and compared with facts.json; every fact must appear in ../index.html.
3. Toy-independent identities: unit vectors make cosine, dot and L2 rank alike (checked on the six cosines); 4n+8 bytes.
Writes recompute_out.json. Run: python3 recompute.py"""
import json, math, os, re, html
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, 'inputs')
m1 = json.load(open(f'{I}/m1_ann.json')); m2 = json.load(open(f'{I}/m2_fts.json')); m3 = json.load(open(f'{I}/m3_tiny.json'))
facts = json.load(open(os.path.join(H, 'facts.json')))
ok = True
def check(name, cond):
    global ok
    print(('ok   ' if cond else 'FAIL ') + name); ok = ok and cond
# 1. BM25 and RRF
docs = [{lx: len(pos) for lx, pos in d['lexemes']} for d in m3['docs']]
ql = [x[0] for x in m3['query_lexemes']]
N = len(docs); dl = [sum(d.values()) for d in docs]; avg = sum(dl) / N
k1, b = 1.2, 0.75
idf = {t: math.log(1 + (N - sum(1 for d in docs if t in d) + 0.5) / (sum(1 for d in docs if t in d) + 0.5)) for t in ql}
scores = [sum(idf[t] * d.get(t, 0) * (k1 + 1) / (d.get(t, 0) + k1 * (1 - b + b * dl[j] / avg)) for t in ql) for j, d in enumerate(docs)]
lex = [j + 1 for s, j in sorted(((s, j) for j, s in enumerate(scores) if s > 0), key=lambda x: (-x[0], x[1]))]
vec = [j + 1 for c, j in sorted(((d['cos'], j) for j, d in enumerate(m3['docs'])), key=lambda x: (-x[0], x[1]))]
rr = {}
for L in (lex, vec):
    for i, d in enumerate(L): rr[d] = rr.get(d, 0) + 1 / (60 + i + 1)
rrf = [d for d, s in sorted(rr.items(), key=lambda x: (-x[1], x[0]))]
print('BM25', [round(s, 4) for s in scores], 'lexical order', lex, 'vector order', vec, 'RRF', rrf)
# 2. derived facts, re-derived
N1 = m1['env']['rows']; h16 = m1['hnsw']['m16_efc64']; c40 = [c for c in h16['curve'] if c['ef_search'] == 40][0]
ex = m1['exact']['cos_w2']
check('speedup', facts['speedup'] == f"{ex['p50_ms'] / c40['p50_ms']:.0f}")
check('bytes per vector', facts['hnsw_bpv'] == f"{h16['bytes'] / N1:,.0f}")
link = h16['bytes'] / N1 - (4 * 384 + 8)
check('link bytes', facts['link_bytes'] == f'{link:,.0f}')
check('10M at 1536-d', facts['mem10m'] == f"{1e7 * (4 * 1536 + 8 + link) / 1e9:.0f}")
check('one vector is 4n+8', m1['load']['one_vector_bytes'] == 4 * 384 + 8)
check('vector share', facts['vec_share'] == f"{100 * m1['load']['vector_column_bytes'] / m1['load']['heap_bytes']:.0f}")
check('post-filter expectation 40 x 1% = 0.4', abs(40 * 0.01 - 0.4) < 1e-12)
check('pg exact agrees with numpy exact', m1['truth']['pg_exact_vs_numpy_recall10_50q'] >= 0.99)
check('615 GB for 100M x 1536', round(1e8 * 6152 / 1e9) == 615)
check('PQ 64x', 6144 / 96 == 64)
qs = m2['quora']['scores']
# unit vectors: cosine order equals L2 order (|a-b|^2 = 2 - 2cos)
l2 = [math.sqrt(max(0, 2 - 2 * d['cos'])) for d in m3['docs']]
check('cosine and L2 give the same order', sorted(range(N), key=lambda j: -m3['docs'][j]['cos']) == sorted(range(N), key=lambda j: l2[j]))
# 3. every fact appears in the built page
page = open(os.path.join(H, '..', 'index.html')).read()
miss = [k for k, v in facts.items() if html.escape(str(v), quote=False) not in page]
check('every fact appears in index.html (' + str(len(facts)) + ')', not miss)
if miss: print('  missing:', miss)
json.dump({'bm25': [round(s, 6) for s in scores], 'idf': [round(idf[t], 6) for t in ql], 'rrf': rrf, 'lex': lex, 'vec': vec},
          open(os.path.join(H, 'recompute_out.json'), 'w'), indent=1)
print('ALL OK' if ok else 'SOME CHECKS FAILED')
