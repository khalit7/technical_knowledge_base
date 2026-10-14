"""A router that sends single-hop questions to the one-shot pipeline and multi-hop ones to the agent loop.

HotpotQA has no single-hop questions, so single-hop questions are CONSTRUCTED here: Qwen3-4B (a different model
from the 1.7B that answers) reads one corpus paragraph and writes one question answerable from it alone, with a short
answer copied from the paragraph. Kept only if the answer appears verbatim in the paragraph, has at most 6 words, and
does not appear in the question. 240 paragraphs are drawn (seed 1) from the corpus paragraphs that are NOT gold for any
of the 200 test questions; the first half of the kept questions is the router's training data, the second half (up to
100) joins the mixed test set.

Two routers:
  - "embed-LR": logistic regression on the bge-small question vector (the search tool's own encoder, so free at
    query time), trained on held-out multi-hop questions (the 800) + the training half of the single-hop ones.
  - "llm": Qwen3-1.7B asked ONE or TWO (one fact about one thing, or facts about two things), few-shot, temperature 0.
usage: python -I -B router.py construct   (4B, hold the bench lock)
       python -I -B router.py classify    (1.7B, hold the bench lock)
       python -I -B router.py evaluate    (no generator; needs the runs of single and react on test and single sets)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import random
import re

import numpy as np

import gen as G
from common import data, heldout, jl_read, jl_write, save, work, r3

CONSTRUCT = ("Here is a paragraph from Wikipedia.\n\n{title}: {text}\n\n"
             "Write one question that a reader could answer from this paragraph alone, about a specific fact in it, and its answer. "
             "The answer must be a short phrase (at most 5 words) copied exactly from the paragraph. Mention the subject by name "
             "in the question (do not say 'the paragraph'). Reply in exactly two lines:\nQuestion: ...\nAnswer: ...")
CLASSIFY = ("Decide how many separate facts are needed to answer the question.\n"
            "ONE: a single fact about one thing.\nTWO: a chain (find one thing, then a fact about it) or a comparison of two things.\n"
            "Examples:\n"
            "Question: When was the Eiffel Tower completed? -> ONE\n"
            "Question: Which country is the director of the film Kids Return from? -> TWO\n"
            "Question: Who wrote the novel Rebecca? -> ONE\n"
            "Question: Are Mount Rainier and Mount Hood in the same state? -> TWO\n"
            "Question: {q} ->")


def construct():
    qs, corpus, by = data()
    gold = {p for q in qs for p in q["gold_pids"]}
    pool = [p for p in corpus if p["pid"] not in gold and len(p["text"].split()) >= 25]
    rng = random.Random(1)
    rng.shuffle(pool)
    cache = G.Cache("4b_construct")
    out, n_tok_in, n_tok_out, secs = [], 0, 0, 0.0
    for p in pool[:240]:
        r = G.chat(CONSTRUCT.format(title=p["title"], text=p["text"]), cache, "4b", max_tokens=80, tag="construct")
        n_tok_in += r["n_in"]; n_tok_out += r["n_out"]; secs += r["seconds"]
        mq = re.search(r"Question:\s*(.+)", r["text"]); ma = re.search(r"Answer:\s*(.+)", r["text"])
        if not (mq and ma):
            continue
        q, a = mq.group(1).strip(), ma.group(1).strip().rstrip(".").strip('"')
        if a.lower() not in p["text"].lower() or len(a.split()) > 6 or a.lower() in q.lower():
            continue
        out.append({"qid": "sh-" + p["pid"], "question": q, "answer": a, "type": "single", "gold_pids": [p["pid"]],
                    "own_context_pids": [p["pid"]]})
    half = len(out) // 2
    jl_write(work("single_hop_train.jsonl"), out[:half])
    jl_write(work("single_hop.jsonl"), out[half:half + 100])
    json.dump({"drawn": 240, "kept": len(out), "train": half, "test": len(out[half:half + 100]), "tok_in": n_tok_in,
               "tok_out": n_tok_out, "seconds": round(secs, 1)}, open(work("single_hop_meta.json"), "w"))
    print("kept", len(out), "of 240")


def _vecs(texts):
    import search as S
    return np.stack([S.qvec(t) for t in texts])


def classify():
    """LLM router labels for every question it will see (train and test), cached."""
    sets = {"test": data()[0], "heldout": heldout(), "single": jl_read(work("single_hop.jsonl")),
            "single_train": jl_read(work("single_hop_train.jsonl"))}
    cache = G.Cache("1.7b_router")
    out = {}
    for name, qs in sets.items():
        if name == "heldout":
            qs = qs[:200]
        for q in qs:
            r = G.chat(CLASSIFY.format(q=q["question"]), cache, "1.7b", max_tokens=4, tag="router")
            out[q["qid"]] = {"label": "TWO" if "TWO" in r["text"].upper() else "ONE", "n_in": r["n_in"], "n_out": r["n_out"],
                             "seconds": r["seconds"]}
    json.dump(out, open(work("router_llm.json"), "w"))
    print("classified", len(out))


def evaluate():
    from sklearn.linear_model import LogisticRegression
    test_multi, ho = data()[0], heldout()
    s_train, s_test = jl_read(work("single_hop_train.jsonl")), jl_read(work("single_hop.jsonl"))
    tr = ho[:400] + s_train
    ytr = np.array([1] * 400 + [0] * len(s_train))
    clf = LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000).fit(_vecs([q["question"] for q in tr]), ytr)
    mixed = test_multi[:100] + s_test
    ytrue = np.array([1] * 100 + [0] * len(s_test))
    p_lr = clf.predict(_vecs([q["question"] for q in mixed]))
    llm = json.load(open(work("router_llm.json")))
    p_llm = np.array([1 if llm[q["qid"]]["label"] == "TWO" else 0 for q in mixed])

    def runs(set_, strat):
        f = work("runs", "%s_1.7b_%s.jsonl" % (set_, strat))
        return {r["qid"]: r for r in jl_read(f)}
    R = {"single": {**runs("test", "single_k5"), **runs("single", "single_k5")}, "react": {**runs("test", "react"), **runs("single", "react")}}
    res = {"n_multi": 100, "n_single": len(s_test), "train": {"multi": 400, "single": len(s_train)}}
    for name, route in (("always pipeline", np.zeros(len(mixed))), ("always agent", np.ones(len(mixed))), ("router: embed-LR", p_lr),
                        ("router: llm", p_llm), ("oracle router", ytrue)):
        rows = [R["react" if route[i] else "single"][q["qid"]] for i, q in enumerate(mixed)]
        extra_tok = sum(llm[q["qid"]]["n_in"] + llm[q["qid"]]["n_out"] for q in mixed) if name == "router: llm" else 0
        extra_s = sum(llm[q["qid"]]["seconds"] for q in mixed) if name == "router: llm" else 0
        acc = {"accuracy": r3(np.mean(route == ytrue)) if "router" in name else None,
               "f1": r3(np.mean([r["f1"] for r in rows])), "em": r3(np.mean([r["em"] for r in rows])),
               "f1_multi": r3(np.mean([r["f1"] for r in rows[:100]])), "f1_single": r3(np.mean([r["f1"] for r in rows[100:]])),
               "searches": r3(np.mean([r["n_search"] for r in rows])),
               "tok": r3((sum(r["tok_in"] + r["tok_out"] for r in rows) + extra_tok) / len(rows)),
               "seconds": r3((sum(r["wall_s"] for r in rows) + extra_s) / len(rows)),
               "to_agent": int(route.sum())}
        res[name] = acc
        print(name, acc)
    save("router.json", res)


if __name__ == "__main__":
    {"construct": construct, "classify": classify, "evaluate": evaluate}[sys.argv[1]]()
