"""Check the page's numbers. Run from src/: python3 recompute.py
1. The page's JavaScript metric code (21z_js_runcore.js, mirrored here) on the compact data in inputs/page_data.json
   against the full Python runs (inputs/beir_summary.json, from beir_run.py), every system and set.
2. Our runs against the published numbers (Anserini BM25 flat, MTEB results for all-MiniLM-L6-v2).
3. The rank-list calculator's worked example (22_js_calc.js) against the old page's printed values.
4. RAGTruth counts recomputed from the release against the paper's Tables 2, 3 and 10 (arXiv v2).
5. The figures quoted in the Reading prose."""
import json, math
D = json.load(open('inputs/page_data.json'))
FULL = json.load(open('inputs/beir_summary.json'))
ok = True
def check(name, got, want, tol):
    global ok
    good = abs(got - want) <= tol
    ok &= good
    print(('ok  ' if good else 'FAIL'), name, round(got, 4), 'vs', want, '(tol', str(tol) + ')')

def agg(ds, si, k, exp=False):
    Q = D['beir'][ds]['Q']; r = h = p = m = n = 0.0
    for q in Q:
        fl = q[3][si]; c = 0; first = 0; d = 0.0
        for j in range(0, len(fl), 2):
            rk, g = fl[j], fl[j + 1]
            if rk <= k: c += 1
            if rk <= 10:
                if not first or rk < first: first = rk
                d += ((2 ** g - 1) if exp else g) / math.log2(rk + 1)
        r += c / q[0]; h += c > 0; p += c / k; m += 1 / first if first else 0; n += d / (q[2] if exp else q[1])
    N = len(Q); return {'recall': r / N, 'hit': h / N, 'prec': p / N, 'mrr': m / N, 'ndcg': n / N}

print('# 1. compact data (page JS) against the full runs')
for ds in ['scifact', 'nfcorpus', 'fiqa']:
    for si, s in enumerate(D['sys']):
        F = FULL[ds]['systems'][s]
        a10, a100 = agg(ds, si, 10), agg(ds, si, 100)
        for nm, got, want in [('ndcg@10', a10['ndcg'], F['ndcg@10']), ('recall@10', a10['recall'], F['recall@10']),
                              ('recall@100', a100['recall'], F['recall@100']), ('hit@10', a10['hit'], F['hit@10']),
                              ('mrr@10', a10['mrr'], F['mrr@10']), ('p@10', a10['prec'], F['p@10'])]:
            check(f'{ds} {s} {nm}', got, want, 6e-5)

print('# 2. reproduction of published numbers')
for ds in ['scifact', 'nfcorpus', 'fiqa']:
    P = D['beir'][ds]['pub']
    check(f'{ds} BM25 nDCG@10 vs Anserini flat', agg(ds, 0, 10)['ndcg'], P['bm25_lucene']['ndcg10'], 0.004)
    check(f'{ds} BM25 R@100 vs Anserini flat', agg(ds, 0, 100)['recall'], P['bm25_lucene']['r100'], 0.004)
    check(f'{ds} MiniLM nDCG@10 vs MTEB', agg(ds, 3, 10)['ndcg'], P['dense_minilm']['ndcg10'], 0.0015)
    check(f'{ds} MiniLM R@100 vs MTEB', agg(ds, 3, 100)['recall'], P['dense_minilm']['r100'], 0.0005)

print('# 3. calculator worked example')
def one(grades, allrel, k):
    top = grades[:k]; dcg = sum(g / math.log2(i + 2) for i, g in enumerate(top))
    idcg = sum(g / math.log2(i + 2) for i, g in enumerate(sorted(allrel, reverse=True)[:k]))
    seen = 0; cp = 0
    for i, g in enumerate(top):
        if g > 0: seen += 1; cp += seen / (i + 1)
    return dcg / idcg, sum(1 for g in top if g > 0) / len(allrel), sum(1 for g in top if g > 0) / k, cp / seen if seen else 0
first = [0, 2, 0, 1, 0, 0, 0, 3, 0, 0]; rer = [3, 2, 0, 1, 0, 0, 0, 0, 0, 0]
n1, r1, p1, c1 = one(first, [3, 2, 1], 5); n2, r2, p2, c2 = one(rer, [3, 2, 1], 5)
check('first-stage nDCG@5', n1, 0.355, 0.0005); check('reranked nDCG@5', n2, 0.985, 0.0005)
check('first-stage recall@5', r1, 2 / 3, 1e-9); check('first-stage precision@5', p1, 0.4, 1e-9)
check('first-stage context precision', c1, 0.5, 1e-9); check('reranked context precision', c2, 0.917, 0.0005)
check('padded list context precision@10', one([3] + [0] * 9, [3], 10)[3], 1.0, 1e-9)
check('padded list precision@10', one([3] + [0] * 9, [3], 10)[2], 0.1, 1e-9)

print('# 4. RAGTruth release against the paper (arXiv 2401.00396 v2)')
st = json.load(open('inputs/ragtruth_stats.json'))
T2 = {'QA': (5934, 1724, 2927), 'Data2txt': (6198, 4254, 9290)}
for t, (a, b, c) in T2.items():
    v = st['by_task'][t]
    check(f'Table 2 {t} responses', v['responses'], a, 0); check(f'Table 2 {t} hallucinated', v['hallucinated'], b, 0); check(f'Table 2 {t} spans', v['spans'], c, 0)
check('Table 2 summaries hallucinated (CNN/DM 1165 + news 521)', st['by_task']['Summary']['hallucinated'], 1165 + 521, 0)
check('Table 2 overall spans', st['overall']['spans'], 14289, 0)
T3 = {'gpt-3.5-turbo-0613': (75, 89), 'gpt-4-0613': (48, 51), 'llama-2-7b-chat': (510, 1010), 'llama-2-13b-chat': (399, 654),
      'llama-2-70b-chat': (320, 529), 'mistral-7B-instruct': (378, 594)}
for m, (rsp, sp) in T3.items():
    v = st['by_model_task'][m]['QA']
    if m == 'gpt-4-0613':
        print('note', m, 'QA hallucinated responses: release', v['hallucinated'], 'paper Table 3 prints', rsp, '(the correction box on the page)')
    else:
        check(f'Table 3 {m} QA responses', v['hallucinated'], rsp, 0)
    check(f'Table 3 {m} QA spans', v['spans'], sp, 0)
check('Table 10 implicit_true QA spans (33+15+251+215+168+164)', st['implicit_true_qa'], 33 + 15 + 251 + 215 + 168 + 164, 0)

print('# 5. prose figures')
X = D['rt']
tot = {}
for m, v in X['xt'].items():
    for k, c in v.items(): tot[k] = tot.get(k, 0) + c
check('crosstab total = 264 x 6', sum(tot.values()), 1584, 0)
check('bare refusals with the answer in context', tot['answer_in_context|abstained'], 36, 0)
check('retrieval on RAGTruth contexts: precision@3', X['ret']['p_at_3'], 0.431, 0.0005)
check('retrieval on RAGTruth contexts: MRR', X['ret']['mrr'], 0.651, 0.0005)
check('implicit_true share of QA spans (28.9%)', st['implicit_true_qa'] / st['by_task']['QA']['spans'], 0.289, 0.0005)
for ds, si, k, f, want in [('scifact', 0, 10, 'ndcg', 0.676), ('scifact', 3, 10, 'ndcg', 0.645), ('fiqa', 0, 10, 'ndcg', 0.239),
                           ('fiqa', 3, 10, 'ndcg', 0.369), ('scifact', 4, 10, 'ndcg', 0.719), ('nfcorpus', 4, 10, 'ndcg', 0.356),
                           ('fiqa', 4, 10, 'ndcg', 0.373), ('scifact', 4, 100, 'recall', 0.962), ('scifact', 2, 10, 'ndcg', 0.652),
                           ('fiqa', 2, 10, 'ndcg', 0.217), ('fiqa', 1, 10, 'ndcg', 0.253), ('nfcorpus', 0, 10, 'recall', 0.152),
                           ('nfcorpus', 0, 10, 'hit', 0.684), ('scifact', 0, 10, 'recall', 0.800), ('scifact', 0, 100, 'recall', 0.925)]:
    check(f'prose {ds} {D["sys"][si]} {f}@{k}', agg(ds, si, k)[f], want, 0.0005)
print('ALL OK' if ok else 'SOME CHECKS FAILED')
