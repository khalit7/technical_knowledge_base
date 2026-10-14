"""Per-query rerank latency against depth K, measured on the Apple M1 Pro (hold the bench lock).
One user query at a time: the K candidates of one claim go to the model in ONE batch (batch size K), after a warm-up;
30 claims (every 10th test claim, sorted by id; every 30th, 10 claims, for Qwen3-Reranker), 3 repeats; p50 and p90 over the 90 timings, and the median of each
repeat for the spread. Same model settings as the setup's rerank_all.py (fp16 on MPS for the two large models,
fp32 for CE MiniLM; max length 512, Qwen3 1,024 with the SciFact instruction). One model per process.
usage: python -I -B e_time.py <ce-minilm-l6|bge-reranker-v2-m3|qwen3-reranker-0.6b> K1,K2,... [claim step]
       python -I -B e_time.py maxsim 10,30,100      (CPU numpy on the stored ColBERT vectors, 1 thread)
Appends to data/timings.json (key = model)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time
import numpy as np
from rrlib import L, DS, first_stages, DATA

REP = 3


def main():
    key = sys.argv[1]
    KS = [int(x) for x in sys.argv[2].split(",")]
    corpus, queries, qrels = L.beir(DS)
    step = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    qs = sorted(qrels["test"], key=int)[::step]
    hy = first_stages()["hybrid"]
    res = {"model": key, "n_queries": len(qs), "repeats": REP, "first_stage": "hybrid", "K": {}, "when": time.strftime("%Y-%m-%d %H:%M"),
           "loadavg": [["start", [round(x, 2) for x in os.getloadavg()]]]}
    if key == "maxsim":
        os.environ["OMP_NUM_THREADS"] = "1"
        p = L.path("data", "colbert", DS)
        D = np.load(os.path.join(p, "doc_tokens.npy")).astype(np.float32)
        off = np.load(os.path.join(p, "doc_offsets.npy"))
        Qv = np.load(os.path.join(p, "query_tokens.npy")).astype(np.float32)
        qoff = np.load(os.path.join(p, "query_offsets.npy"))
        dids = open(os.path.join(p, "doc_ids.txt")).read().split("\n")
        qids = open(os.path.join(p, "query_ids.txt")).read().split("\n")
        dpos = {d: i for i, d in enumerate(dids)}
        qpos = {q: i for i, q in enumerate(qids)}

        def fn(q, K):
            qr = Qv[qoff[qpos[q]]:qoff[qpos[q] + 1]]
            idx = [dpos[d] for d in list(hy[q])[:K]]
            return [float((qr @ D[off[j]:off[j + 1]].T).max(1).sum()) for j in idx]
    else:
        import torch
        from sentence_transformers import CrossEncoder
        extra = dict(prompts={"task": L.TASKS[DS]}, default_prompt_name="task") if key == "qwen3-reranker-0.6b" else {}
        ce = CrossEncoder(L.model_dir(key), device="mps", model_kwargs={"torch_dtype": torch.float16} if key != "ce-minilm-l6" else {},
                          max_length=1024 if key == "qwen3-reranker-0.6b" else 512, **extra)

        def fn(q, K):
            pairs = [(queries[q], L.doc_text(corpus[d])) for d in list(hy[q])[:K]]
            s = ce.predict(pairs, batch_size=K, show_progress_bar=False)
            torch.mps.synchronize()
            return s
    for K in KS:
        fn(qs[0], K)  # warm-up at this K
        allt, meds = [], []
        for _ in range(REP):
            ts = []
            for q in qs:
                t0 = time.perf_counter(); fn(q, K); ts.append(1000 * (time.perf_counter() - t0))
            allt += ts; meds.append(float(np.median(ts)))
        res["K"][str(K)] = {"p50_ms": round(float(np.percentile(allt, 50)), 2), "p90_ms": round(float(np.percentile(allt, 90)), 2),
                            "median_per_repeat_ms": [round(m, 2) for m in meds]}
        res["loadavg"].append(["K%d" % K, [round(x, 2) for x in os.getloadavg()]])
        print(key, K, res["K"][str(K)], os.getloadavg(), flush=True)
    path = os.path.join(DATA, "timings.json")
    allr = json.load(open(path)) if os.path.exists(path) else {}
    allr[key] = res
    json.dump(allr, open(path, "w"), indent=1)


if __name__ == "__main__":
    main()
