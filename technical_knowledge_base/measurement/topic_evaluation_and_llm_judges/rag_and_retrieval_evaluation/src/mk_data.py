"""Build inputs/page_data.json (window.RDATA) from the offline runs.
Inputs (scratch dir, argv[1]): out/<set>_summary.json and out/<set>_perquery.json from beir_run.py; ragtruth/*.jsonl;
ragtruth_stats.json (ragtruth_stats.py); ragtruth_marco.json (ragtruth_marco.py); gen_case54.json (gen_case.py).
Also copies the small extracts the page and recompute.py need into inputs/ (beir_summary.json, ragtruth_stats.json,
ragtruth_marco_crosstab.json, gen_case54.json)."""
import json, sys, math, os
S = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')
SETS = [('scifact', 'SciFact'), ('nfcorpus', 'NFCorpus'), ('fiqa', 'FiQA-2018')]
SYS = ['bm25_lucene', 'bm25_lucene_es', 'bm25okapi', 'dense_minilm', 'hybrid_rrf']
SHOW = ['bm25_lucene', 'dense_minilm', 'hybrid_rrf']  # systems whose top 10 the query browser shows
# Published reference numbers (files in inputs/published/): Anserini BM25 flat (k1=0.9, b=0.4) and the MTEB results
# repository for all-MiniLM-L6-v2 (revision 8b3219a9, mteb 1.12.75). BEIR paper (Thakur et al. 2021, Table 2) BM25.
PUB = {
    'scifact': {'bm25_lucene': {'ndcg10': 0.6789, 'r100': 0.9253, 'by': 'Anserini BM25 flat'},
                'dense_minilm': {'ndcg10': 0.64508, 'r100': 0.925, 'by': 'MTEB results repository'},
                'beir_bm25': 0.665},
    'nfcorpus': {'bm25_lucene': {'ndcg10': 0.3218, 'r100': 0.2457, 'by': 'Anserini BM25 flat'},
                 'dense_minilm': {'ndcg10': 0.31594, 'r100': 0.31151, 'by': 'MTEB results repository'},
                 'beir_bm25': 0.325},
    'fiqa': {'bm25_lucene': {'ndcg10': 0.2361, 'r100': 0.5395, 'by': 'Anserini BM25 flat'},
             'dense_minilm': {'ndcg10': 0.36867, 'r100': 0.70606, 'by': 'MTEB results repository'},
             'beir_bm25': 0.236},
}
def dcg(gs): return sum(g / math.log2(i + 2) for i, g in enumerate(gs))
out = {'beir': {}, 'sys': SYS}
summ = {}
for key, name in SETS:
    sm = json.load(open(f'{S}/out/{key}_summary.json')); summ[key] = sm
    P = json.load(open(f'{S}/out/{key}_perquery.json'))
    assert P['systems'] == SYS
    qids = sorted(P['q'], key=lambda x: (len(x), x))
    Q = []
    for q in qids:
        v = P['q'][q]; grades = sorted((g[1] for g in v['gold']), reverse=True)
        idl = dcg(grades[:10]); ide = dcg([2 ** g - 1 for g in grades[:10]])
        per = []
        for si in range(len(SYS)):
            fl = []
            for g in sorted(v['gold'], key=lambda g: (g[2 + si] or 10 ** 6)):
                r = g[2 + si]
                if r is not None and r <= 100: fl += [r, g[1]]
            per.append(fl)
        Q.append([len(v['gold']), round(idl, 6), round(ide, 6), per])
    # browser sample: queries where BM25 and dense disagree on hit@10, then queries both hit at different ranks
    def first(q, si):
        rs = [g[2 + si] for g in P['q'][q]['gold'] if g[2 + si]]
        return min(rs) if rs else None
    b, d = SYS.index('bm25_lucene'), SYS.index('dense_minilm')
    hit = lambda q, si: (first(q, si) or 999) <= 10
    A = [q for q in qids if hit(q, b) and not hit(q, d)]
    B = [q for q in qids if hit(q, d) and not hit(q, b)]
    C = [q for q in qids if hit(q, b) and hit(q, d) and first(q, b) != first(q, d)]
    Dq = [q for q in qids if not hit(q, b) and not hit(q, d)]
    pick = []
    for grp, n in ((A, 5), (B, 5), (C, 4), (Dq, 2)):
        grp = sorted(grp, key=lambda q: len(P['q'][q]['t']))
        pick += grp[:n]
    titles = {}; sample = []
    for q in pick:
        v = P['q'][q]
        tops = {s: v['top'][s] for s in SHOW}
        for s in SHOW:
            for dd in tops[s]: titles[dd] = P['titles'][dd]
        shown = {dd for s in SHOW for dd in tops[s]}
        sample.append({'i': qids.index(q), 'id': q, 't': v['t'][:300], 'gold': {g[0]: g[1] for g in v['gold'] if g[0] in shown},
                       'top': tops, 'grp': 'bm25 only' if q in A else 'dense only' if q in B else 'both' if q in C else 'neither'})
    out['beir'][key] = {'name': name, 'docs': sm['docs'], 'nq': sm['queries'], 'pairs': sm['qrels_pairs'], 'grades': sm['grades'],
                        'pub': PUB[key], 'Q': Q, 'sample': sample,
                        'titles': {k: v[:60] for k, v in titles.items()}}
json.dump({k: {'docs': v['docs'], 'queries': v['queries'], 'qrels_pairs': v['qrels_pairs'], 'grades': v['grades'], 'systems': v['systems']} for k, v in summ.items()},
          open(f'{INP}/beir_summary.json', 'w'), indent=1)
# RAGTruth
st = json.load(open(f'{S}/ragtruth_stats.json')); json.dump(st, open(f'{INP}/ragtruth_stats.json', 'w'), indent=1)
mx = json.load(open(f'{S}/ragtruth_marco.json'))
xt = {k: mx[k] for k in mx if k != 'items_detail'}
xt['retrieval_on_contexts'] = {
    'n': len(mx['items_detail']),
    'p_at_3': round(sum(sum(x['sel']) / 3 for x in mx['items_detail'].values()) / len(mx['items_detail']), 4),
    'mrr': round(sum(1 / (x['sel'].index(1) + 1) for x in mx['items_detail'].values()) / len(mx['items_detail']), 4),
    'n_selected': {str(k): sum(1 for x in mx['items_detail'].values() if sum(x['sel']) == k) for k in (1, 2, 3)}}
json.dump(xt, open(f'{INP}/ragtruth_marco_crosstab.json', 'w'), indent=1)
src = {}
for l in open(f'{S}/ragtruth/source_info.jsonl'):
    s = json.loads(l); src[s['source_id']] = s
resp = {}
for l in open(f'{S}/ragtruth/response.jsonl'):
    r = json.loads(l); resp.setdefault(r['source_id'], []).append(r)
ITEMS = ['14354', '15413', '15394', '15494', '15562', '12453', '15265', '12446']
MODELS = ['gpt-4-0613', 'gpt-3.5-turbo-0613', 'llama-2-70b-chat', 'llama-2-13b-chat', 'llama-2-7b-chat', 'mistral-7B-instruct']
items = []
import re
for sid in ITEMS:
    s = src[sid]; det = mx['items_detail'][sid]
    ps = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'passage \d+:', s['source_info']['passages']) if p.strip()]
    rs = {r['model']: r for r in resp[sid]}
    items.append({'id': sid, 'q': s['source_info']['question'], 'p': ps, 'sel': det['sel'], 'ref': det['answers'][0][:400],
                  'r': [{'m': m, 'split': rs[m]['split'], 'text': rs[m]['response'],
                         'sp': [[x['start'], x['end'], x['label_type'], 1 if x['implicit_true'] else 0, x['meta'][:300]] for x in rs[m]['labels']]} for m in MODELS]})
out['rt'] = {'stats': {'by_task': st['by_task'], 'overall': st['overall'], 'by_model_task': st['by_model_task'],
                       'label_types': st['label_types'], 'label_types_qa': st['label_types_qa'],
                       'implicit_true': st['implicit_true'], 'implicit_true_qa': st['implicit_true_qa']},
             'xt': xt['crosstab_by_model'], 'ret': xt['retrieval_on_contexts'], 'items': items, 'models': MODELS}
# the retrieval-failure case
g = json.load(open(f'{S}/gen_case54.json')); json.dump(g, open(f'{INP}/gen_case54.json', 'w'), indent=1)
corpus = {}
for l in open(f'{S}/scifact/corpus.jsonl'):
    d = json.loads(l); corpus[d['_id']] = d
for k, v in g['runs'].items():
    v['snips'] = [corpus[i]['text'][:260] for i in v['ids']]
out['case54'] = g
json.dump(out, open(f'{INP}/page_data.json', 'w'), separators=(',', ':'))
print('page_data.json', os.path.getsize(f'{INP}/page_data.json'))
