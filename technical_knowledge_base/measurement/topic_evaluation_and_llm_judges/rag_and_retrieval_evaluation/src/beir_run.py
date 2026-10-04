"""Retrieval runs on three BEIR test sets (SciFact, NFCorpus, FiQA-2018), scored against the released qrels.
Systems: (1) BM25 flat, Pyserini-style (title + text, Lucene English stopwords, Porter stemmer, k1=0.9, b=0.4, Lucene idf);
(2) rank_bm25's BM25Okapi as pip-installed (whitespace-and-regex tokens, no stemming, its defaults k1=1.5, b=0.75);
(3) dense: sentence-transformers/all-MiniLM-L6-v2, cosine on normalised embeddings;
(4) hybrid: reciprocal rank fusion of (1) and (3), k=60 (Cormack et al. 2009).
Metrics as pytrec_eval / BEIR compute them: nDCG@10 (linear gain = qrels grade), recall@k, P@10, MRR@10, hit@k.
Usage: uv run --with numpy --with scipy --with nltk --with rank_bm25 --with sentence-transformers python beir_run.py <beir dir> <out dir>
Torch threads are capped at 2."""
import json, sys, re, math, time, os
import numpy as np, scipy.sparse as sp
from nltk.stem import PorterStemmer
base, outd = sys.argv[1], sys.argv[2]
SETS = sys.argv[3].split(',') if len(sys.argv) > 3 else ['scifact', 'nfcorpus', 'fiqa']
STOP = set('a an and are as at be but by for if in into is it no not of on or such that the their then there these they this to was will with'.split())
ps = PorterStemmer(); _c = {}
def stem(w):
    s = _c.get(w)
    if s is None: s = _c[w] = ps.stem(w)
    return s
def toks_lucene(t): return [stem(w) for w in re.findall(r"[a-z0-9]+", t.lower()) if w not in STOP]
def toks_plain(t): return re.findall(r"\w+", t.lower())

def load(name):
    d = f'{base}/{name}'
    C = [json.loads(l) for l in open(d + '/corpus.jsonl')]
    Q = {}
    for l in open(d + '/queries.jsonl'):
        q = json.loads(l); Q[q['_id']] = q['text']
    qrels = {}
    for i, l in enumerate(open(d + '/qrels/test.tsv')):
        if i == 0: continue
        a, b, s = l.rstrip('\n').split('\t'); s = int(s)
        if s > 0: qrels.setdefault(a, {})[b] = s
    qids = [q for q in Q if q in qrels]
    return C, Q, qrels, qids

def bm25_matrix(docs_toks, k1, b):
    vocab = {}; rows, cols, vals = [], [], []
    for i, ts in enumerate(docs_toks):
        tf = {}
        for t in ts: tf[t] = tf.get(t, 0) + 1
        for t, c in tf.items():
            j = vocab.setdefault(t, len(vocab)); rows.append(i); cols.append(j); vals.append(c)
    N = len(docs_toks)
    M = sp.csr_matrix((np.array(vals, float), (rows, cols)), shape=(N, len(vocab)))
    dl = np.array([len(t) for t in docs_toks], float); avg = dl.mean()
    df = np.bincount(cols, minlength=len(vocab)).astype(float)
    idf = np.log(1 + (N - df + 0.5) / (df + 0.5))
    M = M.tocoo(); denom = M.data + k1 * (1 - b + b * dl[M.row] / avg)
    W = sp.csr_matrix((M.data * (k1 + 1) / denom * idf[M.col], (M.row, M.col)), shape=M.shape).tocsc()
    return W, vocab

def run_bm25(C, Q, qids, tok, k1, b, depth=1000):
    W, vocab = bm25_matrix([tok((d.get('title') or '') + ' ' + d['text']) for d in C], k1, b)
    out = {}
    for q in qids:
        js = [vocab[t] for t in tok(Q[q]) if t in vocab]  # repeated query terms count again, as in Lucene
        s = np.asarray(W[:, js].sum(axis=1)).ravel() if js else np.zeros(len(C))
        top = np.argsort(-s, kind='stable')[:depth]
        out[q] = [(C[i]['_id'], float(s[i])) for i in top if s[i] > 0]
    return out

def run_bm25okapi(C, Q, qids, depth=1000):
    from rank_bm25 import BM25Okapi
    bm = BM25Okapi([toks_plain((d.get('title') or '') + ' ' + d['text']) for d in C])
    out = {}
    for q in qids:
        s = bm.get_scores(toks_plain(Q[q])); top = np.argsort(-s, kind='stable')[:depth]
        out[q] = [(C[i]['_id'], float(s[i])) for i in top]
    return out

def run_dense(C, Q, qids, depth=1000):
    import torch; torch.set_num_threads(2)
    from sentence_transformers import SentenceTransformer
    m = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu')
    E = m.encode([((d.get('title') or '') + ' ' + d['text']).strip() for d in C], batch_size=64, normalize_embeddings=True, show_progress_bar=False, convert_to_numpy=True)
    QE = m.encode([Q[q] for q in qids], batch_size=64, normalize_embeddings=True, convert_to_numpy=True)
    S = QE @ E.T; out = {}
    for i, q in enumerate(qids):
        top = np.argsort(-S[i], kind='stable')[:depth]
        out[q] = [(C[j]['_id'], float(S[i, j])) for j in top]
    return out

def rrf(a, b, k=60, depth=1000):
    out = {}
    for q in a:
        sc = {}
        for lst in (a[q], b[q]):
            for r, (d, _) in enumerate(lst): sc[d] = sc.get(d, 0) + 1 / (k + r + 1)
        out[q] = sorted(sc.items(), key=lambda x: -x[1])[:depth]
    return out

def metrics(run, qrels, qids):
    agg = {}
    def add(k, v): agg.setdefault(k, []).append(v)
    per = {}
    for q in qids:
        rel = qrels[q]; ids = [d for d, _ in run[q]]
        g = [rel.get(d, 0) for d in ids]
        dcg = sum(x / math.log2(i + 2) for i, x in enumerate(g[:10]))
        ideal = sorted(rel.values(), reverse=True)[:10]
        idcg = sum(x / math.log2(i + 2) for i, x in enumerate(ideal))
        nd = dcg / idcg
        first = next((i + 1 for i, x in enumerate(g) if x > 0), None)
        rr = 1 / first if first and first <= 10 else 0.0
        add('ndcg@10', nd); add('mrr@10', rr); add('p@10', sum(1 for x in g[:10] if x > 0) / 10)
        for k in (1, 3, 5, 10, 20, 100):
            add(f'recall@{k}', sum(1 for x in g[:k] if x > 0) / len(rel)); add(f'hit@{k}', 1.0 if any(x > 0 for x in g[:k]) else 0.0)
        per[q] = {'nd': round(nd, 4), 'first': first, 'ranks': {d: (ids.index(d) + 1 if d in ids else None) for d in rel}}
    return {k: round(float(np.mean(v)), 4) for k, v in agg.items()}, per

os.makedirs(outd, exist_ok=True)
for name in SETS:
    t0 = time.time(); C, Q, qrels, qids = load(name)
    print(name, 'docs', len(C), 'queries', len(qids), flush=True)
    runs = {}
    runs['bm25_lucene'] = run_bm25(C, Q, qids, toks_lucene, 0.9, 0.4); print(' bm25 done', round(time.time() - t0), flush=True)
    runs['bm25_lucene_es'] = run_bm25(C, Q, qids, toks_lucene, 1.2, 0.75); print(' bm25 es-params done', round(time.time() - t0), flush=True)
    runs['bm25okapi'] = run_bm25okapi(C, Q, qids); print(' bm25okapi done', round(time.time() - t0), flush=True)
    runs['dense_minilm'] = run_dense(C, Q, qids); print(' dense done', round(time.time() - t0), flush=True)
    runs['hybrid_rrf'] = rrf(runs['bm25_lucene'], runs['dense_minilm'])
    res = {'docs': len(C), 'queries': len(qids), 'qrels_pairs': sum(len(v) for v in qrels.values()),
           'grades': sorted({s for v in qrels.values() for s in v.values()}), 'systems': {}}
    pers = {}
    for k, r in runs.items():
        res['systems'][k], pers[k] = metrics(r, qrels, qids)
    json.dump(res, open(f'{outd}/{name}_summary.json', 'w'), indent=1)
    # compact per-query record: text, gold (id, grade, rank under each system up to 1000), top-10 per system
    titles = {d['_id']: ((d.get('title') or '') or d['text'])[:90] for d in C}
    snips = {d['_id']: d['text'][:240] for d in C}
    keep = {}
    for q in qids:
        keep[q] = {'t': Q[q], 'gold': [[d, g] + [pers[k][q]['ranks'][d] for k in runs] for d, g in qrels[q].items()],
                   'top': {k: [d for d, _ in runs[k][q][:10]] for k in runs}}
    json.dump({'systems': list(runs), 'q': keep, 'titles': titles, 'snips': snips}, open(f'{outd}/{name}_perquery.json', 'w'))
    print(name, json.dumps({k: (v['ndcg@10'], v['recall@100']) for k, v in res['systems'].items()}), round(time.time() - t0), 's', flush=True)
