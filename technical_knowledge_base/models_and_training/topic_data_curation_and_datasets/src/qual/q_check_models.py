"""Check both published classifiers reproduce the published scores before using them.
1) DCLM fastText on the first 2,000 DCLM-baseline rows vs their stored fasttext_score (both preprocessings).
2) FineWeb-Edu classifier on the 159 FineWeb-Edu rows from our WARC vs their stored score; timing (rough)."""
import time
import numpy as np
import q_common as Q

L = Q.L
d = L.curated("dclm_first50k", columns=["text", "fasttext_score"]).head(2000)
t0 = time.time()
sp = np.array(Q.dclm_scores(list(d.text), newline=" "))
t1 = time.time()
em = np.array(Q.dclm_scores(list(d.text), newline=""))
ref = d.fasttext_score.to_numpy()
full = L.curated("dclm_first50k", columns=["fasttext_score"]).fasttext_score.to_numpy()
r = {"dclm_n": len(d), "dclm_space_maxabs": float(np.abs(sp - ref).max()), "dclm_space_meanabs": float(np.abs(sp - ref).mean()),
     "dclm_empty_maxabs": float(np.abs(em - ref).max()), "dclm_empty_meanabs": float(np.abs(em - ref).mean()),
     "dclm_secs_per_1000_rough": round((t1 - t0) / len(d) * 1000, 2),
     "dclm_baseline_50k_min_score": float(full.min()), "dclm_baseline_50k_quantiles": {q: float(np.quantile(full, q)) for q in (0.01, 0.1, 0.5, 0.9)}}
e = L.curated("fineweb_edu_warc", columns=["id", "text", "score", "int_score"])
t0 = time.time()
s = np.array(Q.edu_scores(list(e.text)))
t1 = time.time()
r.update({"edu_n": len(e), "edu_maxabs": float(np.abs(s - e.score.to_numpy()).max()),
          "edu_meanabs": float(np.abs(s - e.score.to_numpy()).mean()),
          "edu_same_int": int(sum(Q.int_score(a) == b for a, b in zip(s, e.int_score))),
          "edu_secs_per_doc_rough": round((t1 - t0) / len(e), 3)})
print(r)
Q.dump("q_check_models.json", r, indent=1)
