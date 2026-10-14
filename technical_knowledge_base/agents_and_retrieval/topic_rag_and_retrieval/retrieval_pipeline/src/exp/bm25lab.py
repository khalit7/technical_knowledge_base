"""A small BM25 / BM25F scorer in NumPy + SciPy, written to be read, and checked against bm25s 0.3.13.

Lucene BM25 as bm25s implements it (bm25s/scoring.py lines 115-130 and 190-195 at tag 0.3.13):
    idf(t)  = ln(1 + (N - df + 0.5) / (df + 0.5))
    tfc     = tf / (tf + k1 * (1 - b + b * len / avglen))          (the (k1 + 1) factor is dropped: a constant)
    score   = sum over query terms of idf * tfc                      (a query term repeated counts again)
BM25F (Robertson, Zaragoza, Taylor 2004; the "simple BM25F" of Zaragoza et al. 2004): per-field length
normalisation, fields mixed BEFORE saturation:
    tf~     = sum over fields f of w_f * tf_f / (1 - b_f + b_f * len_f / avglen_f)
    score   = sum over query terms of idf * tf~ / (k1 + tf~)
"""
import numpy as np
import scipy.sparse as sp


def tokenize(texts, stem=True, stop=True, pattern=r"(?u)\b\w\w+\b"):
    """bm25s's tokenizer (lowercase, regex, English stopwords, Snowball stemmer); returns lists of strings."""
    import bm25s
    import Stemmer
    st = Stemmer.Stemmer("english") if stem else None
    out = bm25s.tokenize(texts, stopwords="en" if stop else None, stemmer=st, return_ids=False,
                         show_progress=False, token_pattern=pattern)
    return out


class Index:
    def __init__(self, fields):
        """fields: {name: [token list per doc]} (all fields same doc order)."""
        vocab = {}
        for toks in fields.values():
            for d in toks:
                for t in d:
                    if t not in vocab:
                        vocab[t] = len(vocab)
        self.vocab = vocab
        self.N = len(next(iter(fields.values())))
        self.tf, self.len, self.avg = {}, {}, {}
        for f, toks in fields.items():
            rows, cols = [], []
            for i, d in enumerate(toks):
                for t in d:
                    rows.append(i)
                    cols.append(vocab[t])
            m = sp.csr_matrix((np.ones(len(rows), dtype=np.float32), (rows, cols)), shape=(self.N, len(vocab)))
            m.sum_duplicates()
            self.tf[f] = m.tocsc()
            self.len[f] = np.array([len(d) for d in toks], dtype=np.float64)
            self.avg[f] = self.len[f].mean()
        anyf = None
        for m in self.tf.values():
            b = (m > 0).astype(np.int8)
            anyf = b if anyf is None else ((anyf + b) > 0).astype(np.int8)
        self.df = np.asarray(anyf.sum(axis=0)).ravel()
        self.idf = np.log(1 + (self.N - self.df + 0.5) / (self.df + 0.5))

    def scores(self, qtoks, k1=1.2, b=0.75, weights=None, bf=None):
        """dense score vector over all docs for one query (token list)."""
        weights = weights or {f: 1.0 for f in self.tf}
        bf = bf or {f: b for f in self.tf}
        s = np.zeros(self.N)
        for t in qtoks:
            j = self.vocab.get(t)
            if j is None:
                continue
            tt = np.zeros(self.N)
            for f, w in weights.items():
                if w == 0:
                    continue
                col = self.tf[f][:, j]
                idx = col.indices
                if len(idx) == 0:
                    continue
                norm = 1 - bf[f] + bf[f] * self.len[f][idx] / self.avg[f]
                tt[idx] += w * col.data / norm
            nz = tt > 0
            s[nz] += self.idf[j] * tt[nz] / (k1 + tt[nz])
        return s


def run(index, qtok, qids, dids, k=100, **kw):
    out = {}
    for q, toks in zip(qids, qtok):
        s = index.scores(toks, **kw)
        nzc = int((s > 0).sum())
        kk = min(k, nzc) if nzc else 0
        if kk == 0:
            out[q] = {}
            continue
        top = np.argpartition(-s, kk - 1)[:kk]
        top = top[np.lexsort((top, -s[top]))]
        out[q] = {dids[i]: float(s[i]) for i in top}
    return out
