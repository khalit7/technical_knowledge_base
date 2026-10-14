"""Score the generator's query rewrites from qgen.py (encoders on MPS for a few hundred short texts: hold the bench
lock briefly, or pass --cpu). Deterministic given qgen.json.
1. step-back on SciFact: original, step-back alone, RRF(original, step-back); BM25, bge-small, Qwen3-Emb.
2. decomposition on HotpotQA (200, by bridge / comparison): the question alone vs RRF over the sub-questions
   (and the question): both gold paragraphs in the top k; bge-small and BM25.
3. self-query on QASPER (300 constructed requests, 100 per kind): extraction accuracy (year, month, title resolved to
   the right paper by word overlap), and retrieval over ALL 6,463 default chunks of all 281 papers (bge-small):
   the raw request as the query, no filter / the extracted filter applied inside the search (pre-filter) /
   the oracle filter (the right paper); hit = the root's metric (top chunks within 1,024 tokens cover >= 90% of an
   evidence paragraph).
Output: out/qrewrite.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re
import numpy as np
import rp
import bm25lab as B
from fusion_deep import fuse

L, PC = rp.L, rp.PC
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import chunk_eval as CE  # noqa: E402

DEV = "cpu" if "--cpu" in sys.argv else None


def enc(model, texts, task, query=True):
    e = L.encoder(model, device=DEV)
    return e.encode(texts, prompt=L.query_prefix(model, task) if query else None, normalize_embeddings=True, batch_size=32)


def dense_top(ids, X, v, k=100):
    s = X @ v
    t = np.argpartition(-s, k)[:k]
    t = t[np.argsort(-s[t])]
    return {ids[j]: float(s[j]) for j in t}


def rrf_many(lists, k=60):
    out = {}
    for l in lists:
        for r, d in enumerate(l):
            out[d] = out.get(d, 0) + 1 / (k + r + 1)
    return rp.top(out)


def main():
    G = json.load(open(rp.work("qgen.json")))
    res = {"cost": G["cost"]}
    # ---- 1. step-back, SciFact
    c, q, qr = L.beir("scifact"); te = sorted(qr["test"]); dids = list(c)
    sb = {x: G["step_back"][x].strip().split("\n")[0] for x in te}
    idx = B.Index({"all": B.tokenize([L.doc_text(c[d]) for d in dids])})
    R1 = {}
    tb = B.tokenize([sb[x] for x in te])
    runs = {"bm25": {"original": L.run("scifact", "bm25"), "step-back": B.run(idx, tb, te, dids)}}
    for m in ("bge-small", "qwen3-emb-0.6b"):
        ids, X = L.embeddings("scifact", m); X = np.asarray(X)
        V = enc(m, [sb[x] for x in te], "scifact")
        runs[m] = {"original": L.run("scifact", m), "step-back": {x: dense_top(ids, X, V[i]) for i, x in enumerate(te)}}
    for m, rr in runs.items():
        rr["original + step-back (RRF)"] = {x: rrf_many([list(rr["original"][x]), list(rr["step-back"][x])]) for x in te}
        R1[m] = {k: rp.summ(PC.per_query(v, qr["test"], rp.M3)) for k, v in rr.items()}
    res["step_back"] = R1
    res["step_back_examples"] = [{"claim": q[x], "step_back": sb[x]} for x in te[:6]]
    print("step-back", R1, flush=True)
    # ---- 2. decomposition, HotpotQA
    hq, hc = L.multihop()
    pids = [p["pid"] for p in hc]
    subs = {}
    for x in hq:
        lines = [re.sub(r"^\s*(\d+[.)]|[-*])\s*", "", l).strip() for l in G["decomp"][x["qid"]].split("\n")]
        subs[x["qid"]] = [l for l in lines if len(l) > 8][:3] or [x["question"]]
    hidx = B.Index({"all": B.tokenize([p["title"] + " " + p["text"] for p in hc])})
    R2 = {"n_subq_mean": rp.r3(np.mean([len(v) for v in subs.values()]))}
    ids, X = L.embeddings("hotpotqa", "bge-small"); X = np.asarray(X)
    qids, QX = L.embeddings("hotpotqa", "bge-small", "queries"); qpos = {a: i for i, a in enumerate(qids)}
    flat = [s for x in hq for s in subs[x["qid"]]]
    SV = enc("bge-small", flat, "hotpotqa"); si = 0; sv = {}
    for x in hq:
        sv[x["qid"]] = SV[si:si + len(subs[x["qid"]])]; si += len(subs[x["qid"]])
    for m in ("bm25", "bge-small"):
        for mode in ("question", "sub-questions + question (RRF)"):
            cnt = {"bridge": {2: 0, 5: 0, 10: 0}, "comparison": {2: 0, 5: 0, 10: 0}}
            for x in hq:
                if m == "bm25":
                    base = B.run(hidx, B.tokenize([x["question"]]), [x["qid"]], pids)[x["qid"]]
                    lists = [list(base)] + ([list(B.run(hidx, B.tokenize([s]), ["s"], pids)["s"]) for s in subs[x["qid"]]] if mode != "question" else [])
                else:
                    base = dense_top(ids, X, np.asarray(QX[qpos[x["qid"]]]))
                    lists = [list(base)] + ([list(dense_top(ids, X, v)) for v in sv[x["qid"]]] if mode != "question" else [])
                got = list(rrf_many(lists)) if len(lists) > 1 else lists[0]
                for k in (2, 5, 10):
                    cnt[x["type"]][k] += all(g in got[:k] for g in x["gold_pids"])
            R2["%s | %s" % (m, mode)] = cnt
    R2["n_by_type"] = {t: sum(x["type"] == t for x in hq) for t in ("bridge", "comparison")}
    R2["examples"] = [{"question": x["question"], "type": x["type"], "subs": subs[x["qid"]]} for x in hq[:8]]
    res["decomp"] = R2
    print("decomp", {k: v for k, v in R2.items() if k != "examples"}, flush=True)
    # ---- 3. self-query
    docs, qs = L.longdoc(); qd = {a["qid"]: a for a in qs}
    title = {d["paper_id"]: d["title"] for d in docs}
    S = G["selfq"]
    words = lambda s: set(re.findall(r"[a-z0-9]+", (s or "").lower()))
    from qgen import MONTHS
    invented = {"month_invented_in_year_requests": 0, "title_invented_in_non_title_requests": 0}
    for a in S["queries"]:
        m_ = re.search(r"\{.*\}", S["out"][a["qid"]], re.S)
        try:
            j_ = json.loads(m_.group(0)) if m_ else {}
        except Exception:
            j_ = {}
        if a["kind"] == "year" and j_.get("month") not in (None, "null"):
            invented["month_invented_in_year_requests"] += 1
        if a["kind"] != "title" and j_.get("title") not in (None, "null", ""):
            invented["title_invented_in_non_title_requests"] += 1
    def toint(v):
        try:
            return int(v)
        except Exception:
            return None

    def extract(validate):
        """the generator's JSON -> allowed papers; validate = keep a field only if the request itself states it"""
        ext, acc, parsed_ok = {}, {"title": [0, 0], "month_year": [0, 0], "year": [0, 0]}, 0
        for a in S["queries"]:
            m = re.search(r"\{.*\}", S["out"][a["qid"]], re.S)
            try:
                j = json.loads(m.group(0)) if m else {}
                parsed_ok += bool(m)
            except Exception:
                j = {}
            y, mo, ti = toint(j.get("year")), toint(j.get("month")), j.get("title")
            if validate:
                low = a["text"].lower()
                if y and str(y) not in a["text"]:
                    y = None
                if mo and not (1 <= mo <= 12 and MONTHS[mo - 1].lower() in low):
                    mo = None
                if ti and len(words(ti) & words(a["text"])) < 0.5 * max(1, len(words(ti))):
                    ti = None
            papers = set(title)
            if y:
                papers = {p for p in papers if 2000 + int(p[:2]) == y}
            if mo:
                papers = {p for p in papers if int(p[2:4]) == mo}
            if ti:
                tw = words(ti)
                sc = {p: len(tw & words(title[p])) / max(1, len(tw | words(title[p]))) for p in papers}
                best = max(sc.values()) if sc else 0
                papers = {p for p, s_ in sc.items() if s_ == best and s_ >= 0.3} or papers
            ext[a["qid"]] = {"papers": sorted(papers), "query": j.get("query") or a["text"]}
            ok = a["paper_id"] in papers and (a["kind"] != "title" or len(papers) == 1)
            acc[a["kind"]][0] += 1; acc[a["kind"]][1] += ok
        return ext, acc, parsed_ok

    ext, acc, parsed_ok = extract(False)
    extv, accv, _ = extract(True)
    rows = [json.loads(l) for l in open(L.path("pipe", "chunks", "fixed-256-32.jsonl"))]
    V = np.load(L.path("pipe", "chunks", "fixed-256-32.bge-small.npy"))
    for i, r in enumerate(rows):
        r["_i"] = i
    QV = enc("bge-small", [a["text"] for a in S["queries"]], "qasper")
    QV2 = enc("bge-small", [ext[a["qid"]]["query"] for a in S["queries"]], "qasper")
    R3 = {"n": len(S["queries"]), "json_parsed": parsed_ok, **invented,
          "filter_correct": {k: {"n": v[0], "right_paper_kept": v[1]} for k, v in acc.items()},
          "filter_correct_validated": {k: {"n": v[0], "right_paper_kept": v[1]} for k, v in accv.items()},
          "allowed_papers_median": {k: int(np.median([len(ext[a["qid"]]["papers"]) for a in S["queries"] if a["kind"] == k])) for k in acc}}
    modes = {}
    for mode in ("no filter", "extracted filter", "extracted filter, validated", "extracted filter + rewritten query", "oracle filter (right paper)"):
        hits = {"title": 0, "month_year": 0, "year": 0}
        for i, a in enumerate(S["queries"]):
            if mode == "no filter":
                allowed = None
            elif mode == "extracted filter, validated":
                allowed = set(extv[a["qid"]]["papers"])
            elif mode.startswith("extracted"):
                allowed = set(ext[a["qid"]]["papers"])
            else:
                allowed = {a["paper_id"]}
            cand = rows if allowed is None else [r for r in rows if r["paper_id"] in allowed]
            qv = QV2[i] if mode.endswith("rewritten query") else QV[i]
            s_ = V[[r["_i"] for r in cand]] @ qv
            ranked = [cand[j] for j in np.argsort(-s_, kind="stable")]
            hits[a["kind"]] += CE.hit(CE.by_budget(ranked, 1024), qd[a["qid"]])
        modes[mode] = hits
    R3["hit_at_1024_tokens"] = modes
    R3["examples"] = [{"kind": a["kind"], "text": a["text"], "extracted": S["out"][a["qid"]][:300], "allowed_papers": len(ext[a["qid"]]["papers"])} for a in S["queries"][:6]]
    res["selfq"] = R3
    print("selfq", {k: v for k, v in R3.items() if k != "examples"}, flush=True)
    rp.save("qrewrite.json", res)


if __name__ == "__main__":
    main()
