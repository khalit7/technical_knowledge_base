"""Build the page's embedded data: ../parts/22_rp_data.js (window.RPD) from out/*.json and the running example.
CPU only (a few dozen short texts are embedded with bge-small on CPU for the query-rewrite lab).
usage: python -I -B make_data.py"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re
import numpy as np
import rp

L, PC = rp.L, rp.PC
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
PARTS = os.path.normpath(os.path.join(rp.HERE, "..", "parts"))
WB_PAPERS = ["1910.06592", "2002.01320"]


def short(s, n=90):
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + "…"


def delta(a):
    out, p = [], 0
    for x in a:
        out.append(x - p); p = x
    return out


def workbench():
    from transformers import AutoTokenizer
    tok = AutoTokenizer.from_pretrained(L.path("models", "Qwen3-Embedding-0.6B"))
    docs, qs = L.longdoc()
    out = []
    for pid in WB_PAPERS:
        d = next(x for x in docs if x["paper_id"] == pid)
        enc = tok(d["text"], add_special_tokens=False, return_offsets_mapping=True)
        st = [o[0] for o in enc["offset_mapping"]]; en = [o[1] for o in enc["offset_mapping"]]
        mine = [q for q in qs if q["paper_id"] == pid]
        out.append({"id": pid, "title": d["title"], "text": d["text"], "ts": delta(st), "te": delta(en),
                    "paras": [[p["start"], p["end"], p["section"]] for p in d["paragraphs"]],
                    "qs": [{"q": q["question"], "ev": [[e["start"], e["end"]] for e in q["evidence"]],
                            "a": short(" / ".join(a["text"] for a in q["answers"][:2]), 160)} for q in mine]})
    return out


def fusion_lab():
    R = {}
    for ds, n in (("scifact", 8), ("nfcorpus", 5)):
        c, q, qr = L.beir(ds)
        te = sorted(qr["test"])
        bm = L.run(ds, "bm25"); de = L.run(ds, "qwen3-emb-0.6b")
        from fusion_deep import fuse
        # pick queries where the methods disagree most about the first relevant document's rank
        def rank1(run):
            for i, d in enumerate(run):
                if qr["test"][x].get(d, 0) > 0:
                    return i + 1
            return 101
        cand = []
        for x in te:
            r = {m: rank1(list(rp.top(fuse(dict(list(bm[x].items())[:20]), dict(list(de[x].items())[:20]), m, p)))) for m, p in (("rrf", 60), ("zscore", 0.6), ("raw", 0.5))}
            rb, rd = rank1(list(bm[x])), rank1(list(de[x]))
            if min(rb, rd) <= 20:
                cand.append((max(r.values()) - min(r.values()) + abs(rb - rd) * 0.2, x))
        cand.sort(reverse=True)
        pick = [x for _, x in cand[:n]]
        Q, titles = [], {}
        for x in pick:
            b = list(bm[x].items())[:20]; d = list(de[x].items())[:20]
            for doc, _ in b + d:
                titles[doc] = short(c[doc]["title"] or c[doc]["text"], 80)
            Q.append({"id": x, "q": q[x], "bm": [[a, round(s, 3)] for a, s in b], "de": [[a, round(s, 4)] for a, s in d],
                      "rel": {k: v for k, v in qr["test"][x].items()}})
        R[ds] = {"queries": Q, "titles": titles}
    F = rp.load_out("fusion_deep.json")
    agg = {}
    for ds in F:
        agg[ds] = {"bm25": F[ds]["bm25"]["ndcg10"], "models": {m: {"single": v["single"]["ndcg10"],
                   "methods": {k: {"best": w["best_on_tune"], "test": w["test"]["ndcg10"], "curve": w["curve_test"]} for k, w in v["methods"].items()}}
                   for m, v in F[ds]["models"].items()}}
    R["agg"] = agg
    return R


def rewrite_lab():
    G = json.load(open(L.path("pipe", "qtrans_gen.json")))
    c, q, qr = L.beir("scifact")
    te = sorted(qr["test"])
    qg = json.load(open(rp.work("qgen.json"))) if os.path.exists(rp.work("qgen.json")) else None
    ids, X = L.embeddings("scifact", "bge-small"); X = np.asarray(X)
    qall, Qm = L.embeddings("scifact", "bge-small", "queries"); pos = {a: i for i, a in enumerate(qall)}
    # claims where at least one rewrite moves the relevant abstract by 3+ ranks (either way), first 10
    enc = L.encoder("bge-small", device="cpu")
    pref = L.query_prefix("bge-small", "scifact")

    def top(v, k=10):
        s = X @ v
        t = np.argsort(-s)[:k]
        return [[ids[j], round(float(s[j]), 3)] for j in t]
    pool = [x for x in te if G["hyde"].get(x)][:120]
    H = enc.encode([G["hyde"][x] for x in pool], normalize_embeddings=True, batch_size=16)
    rows = []
    for i, x in enumerate(pool):
        qv = np.asarray(Qm[pos[x]])
        hq = H[i] + qv; hq /= np.linalg.norm(hq)
        lists = {"original": top(qv), "HyDE passage": top(H[i]), "HyDE + claim": top(hq)}
        rel = qr["test"][x]
        def rk(l):
            for j, (d, _) in enumerate(l):
                if d in rel:
                    return j + 1
            return 11
        moved = max(abs(rk(l) - rk(lists["original"])) for l in lists.values())
        rows.append((moved, x, lists))
    rows.sort(key=lambda r: -r[0])
    chosen = rows[:10]
    titles = {}
    out = []
    for _, x, lists in chosen:
        mqv = enc.encode(G["mq"][x], prompt=pref, normalize_embeddings=True) if G["mq"][x] else []
        from fusion_deep import fuse
        base = {d: s for d, s in top(np.asarray(Qm[pos[x]]), 100)}
        fused = {}
        for l in [list(base)] + [[d for d, _ in top(v, 100)] for v in mqv]:
            for r_, d in enumerate(l):
                fused[d] = fused.get(d, 0) + 1 / (60 + r_ + 1)
        lists["multi-query (RRF)"] = [[d, round(s, 4)] for d, s in sorted(fused.items(), key=lambda z: -z[1])[:10]]
        texts = {"HyDE passage": G["hyde"][x], "multi-query (RRF)": "\n".join(G["mq"][x])}
        if qg:
            sb = qg["step_back"][x].strip().split("\n")[0]
            sv = enc.encode([sb], prompt=pref, normalize_embeddings=True)[0]
            lists["step-back"] = top(sv)
            texts["step-back"] = sb
        for l in lists.values():
            for d, _ in l:
                titles[d] = short(c[d]["title"] or c[d]["text"], 80)
        out.append({"id": x, "q": q[x], "lists": lists, "texts": {k: short(v, 700) for k, v in texts.items()}, "rel": list(qr["test"][x])})
    conv = G["conv"]
    QT = json.load(open(os.path.join(rp.PIPE_OUT, "qtrans.json")))
    convr = {r["qid"]: r for r in QT["bge-small"]["conv"]}
    for cv in conv:
        cv["ranks_bge"] = convr.get(cv["qid"])
    R = {"claims": out, "titles": titles, "conv": conv}
    if qg:
        Q2 = rp.load_out("qrewrite.json")
        R["decomp"] = Q2.get("decomp", {}).get("examples", [])
    return R


def main():
    D = {"wb": workbench(), "fu": fusion_lab(), "qr": rewrite_lab()}
    for name in ("bm25", "bm25_example", "score_ranges", "chunk_internals", "chunking_rp", "parent_child", "mmr", "router", "mixed", "late", "sparse", "qrewrite", "prompt_asm"):
        D[name] = rp.load_out(name + ".json")
    for k in ("grid",):
        pass
    D["root_chunking"] = json.load(open(os.path.join(rp.PIPE_OUT, "chunking.json")))
    D["root_filter"] = json.load(open(os.path.join(rp.PIPE_OUT, "filter.json")))
    D["root_qtrans"] = json.load(open(os.path.join(rp.PIPE_OUT, "qtrans.json")))
    D["fd"] = {ds: {"bm25": v["bm25"], "margin_bm25": v["margin_bm25"], "three": v["three_lists_rrf60"], "two_dense": v["two_dense_rrf60"],
                    "agree": {m: w["agreement"] for m, w in v["models"].items()}, "margin_dense": {m: w["margin_dense"] for m, w in v["models"].items()},
                    "ftr": v.get("fuse_then_rerank")} for ds, v in rp.load_out("fusion_deep.json").items()}
    s = json.dumps(D, separators=(",", ":"), ensure_ascii=False)
    # the knowledge base uses no em dashes; source texts that contain one get a hyphen (same length, so character offsets hold)
    s = s.replace("\u2014", "-")
    with open(os.path.join(PARTS, "22_rp_data.js"), "w") as f:
        f.write("window.RPD=" + s + ";\n")
    print("22_rp_data.js", len(s.encode()), "bytes")


if __name__ == "__main__":
    main()
