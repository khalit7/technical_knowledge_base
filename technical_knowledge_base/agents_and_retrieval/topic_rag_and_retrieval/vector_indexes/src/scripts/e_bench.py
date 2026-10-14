"""Timed runs for the Frontier tab and the scaling sections (hold the bench lock; records the load average).
Every index runs on ONE CPU thread (faiss.omp_set_num_threads(1), hnswlib set_num_threads(1)) and answers queries
one at a time from Python, so latency = time per query (including about 10 to 30 microseconds of Python call
overhead) and QPS = 1 / median latency; 3 passes over the query set, the median of each pass reported, and the
median of the three used.
Sets: scifact (5,183 x 1,024, Qwen3-Embedding; 300 queries), all4 (25,039 x 1,024; 400 queries),
quora (522,931 x 384, MiniLM-L6; 1,000 queries; needs embed_quora.py first).
usage: e_bench.py <set> [families...]   Output: $RAG_SCRATCH/vix/out/bench_<set>.json (merged across calls)"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time

import faiss
import hnswlib
import numpy as np

import vixlib as V

faiss.omp_set_num_threads(1)
which = sys.argv[1]
fams = sys.argv[2:] or ["flat", "ivf", "ivfpq", "sq", "hnsw", "hnswlib", "binary", "exact_scaling"]
if which == "scifact":
    X, Q, *_ = V.beir_set("scifact", "qwen3-emb-0.6b")
elif which == "all4":
    X, Q, _, _ = V.all4_set()
    Q = Q[np.sort(np.random.default_rng(1).choice(len(Q), 400, replace=False))]
else:
    d = os.path.join(V.WORK, "quora")
    X = np.load(d + "/corpus.npy"); Q = np.load(d + "/queries.npy")
n, dim = X.shape
GTF = os.path.join(V.WORK, "gt_%s.npy" % which)
if os.path.exists(GTF):
    GT = np.load(GTF)
else:
    GT = V.exact_topk(X, Q, k=10)[0]; np.save(GTF, GT)
OUTF = os.path.join(V.OUT, "bench_%s.json" % which)
R = json.load(open(OUTF)) if os.path.exists(OUTF) else {"set": which, "n": n, "d": dim, "queries": len(Q), "rows": [], "builds": []}
R["rows"] = [r for r in R["rows"] if r["family"] not in fams]
R["builds"] = [b for b in R["builds"] if b["family"] not in fams]
R.setdefault("runs", []).append({"when": V.stamp(), "families": fams, "load_before": V.loadavg()})


def timeq(fn, passes=3):
    """Per-query latency in ms, one query at a time; returns per-pass medians and p95 of the last pass, plus results."""
    meds, last, res = [], None, None
    for _ in range(passes):
        ts = []
        out = []
        for q in Q:
            t = time.perf_counter()
            out.append(fn(q[None]))
            ts.append((time.perf_counter() - t) * 1000)
        meds.append(round(float(np.median(ts)), 4)); last = ts; res = out
    return meds, round(float(np.percentile(last, 95)), 4), res


def add(family, label, params, fn, nbytes, extra=None):
    meds, p95, res = timeq(fn)
    I = np.array([np.asarray(r).reshape(-1)[:10] for r in res])
    r = {"family": family, "label": label, "params": params, "recall10": V.r4(V.recall_at(I, GT)), "ms_p50_passes": meds,
         "ms_p50": float(np.median(meds)), "ms_p95": p95, "qps": round(1000 / float(np.median(meds)), 1), "bytes": int(nbytes),
         "bytes_per_vector": round(nbytes / n, 1), "load": V.loadavg()}
    if extra:
        r.update(extra)
    R["rows"].append(r); print(r, flush=True)
    json.dump(R, open(OUTF, "w"), indent=1)


def build(family, label, fn):
    la = V.loadavg(); t = time.perf_counter(); idx = fn(); s = time.perf_counter() - t
    R["builds"].append({"family": family, "label": label, "build_s": round(s, 2), "load_before": la, "load_after": V.loadavg()})
    print("build", label, round(s, 2), flush=True)
    return idx


def fsize(idx):
    return int(faiss.serialize_index(idx).size)


if "flat" in fams:
    fl = build("flat", "Flat", lambda: (lambda i: (i.add(X), i)[1])(faiss.IndexFlatIP(dim)))
    add("flat", "Flat (exact)", {}, lambda q: fl.search(q, 10)[1], fsize(fl))
if "exact_scaling" in fams:
    # exact search time against N (prefixes of the collection), one query at a time, one thread
    rows = []
    for m in [x for x in (5000, 10000, 25000, 50000, 100000, 250000, 522931) if x <= n] + ([n] if n not in (5000, 10000, 25000, 50000, 100000, 250000, 522931) else []):
        fl = faiss.IndexFlatIP(dim); fl.add(X[:m])
        ts = []
        for p in range(3):
            t0 = time.perf_counter()
            for q in Q[:200]:
                fl.search(q[None], 10)
            ts.append((time.perf_counter() - t0) / 200 * 1000)
        tb = time.perf_counter(); fl.search(Q[:200], 10); tbatch = (time.perf_counter() - tb) / 200 * 1000
        rows.append({"n": m, "ms_per_query_passes": [round(x, 4) for x in ts], "ms_batched_200": round(tbatch, 4),
                     "gb_per_s": round(m * dim * 4 / (np.median(ts) / 1000) / 1e9, 2), "load": V.loadavg()})
        print(rows[-1], flush=True)
    R["exact_scaling"] = rows
    json.dump(R, open(OUTF, "w"), indent=1)
if "ivf" in fams:
    nl = int(round(np.sqrt(n))) if n < 100000 else 4 * int(round(np.sqrt(n)))
    def mk():
        i = faiss.IndexIVFFlat(faiss.IndexFlatIP(dim), dim, nl, faiss.METRIC_INNER_PRODUCT); i.cp.seed = 1234
        i.train(X if n < 100000 else X[np.random.default_rng(0).choice(n, min(n, 64 * nl), replace=False)]); i.add(X); return i
    iv = build("ivf", "IVF%d,Flat" % nl, mk)
    for p in (1, 2, 4, 8, 16, 32, 64):
        iv.nprobe = p
        add("ivf", "IVF%d,Flat nprobe %d" % (nl, p), {"nlist": nl, "nprobe": p}, lambda q: iv.search(q, 10)[1], fsize(iv))
if "ivfpq" in fams:
    nl = int(round(np.sqrt(n))) if n < 100000 else 4 * int(round(np.sqrt(n)))
    m = dim // 16
    def mk():
        i = faiss.IndexIVFPQ(faiss.IndexFlatIP(dim), dim, nl, m, 8, faiss.METRIC_INNER_PRODUCT); i.cp.seed = 1234
        i.train(X if n < 100000 else X[np.random.default_rng(0).choice(n, min(n, 64 * nl), replace=False)]); i.add(X); return i
    ip = build("ivfpq", "IVF%d,PQ%d" % (nl, m), mk)
    for p in (4, 16, 64):
        ip.nprobe = p
        add("ivfpq", "IVF%d,PQ%d nprobe %d" % (nl, m, p), {"nlist": nl, "m": m, "nprobe": p}, lambda q: ip.search(q, 10)[1], fsize(ip))
        def rs(q, ip=ip):
            I = ip.search(q, 100)[1][0]; I = I[I >= 0]
            return I[np.argsort(-(X[I] @ q[0]))[:10]]
        add("ivfpq", "IVF%d,PQ%d nprobe %d + rescore 100" % (nl, m, p), {"nlist": nl, "m": m, "nprobe": p, "rescore": 100}, rs,
            fsize(ip) + n * dim * 4, {"note": "bytes include the float32 vectors kept for rescoring"})
if "sq" in fams:
    s8 = build("sq", "SQ8", lambda: (lambda i: (i.train(X), i.add(X), i)[2])(faiss.IndexScalarQuantizer(dim, faiss.ScalarQuantizer.QT_8bit, faiss.METRIC_INNER_PRODUCT)))
    add("sq", "Scalar int8 (exhaustive)", {}, lambda q: s8.search(q, 10)[1], fsize(s8))
    h8 = build("sq", "HNSW32,SQ8", lambda: (lambda i: (i.train(X), i.add(X), i)[2])(faiss.IndexHNSWSQ(dim, faiss.ScalarQuantizer.QT_8bit, 32, faiss.METRIC_INNER_PRODUCT)))
    for ef in (16, 64, 256):
        h8.hnsw.efSearch = ef
        add("sq", "HNSW32,SQ8 ef %d" % ef, {"M": 32, "ef": ef}, lambda q: h8.search(q, 10)[1], fsize(h8))
if "binary" in fams:
    B = np.packbits((X > 0).astype(np.uint8), axis=1)
    bi = build("binary", "Binary flat", lambda: (lambda i: (i.add(B), i)[1])(faiss.IndexBinaryFlat(dim)))
    for kc in (10, 100, 400):
        def f(q, kc=kc):
            I = bi.search(np.packbits((q > 0).astype(np.uint8), axis=1), kc)[1][0]
            return I[np.argsort(-(X[I] @ q[0]))[:10]] if kc > 10 else I
        add("binary", "Binary (1 bit) + rescore %d" % kc if kc > 10 else "Binary (1 bit)", {"candidates": kc}, f,
            n * dim // 8 + (n * dim * 4 if kc > 10 else 0), {"note": "rescoring keeps the float32 vectors"} if kc > 10 else None)
if "hnsw" in fams:
    for M in (16, 32):
        def mk(M=M):
            i = faiss.IndexHNSWFlat(dim, M, faiss.METRIC_INNER_PRODUCT); i.hnsw.efConstruction = 100; i.add(X); return i
        h = build("hnsw", "FAISS HNSW%d efC100" % M, mk)
        for ef in (16, 32, 64, 128, 256, 512):
            h.hnsw.efSearch = ef
            add("hnsw", "FAISS HNSW M%d ef %d" % (M, ef), {"M": M, "efc": 100, "ef": ef}, lambda q: h.search(q, 10)[1], fsize(h))
if "hnswlib" in fams:
    def mk():
        p = hnswlib.Index(space="ip", dim=dim); p.init_index(max_elements=n, M=16, ef_construction=200, random_seed=100)
        p.set_num_threads(1); p.add_items(X, np.arange(n)); return p
    p = build("hnswlib", "hnswlib M16 efC200 (defaults)", mk)
    f = os.path.join(V.WORK, "bench_hnswlib_%s.bin" % which); p.save_index(f); nb = os.path.getsize(f)
    for ef in (10, 20, 40, 80, 160, 320):
        p.set_ef(ef)
        add("hnswlib", "hnswlib M16 ef %d" % ef, {"M": 16, "efc": 200, "ef": ef}, lambda q: p.knn_query(q, k=10)[0], nb)
R["runs"][-1]["load_after"] = V.loadavg()
json.dump(R, open(OUTF, "w"), indent=1)
print("done")
