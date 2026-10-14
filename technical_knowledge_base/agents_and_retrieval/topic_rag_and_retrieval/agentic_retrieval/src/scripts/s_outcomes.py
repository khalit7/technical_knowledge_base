"""Per-question outcomes of every strategy the root's Agentic lab recorded (Qwen3-1.7B, 200 HotpotQA questions), plus
query-time signals a router or a retrieval evaluator could use. Deterministic, CPU (the cross-encoder runs on the CPU,
2 threads, 1,000 pairs). No generator call: every answer is the root's recorded one.

Signals for each question (computed before any generation):
  cue        rule features of the question text (comparison words, yes/no opening, "both", " or ")
  s1, gap    bge-small cosine of the top-1 paragraph and top-1 minus top-3 (the search the pipeline does anyway)
  ce1, ce2   ms-marco MiniLM-L6 cross-encoder logits of the best and second-best of the top 5 (a CRAG-style
             retrieval evaluator; CRAG uses a fine-tuned T5-large, this is the running example's small reranker)
  ov         overlap of the BM25 and bge-small top 5 (0 to 5)
  ntok       question length in Qwen3 tokens
Writes ../data/outcomes.json (compact arrays, one entry per question in the setup's order)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re

import numpy as np

import arlib as A

qs, corpus, by = A.mh()
STRATS = ["closed", "single_k2", "single_k5", "single_k10", "single_k5_methodbm25", "decomp", "react", "longctx",
          "longctx_tokens8000"]
runs = {s: A.root_run("test_1.7b_" + s) for s in STRATS}
for s in STRATS:
    assert len(runs[s]) == 200, (s, len(runs[s]))

# BM25 top 5 from the setup's recorded run (bm25s Lucene, k1 1.2, b 0.75)
bm = A.L.run("hotpotqa", "bm25")

YESNO = re.compile(r"^(are|is|was|were|do|does|did|can|could|has|have|will)\b", re.I)
CMP = re.compile(r"\b(or|both|same|first|older|younger|earlier|later|more|less|longer|shorter|larger|smaller|higher|"
                 r"lower|bigger|fewer|either|which one|who was born)\b", re.I)

# cross-encoder on the CPU
from sentence_transformers import CrossEncoder  # noqa: E402
import torch  # noqa: E402
torch.set_num_threads(2)
ce = CrossEncoder(A.L.model_dir("ce-minilm-l6"), device="cpu")

out = {"strategies": STRATS, "qid": [], "type": [], "q": [], "gold": [], "cue_yesno": [], "cue_cmp": [], "s1": [], "gap": [],
       "ce1": [], "ce2": [], "ov": [], "ntok": [], "both5": [], "res": {s: {k: [] for k in ("f1", "em", "tok", "tnew", "out", "sec", "srch", "seen", "calls")} for s in STRATS}}
for q in qs:
    r = A.ranking(q["question"])
    top5 = r[:5]
    sc = A.dense_scores(q["question"])
    srt = np.sort(sc)[::-1]
    pairs = [(q["question"], by[p]["title"] + ": " + by[p]["text"]) for p in top5]
    ces = sorted((float(x) for x in ce.predict(pairs, batch_size=16, show_progress_bar=False)), reverse=True)
    b5 = list(bm[q["qid"]].keys())[:5]
    out["qid"].append(q["qid"]); out["type"].append(q["type"]); out["q"].append(q["question"]); out["gold"].append(q["answer"])
    out["cue_yesno"].append(int(bool(YESNO.match(q["question"].strip()))))
    out["cue_cmp"].append(int(bool(CMP.search(q["question"]))))
    out["s1"].append(A.r3(srt[0])); out["gap"].append(A.r3(srt[0] - srt[2]))
    out["ce1"].append(round(ces[0], 2)); out["ce2"].append(round(ces[1], 2))
    out["ov"].append(len(set(top5) & set(b5)))
    out["ntok"].append(A.ntok(q["question"]))
    out["both5"].append(int(all(g in top5 for g in q["gold_pids"])))
    for s in STRATS:
        x = runs[s][q["qid"]]
        R = out["res"][s]
        R["f1"].append(round(x["f1"], 3)); R["em"].append(int(x["em"])); R["tok"].append(x["tok_in"] + x["tok_out"])
        R["tnew"].append(x["tok_in_new"] + x["tok_out"]); R["out"].append(x["tok_out"]); R["sec"].append(round(x["wall_s"], 2))
        R["srch"].append(x["n_search"]); R["seen"].append(x["gold_seen"]); R["calls"].append(x["n_calls"])

# check against the root's committed strategies.json (same runs, same rows)
import json  # noqa: E402
SJ = json.load(open(os.path.join(A.ROOT_SRC, "agent", "out", "strategies.json")))["1.7b"]
for s in STRATS:
    key = s if s in SJ else None
    if key:
        f1 = sum(out["res"][s]["f1"]) / 200
        assert abs(f1 - SJ[key]["f1"]) < 0.002, (s, f1, SJ[key]["f1"])
print("matches root strategies.json for", [s for s in STRATS if s in SJ])
A.save("outcomes.json", out)
