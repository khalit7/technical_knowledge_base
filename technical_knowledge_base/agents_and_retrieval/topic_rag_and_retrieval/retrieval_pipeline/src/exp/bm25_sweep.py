"""BM25 in depth on SciFact and NFCorpus (deterministic, no lock).
1. check: bm25lab's Lucene BM25 reproduces the setup's recorded bm25s run (same top-10 scores);
2. k1 x b grid, tuned on SciFact train (809) / NFCorpus dev (324), reported on test;
3. tokenisation variants at k1 1.2, b 0.75 (stemming, stopwords, single-character tokens);
4. bm25s scoring variants (lucene, robertson, atire, bm25l, bm25+) at the same tokens;
5. BM25F over title and body vs one concatenated field, weights tuned on the tune split.
Output: out/bm25.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re
import numpy as np
import rp
import bm25lab as B

L, PC = rp.L, rp.PC
K1 = [0.2, 0.4, 0.6, 0.9, 1.2, 1.5, 2.0, 3.0, 5.0]
BS = [0.0, 0.2, 0.4, 0.6, 0.75, 0.9, 1.0]
M = ("ndcg_cut.10", "recall.100")
TUNE = {"scifact": "train", "nfcorpus": "dev"}


def ev(run, qr):
    pq = PC.per_query(run, qr, M)
    return {"ndcg10": rp.r4(PC.mean(pq, M[0])), "r100": rp.r4(PC.mean(pq, M[1]))}


def main():
    res = {}
    for ds in ("scifact", "nfcorpus"):
        c, q, qr = L.beir(ds)
        dids = list(c)
        tu, te = sorted(qr[TUNE[ds]]), sorted(qr["test"])
        R = {"n_docs": len(dids), "tune_split": TUNE[ds], "n_tune": len(tu), "n_test": len(te)}
        # ---- default tokens
        dtok = B.tokenize([L.doc_text(c[d]) for d in dids])
        idx = B.Index({"all": dtok})
        qtok = {x: t for x, t in zip(tu + te, B.tokenize([q[x] for x in tu + te]))}
        R["vocab"] = len(idx.vocab)
        R["doc_len_mean"] = round(float(idx.avg["all"]), 1)
        R["doc_len_p10_p90"] = [int(np.percentile(idx.len["all"], 10)), int(np.percentile(idx.len["all"], 90))]
        R["query_len_mean"] = round(float(np.mean([len(qtok[x]) for x in te])), 2)
        ref = L.run(ds, "bm25")
        mine = B.run(idx, [qtok[x] for x in te], te, dids)
        R["check_top10_scores_identical"] = sum([round(v, 4) for v in list(mine[x].values())[:10]] ==
                                                [round(v, 4) for v in list(ref[x].values())[:10] if v > 0][:10] for x in te)
        # ---- grid
        grid = {}
        for k1 in K1:
            for b in BS:
                kw = dict(k1=k1, b=b)
                g = {"tune": ev(B.run(idx, [qtok[x] for x in tu], tu, dids, **kw), qr[TUNE[ds]]),
                     "test": ev(B.run(idx, [qtok[x] for x in te], te, dids, **kw), qr["test"])}
                grid["%g|%g" % (k1, b)] = g
            print(ds, "k1", k1, flush=True)
        R["grid"] = grid
        best_tu = max(grid, key=lambda k: grid[k]["tune"]["ndcg10"])
        best_te = max(grid, key=lambda k: grid[k]["test"]["ndcg10"])
        R["best_on_tune"] = {"k1b": best_tu, **grid[best_tu]}
        R["best_on_test"] = {"k1b": best_te, **grid[best_te]}
        R["default"] = grid["1.2|0.75"]
        # ---- tokenisation variants (k1 1.2, b 0.75, test)
        variants = {"stem+stop (default)": dict(stem=True, stop=True), "no stemming": dict(stem=False, stop=True),
                    "no stopwords": dict(stem=True, stop=False), "neither": dict(stem=False, stop=False),
                    "keep 1-char tokens": dict(stem=True, stop=True, pattern=r"(?u)\b\w+\b")}
        tv = {}
        for name, kw in variants.items():
            ix = B.Index({"all": B.tokenize([L.doc_text(c[d]) for d in dids], **kw)})
            qt = B.tokenize([q[x] for x in te], **kw)
            tv[name] = ev(B.run(ix, qt, te, dids), qr["test"])
            tv[name]["vocab"] = len(ix.vocab)
        R["tokenisation"] = tv
        # how many test queries lose a single-character token (digit or letter) under the default pattern
        one = [x for x in te if re.search(r"(?u)(?<!\w)\w(?!\w)", q[x])]
        R["queries_with_1char_token"] = len(one)
        R["examples_1char"] = [q[x] for x in one[:4]]
        # ---- bm25s variants
        import bm25s
        mv = {}
        qt_list = [qtok[x] for x in te]
        for meth in ("lucene", "robertson", "atire", "bm25l", "bm25+"):
            ret = bm25s.BM25(method=meth, k1=1.2, b=0.75)
            ret.index(dtok, show_progress=False)
            ids_, sc = ret.retrieve(qt_list, k=100, show_progress=False, n_threads=1)
            run = {x: {dids[ids_[i, j]]: float(sc[i, j]) for j in range(ids_.shape[1])} for i, x in enumerate(te)}
            mv[meth] = ev(run, qr["test"])
        R["methods"] = mv
        # ---- BM25F: title and body as separate fields
        ttok = B.tokenize([c[d]["title"] or "" for d in dids])
        btok = B.tokenize([c[d]["text"] or "" for d in dids])
        ixf = B.Index({"title": ttok, "body": btok})
        bf = {}
        for wt in (0.0, 0.5, 1.0, 2.0, 3.0, 5.0):
            for bt in (0.3, 0.75):
                kw = dict(k1=1.2, weights={"title": wt, "body": 1.0}, bf={"title": bt, "body": 0.75})
                bf["%g|%g" % (wt, bt)] = {"tune": ev(B.run(ixf, [qtok[x] for x in tu], tu, dids, **kw), qr[TUNE[ds]]),
                                          "test": ev(B.run(ixf, [qtok[x] for x in te], te, dids, **kw), qr["test"])}
        R["bm25f"] = bf
        bt = max(bf, key=lambda k: bf[k]["tune"]["ndcg10"])
        R["bm25f_best_on_tune"] = {"w_title|b_title": bt, **bf[bt]}
        R["title_len_mean"] = round(float(ixf.avg["title"]), 1)
        R["body_len_mean"] = round(float(ixf.avg["body"]), 1)
        res[ds] = R
        print(ds, "default", R["default"], "best tune", R["best_on_tune"], "tok", tv, "methods", mv, "bm25f", R["bm25f_best_on_tune"], flush=True)
    rp.save("bm25.json", res)


if __name__ == "__main__":
    main()
