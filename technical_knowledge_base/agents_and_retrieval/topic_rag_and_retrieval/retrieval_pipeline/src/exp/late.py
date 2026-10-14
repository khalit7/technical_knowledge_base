"""Late chunking (Guenther et al., arXiv 2409.04701) on QASPER, measured here with a long-context mean-pooling
embedder: nomic-ai/modernbert-embed-base (ModernBERT, 149 M, 8,192 tokens, mean pooling, Apache 2.0; revision in
SETUP.md). MPS: hold the bench lock.
naive  each chunk embedded on its own ("search_document: " + chunk text), the model's own sentence-transformers
       pipeline (mean pooling, normalise);
late   the whole paper ("search_document: " + text) through the model once; each chunk's vector = mean of the
       token vectors whose characters fall inside the chunk span (prefix and special tokens excluded), normalised.
       Papers longer than 8,192 tokens: macro chunks of 8,192 tokens overlapping by 512 (the paper's "long late
       chunking"; the overlap's first copy is kept).
Chunks: the root's fixed-256-32 and structure-256 files. Queries: "search_query: " + question.
Scored with the root's within-paper metric (chunk_eval.score: top k and token budgets).
Output: out/late.json; vectors in $RAG_SCRATCH/rp/late/."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
import numpy as np
import rp

L = rp.L
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import chunk_eval as CE  # noqa: E402

MD = L.path("models", "modernbert-embed-base")
STRATS = ["fixed-256-32", "structure-256"]
MAXLEN, OVER = 8192, 512


def main():
    import torch
    from sentence_transformers import SentenceTransformer
    from transformers import AutoTokenizer
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    st = SentenceTransformer(MD, device=dev)
    st.max_seq_length = MAXLEN
    tok = AutoTokenizer.from_pretrained(MD)
    hf = st[0].auto_model
    docs, qs = L.longdoc(); text = {d["paper_id"]: d["text"] for d in docs}
    W = rp.work("late")
    timing = {}
    la0 = os.getloadavg()
    # queries
    qp = os.path.join(W, "questions.npy")
    if not os.path.exists(qp):
        QV = st.encode(["search_query: " + q["question"] for q in qs], batch_size=64, normalize_embeddings=True)
        np.save(qp, QV.astype(np.float32))
    QV = np.load(qp); qpos = {q["qid"]: i for i, q in enumerate(qs)}
    res = {"model": "nomic-ai/modernbert-embed-base", "strategies": {}}
    for s in STRATS:
        rows = [json.loads(l) for l in open(L.path("pipe", "chunks", s + ".jsonl"))]
        # ---- naive
        npth = os.path.join(W, s + ".naive.npy")
        if not os.path.exists(npth):
            t0 = time.perf_counter()
            V = st.encode(["search_document: " + text[r["paper_id"]][r["start"]:r["end"]] for r in rows], batch_size=32, normalize_embeddings=True)
            np.save(npth, V.astype(np.float32)); timing[s + " naive"] = round(time.perf_counter() - t0, 1)
        # ---- late
        lpth = os.path.join(W, s + ".late.npy")
        if not os.path.exists(lpth):
            t0 = time.perf_counter()
            by = {}
            for i, r in enumerate(rows):
                by.setdefault(r["paper_id"], []).append(i)
            V = np.zeros((len(rows), hf.config.hidden_size), dtype=np.float32)
            nlong = 0
            for d in docs:
                pid = d["paper_id"]
                pre = "search_document: "
                enc = tok(pre + text[pid], return_offsets_mapping=True, add_special_tokens=True)
                ids = enc["input_ids"]; off = enc["offset_mapping"]
                n = len(ids)
                H = np.zeros((n, hf.config.hidden_size), dtype=np.float32)
                if n <= MAXLEN:
                    spans = [(0, n, 0)]
                else:
                    nlong += 1
                    spans, a = [], 0
                    while True:
                        b = min(a + MAXLEN, n)
                        spans.append((a, b, 0 if a == 0 else OVER))
                        if b == n:
                            break
                        a = b - OVER
                with torch.no_grad():
                    for a, b, skip in spans:
                        x = torch.tensor([ids[a:b]], device=dev)
                        h = hf(input_ids=x, attention_mask=torch.ones_like(x)).last_hidden_state[0].float().cpu().numpy()
                        H[a + skip:b] = h[skip:]
                starts = np.array([o[0] - len(pre) for o in off]); ends = np.array([o[1] - len(pre) for o in off])
                special = np.array([o[1] == o[0] for o in off])
                for i in by[pid]:
                    r = rows[i]
                    m = (starts >= r["start"]) & (ends <= r["end"]) & ~special & (starts >= 0)
                    if not m.any():
                        m = (ends > r["start"]) & (starts < r["end"]) & ~special
                    v = H[m].mean(axis=0)
                    V[i] = v / (np.linalg.norm(v) + 1e-12)
            np.save(lpth, V); timing[s + " late"] = round(time.perf_counter() - t0, 1); timing["papers_over_8192"] = nlong
        # ---- score
        by = {}
        for i, r in enumerate(rows):
            r["_i"] = i
            by.setdefault(r["paper_id"], []).append(r)
        R = {}
        for mode in ("naive", "late"):
            V = np.load(os.path.join(W, "%s.%s.npy" % (s, mode)))
            ranks = {}
            for q in qs:
                cs = by[q["paper_id"]]
                sc = V[[c["_i"] for c in cs]] @ QV[qpos[q["qid"]]]
                ranks[q["qid"]] = [cs[j] for j in np.argsort(-sc, kind="stable")]
            R[mode] = CE.score(ranks, qs)
        res["strategies"][s] = R
        print(s, R, flush=True)
    res["timing_s"] = timing
    res["loadavg_before_after"] = [[round(x, 2) for x in la0], [round(x, 2) for x in os.getloadavg()]]
    res["when"] = time.strftime("%Y-%m-%d %H:%M")
    prev = rp.load_out("late.json")
    if prev.get("timing_s"):
        res["timing_s"] = {**prev["timing_s"], **timing}
    rp.save("late.json", res)


if __name__ == "__main__":
    main()
