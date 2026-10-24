"""Checks that the page embeds exactly the recorded data and that the numbers in the prose match it.
usage: RAG_SCRATCH=... $RAG_SCRATCH/venv/bin/python -I -B check_data.py   (after build_data.py and build.sh)
1. parts/22_rr_data.js parsed back equals the data/*.json files it is built from; index.html carries it verbatim.
2. No @@key@@ or PENDING is left in index.html, and every fact value appears in the page text.
3. A sample of facts is recomputed here by separate code from the shared artefacts (load.py, raw score files,
   stored ColBERT vectors), not from data/*.json.
4. Privacy patterns are absent from everything in this page folder that would be committed."""
import json
import os
import re
import sys

H = os.path.dirname(os.path.abspath(__file__))
D = lambda n: json.load(open(os.path.join(H, "data", n)))
js = open(os.path.join(H, "parts", "22_rr_data.js")).read().strip()
emb = json.loads(js[len("window.RR="):js.rindex(";")])
html = open(os.path.join(H, "..", "index.html")).read()
F = json.load(open(os.path.join(H, "facts.json")))
bad = 0


def ok(c, msg):
    global bad
    print(("ok   " if c else "FAIL ") + msg)
    bad += not c


ok(emb["depth"] == D("depth.json"), "embedded depth sweep equals data/depth.json")
ok(emb["hist"] == D("scores.json")["hist"] and emb["abstain"] == D("scores.json")["abstain"], "embedded score data equal data/scores.json")
ok(emb["ex"] == D("examples.json"), "embedded candidate lists equal data/examples.json")
ok(emb["tokens"] == D("tokens.json")["models"], "embedded token counts equal data/tokens.json")
ok(emb["colbert_rerank"] == D("colbert.json")["rerank"], "embedded ColBERT reranking equals data/colbert.json")
ok({k: v for k, v in emb["plaid"].items()} == {nb: D("plaid.json")["indexes"][nb]["grid"] for nb in ("2", "4")}, "embedded PLAID grid equals data/plaid.json")
mx = D("maxsim_pairs.json")["pairs"]
ok(all(e["sim"] == [[int(round(100 * x)) for x in row] for row in p["sim"]] and e["best"] == p["best"] for e, p in zip(emb["mx"], mx)), "embedded MaxSim matrices equal data/maxsim_pairs.json (x100)")
ok(emb["timings"] == (D("timings.json") if os.path.exists(os.path.join(H, "data", "timings.json")) else {}), "embedded timings equal data/timings.json")
ok(emb["llm"] == (D("llm.json") if os.path.exists(os.path.join(H, "data", "llm.json")) else None), "embedded LLM results equal data/llm.json")
ok(emb["train"] == (D("train.json") if os.path.exists(os.path.join(H, "data", "train.json")) else None), "embedded training runs equal data/train.json")
spr = json.load(open(os.path.join(H, "inputs", "sparse_rp.json")))
ok(emb["sparse"]["ex"] == spr["scifact"]["example_doc"], "embedded SPLADE-style example equals inputs/sparse_rp.json (the Retrieval pipeline page's run)")
ok(js in html, "index.html carries 22_rr_data.js verbatim")
rest = html.replace(js, "")
ok("@@" not in rest, "no unfilled @@key@@ in index.html")
ok("PENDING" not in html, "no PENDING value in index.html")
text = re.sub(r"<[^>]+>", " ", rest).replace("&amp;", "&")
missing = [k for k, v in F.items() if v not in text]
ok(not missing, "every fact value appears in the page text (%d facts)" % len(F) + (": missing " + ", ".join(missing) if missing else ""))

# ---- independent recomputation from the shared artefacts
if os.environ.get("RAG_SCRATCH"):
    sys.path.insert(0, os.path.normpath(os.path.join(H, "..", "..", "src", "data")))
    import load as L
    import numpy as np
    corpus, queries, qrels = L.beir("scifact")
    qt = qrels["test"]
    bm, de = L.run("scifact", "bm25"), L.run("scifact", "qwen3-emb-0.6b")
    ok(F["bm25_ndcg"] == "%.3f" % L.evaluate(bm, qt)["ndcg@10"], "BM25 nDCG@10 from load.py")
    # hybrid RRF k 60 written again here
    hy = {}
    for q in qt:
        s = {}
        for lst in (list(bm[q]), list(de[q])):
            for r, d in enumerate(lst):
                s[d] = s.get(d, 0) + 1 / (61 + r)
        hy[q] = [d for d, _ in sorted(s.items(), key=lambda x: -x[1])[:100]]
    ok(F["hy_ndcg"] == "%.3f" % L.evaluate({q: {d: 100 - i for i, d in enumerate(hy[q])} for q in qt}, qt)["ndcg@10"], "hybrid nDCG@10 recomputed")
    S = L.rerank_scores("scifact", "ce-minilm-l6")
    run = {}
    for q in qt:
        head = sorted(hy[q][:100], key=lambda d: -S[q][d])
        run[q] = {d: 100 - i for i, d in enumerate(head)}
    ok(F["hy_ce100"] == "%.3f" % L.evaluate(run, qt)["ndcg@10"], "MiniLM CE on the hybrid top 100 recomputed from the raw score file")
    p = L.path("data", "colbert", "scifact")
    off = np.load(os.path.join(p, "doc_offsets.npy"))
    ok(F["cb_ntok"] == "{:,}".format(int(off[-1])), "ColBERT token vectors counted from the stored offsets")
    ok(F["cb_bytes_doc"] == "{:,}".format(int(round(off[-1] * 96 * 2 / 5183))), "ColBERT bytes per abstract")
    from sklearn.metrics import roc_auc_score
    ab = D("scores.json")["abstain"]
    # top cosine with and without the relevant abstracts, recomputed with sklearn
    ids, X = L.embeddings("scifact", "qwen3-emb-0.6b"); qi, Q = L.embeddings("scifact", "qwen3-emb-0.6b", "queries")
    X = np.asarray(X); pos = {d: i for i, d in enumerate(ids)}; qp = {q: i for i, q in enumerate(qi)}
    ya, sa = [], []
    for q in sorted(qt):
        pool = list(dict.fromkeys(list(bm[q])[:30] + list(de[q])[:30]))
        c = {d: float(X[pos[d]] @ np.asarray(Q[qp[q]])) for d in pool}
        if any(d in qt[q] for d in pool):
            ya.append(1); sa.append(max(c.values()))
        ya.append(0); sa.append(max(v for d, v in c.items() if d not in qt[q]))
    ok(F["abst_cos"] == "%.2f" % roc_auc_score(ya, sa), "abstention AUROC of the top cosine recomputed with scikit-learn")
    tk = D("tokens.json")["models"]
    ok(F["ce_all_s"] == str(round(5183 / tk["ce-minilm-l6"]["pairs_per_s_measured"])), "cross-encoding the whole corpus, seconds")
else:
    print("skip independent recomputation (set RAG_SCRATCH)")

# ---- privacy over every file that would be committed
priv = ["/Us" + "ers/", "Us" + "ers-", "glp" + "at", "sk-" + "ant", "/private/" + "tmp", "claude-" + "502"] + ([os.environ["USER"]] if os.environ.get("USER") else [])
page = os.path.normpath(os.path.join(H, ".."))
hits = []
for a, dirs, fs in os.walk(page):
    dirs[:] = [x for x in dirs if x not in (".shots", "__pycache__")]
    for f in fs:
        t = open(os.path.join(a, f), errors="ignore").read()
        for k in priv:
            if k in t:
                hits.append((os.path.relpath(os.path.join(a, f), page), "pattern %d" % priv.index(k)))
        if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.(com|org|net|ai|io|uk)\b", t):
            hits.append((os.path.relpath(os.path.join(a, f), page), "e-mail"))
ok(not hits, "privacy: no private pattern in the page folder" + (": " + str(hits[:5]) if hits else ""))
print("FAIL" if bad else "OK", bad)
raise SystemExit(1 if bad else 0)
