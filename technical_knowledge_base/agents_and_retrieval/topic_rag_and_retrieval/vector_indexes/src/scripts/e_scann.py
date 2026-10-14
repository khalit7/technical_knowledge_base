"""ScaNN 1.4.2 (linux aarch64 wheel) inside a python:3.9-slim container: anisotropic vs isotropic quantization at the
same code size, with and without the exact re-ordering step. Deterministic recall only (no timing: a container on a
shared laptop). Two stages:
  host:       $RAG_SCRATCH/venv/bin/python -I -B e_scann.py export     (writes X, Q, GT .npy into $RAG_SCRATCH/vix/scann/data)
  container:  docker run --rm --name vix-scann -v $RAG_SCRATCH/vix/scann:/w -v <this folder>:/s:ro -e PYTHONPATH=/w/pkgs39 \
                python:3.9-slim python /s/e_scann.py run /w          (writes /w/scann.json)
  host:       copy into out/ with: e_scann.py collect"""
import json
import os
import sys

import numpy as np

if sys.argv[1] == "export":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import vixlib as V
    d = os.path.join(V.WORK, "scann", "data"); os.makedirs(d, exist_ok=True)
    X, Q, *_ = V.beir_set("scifact", "qwen3-emb-0.6b")
    GT, _ = V.exact_topk(X, Q)
    np.save(os.path.join(d, "scifact_X.npy"), X); np.save(os.path.join(d, "scifact_Q.npy"), Q); np.save(os.path.join(d, "scifact_GT.npy"), GT)
    X, Q, _, _ = V.all4_set()
    GT, _ = V.exact_topk(X, Q)
    np.save(os.path.join(d, "all4_X.npy"), X); np.save(os.path.join(d, "all4_Q.npy"), Q); np.save(os.path.join(d, "all4_GT.npy"), GT)
    print("exported")
elif sys.argv[1] == "collect":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import vixlib as V
    V.save("scann", json.load(open(os.path.join(V.WORK, "scann", "scann.json"))))
else:
    sys.path.insert(0, "/w/pkgs39")
    import scann
    W = sys.argv[2]
    out = {"scann": "1.4.2", "image": "python:3.9-slim (linux/arm64)", "sets": {}}

    def rec(I, GT):
        return round(float(np.mean([len(set(a[:10]) & set(g[:10])) / 10 for a, g in zip(I, GT)])), 4)
    for s in ("scifact", "all4"):
        X = np.load(f"{W}/data/{s}_X.npy"); Q = np.load(f"{W}/data/{s}_Q.npy"); GT = np.load(f"{W}/data/{s}_GT.npy")
        n, d = X.shape
        leaves = int(round(np.sqrt(n)))
        rows = []
        # dims_per_block 2 with 16 centres per block = 4 bits per 2 dims = 2 bits per dimension: 256 bytes for 1,024-d
        for dpb in (2, 4, 8):
            for thr in (0.2, float("nan")):
                for reorder in (0, 100):
                    b = scann.scann_ops_pybind.builder(X, 10, "dot_product").score_ah(dpb, anisotropic_quantization_threshold=thr)
                    if reorder:
                        b = b.reorder(reorder)
                    srch = b.build()
                    I, _ = srch.search_batched(Q, final_num_neighbors=10)
                    rows.append({"tree": None, "dims_per_block": dpb, "code_bytes": d // dpb // 2, "anisotropic": thr == thr,
                                 "threshold": 0.2 if thr == thr else None, "reorder": reorder, "recall10": rec(I, GT)})
                    print(s, rows[-1], flush=True)
        # the README's recommended shape: a partitioning tree, AH scoring, then exact re-ordering
        for nls in (2, 4, 8, 16, 32):
            for thr in (0.2, float("nan")):
                srch = (scann.scann_ops_pybind.builder(X, 10, "dot_product")
                        .tree(num_leaves=leaves, num_leaves_to_search=nls, training_sample_size=n)
                        .score_ah(2, anisotropic_quantization_threshold=thr).reorder(100).build())
                I, _ = srch.search_batched(Q, final_num_neighbors=10)
                rows.append({"tree": leaves, "leaves_to_search": nls, "dims_per_block": 2, "code_bytes": d // 4,
                             "anisotropic": thr == thr, "threshold": 0.2 if thr == thr else None, "reorder": 100, "recall10": rec(I, GT)})
                print(s, rows[-1], flush=True)
        out["sets"][s] = {"n": n, "d": d, "rows": rows}
    json.dump(out, open(f"{W}/scann.json", "w"), indent=1)
