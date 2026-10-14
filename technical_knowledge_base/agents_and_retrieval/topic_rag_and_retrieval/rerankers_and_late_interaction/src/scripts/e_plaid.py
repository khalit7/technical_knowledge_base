"""PLAID (fast-plaid 1.4.6 via its own API, colenv) over the setup's stored ColBERT token vectors of SciFact:
index size per token at nbits 2 and 4, and quality against exhaustive MaxSim as the two search knobs move
(n_ivf_probe: centroids probed per query token; n_full_scores: candidates whose compressed vectors are decompressed
and scored with full MaxSim). Deterministic (seed 42, no triton, CPU); no timing (at 5,183 abstracts exhaustive MaxSim is already fast; see viz_ideas.md).
usage: colenv/bin/python -I -B e_plaid.py
Output: data/plaid.json; indexes in $RAG_SCRATCH/rr/plaid/"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shutil
import time
import numpy as np
import torch
from rrlib import L, DS, r3, save, work

PROBES = [1, 2, 4, 8, 32]
FULL = [32, 256, 1024, 4096]


def dir_bytes(p):
    return sum(os.path.getsize(os.path.join(a, f)) for a, _, fs in os.walk(p) for f in fs)


def main():
    torch.set_num_threads(2)
    from fast_plaid import search as fps
    corpus, queries, qrels = L.beir(DS)
    qt = qrels["test"]
    p = L.path("data", "colbert", DS)
    D = np.load(os.path.join(p, "doc_tokens.npy"))
    off = np.load(os.path.join(p, "doc_offsets.npy"))
    Qv = np.load(os.path.join(p, "query_tokens.npy"))
    qoff = np.load(os.path.join(p, "query_offsets.npy"))
    dids = open(os.path.join(p, "doc_ids.txt")).read().split("\n")
    qids = open(os.path.join(p, "query_ids.txt")).read().split("\n")
    docs = [torch.from_numpy(D[off[i]:off[i + 1]].astype(np.float32)) for i in range(len(dids))]
    Q = torch.from_numpy(Qv.astype(np.float32)).reshape(len(qids), -1, Qv.shape[1])
    ref = L.run(DS, "colbert-small")
    out = {"n_tokens": int(D.shape[0]), "dim": int(D.shape[1]), "raw_fp16_bytes": int(D.shape[0] * D.shape[1] * 2),
           "fast_plaid": "1.4.6.2110", "indexes": {}}
    for nbits in (2, 4):
        ip = work("plaid", "scifact_nb%d" % nbits)
        build_s = None
        if not os.path.exists(os.path.join(ip, "metadata.json")):
            if os.path.exists(ip):
                shutil.rmtree(ip)
            idx = fps.FastPlaid(index=ip, device="cpu")
            t0 = time.perf_counter()
            idx.create(documents_embeddings=docs, kmeans_niters=4, max_points_per_centroid=256, nbits=nbits, seed=42,
                       use_triton_kmeans=False)
            build_s = round(time.perf_counter() - t0, 1)
        idx = fps.FastPlaid(index=ip, device="cpu")
        files = {f: os.path.getsize(os.path.join(ip, f)) for f in sorted(os.listdir(ip)) if os.path.isfile(os.path.join(ip, f))}
        size = dir_bytes(ip)
        cent = None
        for f in files:
            if "centroid" in f and f.endswith(".npy"):
                cent = np.load(os.path.join(ip, f), mmap_mode="r").shape
        rec = {"bytes": size, "bytes_per_token": r3(size / D.shape[0]), "files": files, "centroids_shape": list(cent) if cent else None,
               "build_s_untimed": build_s, "grid": []}
        print("nbits", nbits, "bytes", size, "per token", rec["bytes_per_token"], "centroids", cent, "build", build_s, "s", flush=True)
        for pr in PROBES:
            for fs in FULL:
                res = idx.search(queries_embeddings=Q, top_k=100, n_ivf_probe=pr, n_full_scores=fs, show_progress=False)
                run = {q: {dids[j]: float(s) for j, s in r} for q, r in zip(qids, res)}
                ev = L.evaluate(run, qt, ("ndcg_cut_10", "recall_100"))
                ov = np.mean([len(set(list(run[q])[:10]) & set(list(ref[q])[:10])) / 10 for q in qids])
                rec["grid"].append({"probe": pr, "full": fs, "ndcg10": r3(ev["ndcg@10"]), "r100": r3(ev["recall@100"]), "top10_overlap": r3(ov)})
                print(" probe", pr, "full", fs, rec["grid"][-1], flush=True)
        out["indexes"][str(nbits)] = rec
    out["exhaustive"] = {k: r3(v) for k, v in L.evaluate(ref, qt, ("ndcg_cut_10", "recall_100")).items()}
    save("plaid.json", out)


if __name__ == "__main__":
    main()
