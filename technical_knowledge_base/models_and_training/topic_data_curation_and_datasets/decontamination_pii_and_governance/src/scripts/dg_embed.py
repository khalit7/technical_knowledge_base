"""Embedding-similarity contamination check (the first stage of Yang et al.'s LLM decontaminator, arXiv 2311.04850):
for each benchmark item, the most similar post-training prompt by cosine similarity of bge-small-en-v1.5 embeddings
(CLS pooling, normalised, as the model card says), on CPU. The second stage (an LLM judging each top pair) needs a
GPU-sized model: it is in run_pending.sh.

Training side: the user prompt only (Tulu 3 compared prompts only: completions are often regenerated), i.e. Tulu 3
SFT user turns, UltraFeedback prompts, RLVR questions (the last "Question:" block for GSM8K and MATH rows, which
carry few-shot exemplars before it). Test side: GSM8K, MATH-500, ARC-Challenge, ARC-Easy, MMLU questions (stem only).

Model: BAAI/bge-small-en-v1.5 @ 5c38ec7c (MIT), read from the RAG topic's model folder (path via DG_BGE).
Output: $DC_SCRATCH/data/dg/embed/top.json (top-3 neighbours per item with scores), plus a score histogram.
"""
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

BENCHES = ["gsm8k_test", "math500_test", "arc_challenge_test", "arc_easy_test", "mmlu_test"]


def train_prompts():
    out = []
    t = C.L.post("tulu3_sft_5k")
    for r in t.itertuples(index=False):
        u = [m["content"] for m in r.messages if m["role"] == "user"]
        if u:
            out.append(("tulu3_sft", r.id, u[0]))
    u = C.L.post("ultrafeedback_binarized_prefs_5k")
    for r in u.itertuples(index=False):
        out.append(("ultrafeedback", r.prompt_id, r.prompt))
    v = C.L.post("rlvr_gsm_math_if_all")
    for i, r in enumerate(v.itertuples(index=False)):
        c = r.messages[0]["content"]
        if r.dataset in ("gsm8k", "MATH") and "Question:" in c:
            c = c[c.rfind("Question:") + len("Question:"):]
            c = c.split("\nAnswer:")[0]
        out.append(("rlvr", f"rlvr#{i}", c.strip()))
    return out


def stem(it):
    if it["bench"] in ("mmlu_test",):
        return it["query"].rsplit("\n", 4)[0]
    if it["bench"].startswith("arc_"):
        return it["query"].split("\n")[0]
    return it["query"]


def embed(texts, tok, model, bs=64):
    import torch
    vs = []
    with torch.inference_mode():
        for i in range(0, len(texts), bs):
            b = tok(texts[i:i + bs], padding=True, truncation=True, max_length=256, return_tensors="pt")
            h = model(**b).last_hidden_state[:, 0]
            vs.append(torch.nn.functional.normalize(h, dim=-1).numpy())
            if i % (bs * 50) == 0:
                print(i, len(texts), flush=True)
    return np.concatenate(vs).astype(np.float32)


def main():
    import torch
    from transformers import AutoModel, AutoTokenizer
    torch.set_num_threads(4)
    path = os.environ["DG_BGE"]
    tok = AutoTokenizer.from_pretrained(path)
    model = AutoModel.from_pretrained(path).eval()
    od = C.out_dir("embed")
    tr = train_prompts()
    items = [it for it in C.bench_items() if it["bench"] in BENCHES]
    t0 = time.time()
    ft = os.path.join(od, "train.npy")
    if os.path.exists(ft):
        E_tr = np.load(ft)
    else:
        E_tr = embed([x[2] for x in tr], tok, model)
        np.save(ft, E_tr)
    E_it = embed([stem(it) for it in items], tok, model)
    print("embedded", round(time.time() - t0), "s", flush=True)
    S = E_it @ E_tr.T
    top = np.argsort(-S, axis=1)[:, :3]
    res = []
    for i, it in enumerate(items):
        res.append({"bench": it["bench"], "bidx": it["idx"],
                    "top": [{"corpus": tr[j][0], "doc": tr[j][1], "score": round(float(S[i, j]), 4)} for j in top[i]]})
    json.dump({"model": "BAAI/bge-small-en-v1.5@5c38ec7c", "n_train": len(tr), "seconds": round(time.time() - t0),
               "items": res}, open(os.path.join(od, "top.json"), "w"))
    print("done", len(res))


if __name__ == "__main__":
    main()
