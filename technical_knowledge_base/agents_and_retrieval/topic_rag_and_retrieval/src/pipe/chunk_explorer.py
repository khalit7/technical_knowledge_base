"""Data for the chunking explorer: one real QASPER paper (Zampieri et al. 2019, "Predicting the Type and Target of
Offensive Posts in Social Media", arXiv 1902.09666; QASPER text, CC BY 4.0), its chunk boundaries under every
strategy, its questions with the annotated evidence spans, and for each strategy and question the three chunks BM25
ranks first (inside this paper) and whether they cover an evidence paragraph (the chunk_eval.py rule).
Output: out/chunk_explorer.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from common import L, save, work
from chunk_eval import read_chunks, bm25_rank, hit, chunk_file, dense_rank

PID = "1902.09666"
STRATS = ["fixed-128-16", "fixed-256-32", "fixed-512-64", "recursive-256", "sentence-256", "structure-256", "paragraph", "semantic-p95", "semantic-p80"]
docs, qs = L.longdoc()
doc = next(d for d in docs if d["paper_id"] == PID)
mine = [q for q in qs if q["paper_id"] == PID]
out = {"paper_id": PID, "title": doc["title"], "text": doc["text"],
       "sections": [[p["start"], p["end"], p["section"]] for p in doc["paragraphs"]],
       "questions": [{"qid": q["qid"][:8], "q": q["question"], "ev": [[e["start"], e["end"]] for e in q["evidence"]],
                      "ans": [a["text"] for a in q["answers"]][:2]} for q in mine], "strategies": {}}
for s in STRATS:
    if not os.path.exists(chunk_file(s)):
        continue
    _, by = read_chunks(s)
    cs = by[PID]
    ranks = bm25_rank(lambda c: doc["text"][c["start"]:c["end"]], {PID: cs}, mine)
    idx = {c["cid"]: i for i, c in enumerate(cs)}
    out["strategies"][s] = {"chunks": [[c["start"], c["end"], c["n_tokens"]] for c in cs],
                            "top3": [[idx[c["cid"]] for c in ranks[q["qid"]][:3]] for q in mine],
                            "hit3": [bool(hit(ranks[q["qid"]][:3], q)) for q in mine],
                            "intact": [any(c["start"] <= e["start"] and e["end"] <= c["end"] for e in q["evidence"] for c in cs) for q in mine]}
save("chunk_explorer.json", out)
