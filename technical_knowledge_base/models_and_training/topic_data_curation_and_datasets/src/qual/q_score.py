"""Score document sets with the published quality classifiers (CPU, float32). Outputs to $DC_SCRATCH/q/*.jsonl.
usage: q_score.py <part> where part in run0 | nemo | annot | fw | ftall | all
  run0 : run0 final (2,617 docs): FineWeb-Edu score, DCLM P(hq) (DCLM/Dolma newline join), DCLM P(hq) with datatrove's default newline_replacement ""
  nemo : Nemotron-CC CC-MAIN-2024-30 head samples, first 200 docs of each of the 5 real-data quality buckets
  annot: 1,500 random rows (seed 0) of the FineWeb-Edu Llama 3 annotations: FineWeb-Edu classifier and DCLM
  fw   : 2,000 random rows (seed 0) of the FineWeb CC-MAIN-2024-30 50k sample: both classifiers
  fw50k: FineWeb-Edu classifier on all 50,000 FineWeb rows of the sample (PENDING GPU RUN; ~2 h on 4 CPU threads)
  ftall: DCLM fastText only (cheap) on all 232,000 annotation rows and on the FineWeb and FineWeb-Edu 50k samples
"""
import json
import sys
import time

import numpy as np
import q_common as Q

L = Q.L
part = sys.argv[1]


def write(name, rows):
    with open(Q.qdir(name), "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(name, len(rows), flush=True)


def both(texts):
    t0 = time.time()
    e = Q.edu_scores(texts)
    d = Q.dclm_scores(texts, newline=" ")
    print(f"  scored {len(texts)} in {time.time() - t0:.0f}s", flush=True)
    return e, d


if part in ("run0", "all"):
    docs = L.run0("final")
    texts = [d["text"] for d in docs]
    e, d = both(texts)
    d0 = Q.dclm_scores(texts, newline="")
    rows = []
    for doc, a, b, c in zip(docs, e, d, d0):
        md = Q.safe_meta(doc)
        rows.append({"id": doc["id"], "url": md.get("url"), "chars": len(doc["text"]), "words": len(doc["text"].split()),
                     "lines": doc["text"].count("\n") + 1, "edu": a, "dclm": b, "dclm_dt_default": c})
    write("run0_final_scores.jsonl", rows)

if part in ("nemo", "all"):
    rows = []
    for qb in ["high", "medium-high", "medium", "medium-low", "low"]:
        docs = L.nemotron(qb, limit=200)
        e, d = both([x["text"] for x in docs])
        for x, a, b in zip(docs, e, d):
            rows.append({"bucket": qb, "id": x["warc_record_id"], "chars": len(x["text"]), "edu": a, "dclm": b})
    write("nemo_scores.jsonl", rows)

if part in ("annot", "all"):
    a = L.curated("edu_annotations", columns=["text", "score"])
    idx = np.random.default_rng(0).choice(len(a), 1500, replace=False)
    sub = a.iloc[np.sort(idx)]
    e, d = both(list(sub.text))
    write("annot_sample_scores.jsonl", [{"row": int(i), "llama": int(s), "edu": x, "dclm": y}
                                        for i, s, x, y in zip(np.sort(idx), sub.score, e, d)])

if part in ("fw", "all"):
    f = L.curated("fineweb_rand50k", columns=["id", "text", "token_count"])
    idx = np.sort(np.random.default_rng(0).choice(len(f), 2000, replace=False))
    sub = f.iloc[idx]
    e, d = both(list(sub.text))
    write("fw_sample_scores.jsonl", [{"row": int(i), "id": j, "tokens": int(t), "edu": x, "dclm": y}
                                     for i, j, t, x, y in zip(idx, sub.id, sub.token_count, e, d)])

if part in ("ftall", "all"):
    a = L.curated("edu_annotations", columns=["text", "score"])
    d = Q.dclm_scores(list(a.text))
    write("annot_all_dclm.jsonl", [{"llama": int(s), "dclm": y} for s, y in zip(a.score, d)])
    for nm in ["fineweb_rand50k", "fineweb_edu_rand50k"]:
        cols = ["token_count", "text"] + (["score"] if "edu" in nm else [])
        f = L.curated(nm, columns=cols)
        d = Q.dclm_scores(list(f.text))
        write(f"{nm}_dclm.jsonl", [{"tokens": int(t), "dclm": y, **({"edu": float(s)} if "edu" in nm else {})}
                                   for t, y, s in zip(f.token_count, d, f["score"] if "edu" in nm else [None] * len(f))])

if part == "fw50k":  # pending GPU run (run_pending.sh)
    f = L.curated("fineweb_rand50k", columns=["id", "token_count", "text"])
    e = Q.edu_scores(list(f.text), batch=64)
    write("fw50k_edu.jsonl", [{"id": j, "tokens": int(t), "edu": x} for j, t, x in zip(f.id, f.token_count, e)])
