"""The same web document before and after rephrasing, for the root's Post-training data lab.

Two real sources of before/after pairs, no generation here:
  1. The Synthetic data child page's Qwen3-4B rephrasing job (its scripts/run_rephrase.py, WRAP's four prompts):
     $DC_SCRATCH/syn/rephrase_qwen3_4b.jsonl when the GPU job has run (200 documents x 4 styles), else its CPU smoke
     test $DC_SCRATCH/syn/rephrase_smoke.jsonl (2 documents x 4 styles, same model, prompts and sampling).
  2. Cosmopedia web_samples_v2: each row's prompt quotes the web extract it was seeded with, so seed -> generated
     document is a published before/after pair (Mixtral-8x7B-Instruct). A seeded sample of 200 rows.
Per pair: words, the share of the output's word 4-grams absent from the source (novel4), the share of the source's
numbers that reappear (num_kept) -- the same definitions as the synthetic child's analyze_rephrase.py -- and the
FineWeb-Edu classifier score (HuggingFaceFW/fineweb-edu-classifier rev 284663cb, float32 on CPU, max 512 tokens) of
source and output.
Writes out/rephrase.json.
usage: DC_SCRATCH=... OMP_NUM_THREADS=4 nice -n 15 python -I -B pt_rephrase.py
"""
import json
import os
import random
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pt_common as P  # noqa: E402

W = re.compile(r"[A-Za-z]+(?:'[a-z]+)?|[0-9]+(?:[.,][0-9]+)?")  # analyze_rephrase.py line 13
NUM = re.compile(r"\b\d+(?:[.,]\d+)?\b")


def grams(t, n=4):
    w = [x.lower() for x in W.findall(t)]
    return [tuple(w[i:i + n]) for i in range(len(w) - n + 1)]


def measures(src, out):
    sg, og = set(grams(src)), grams(out)
    sn = NUM.findall(src)
    on = set(NUM.findall(out))
    return {"src_words": len(W.findall(src)), "out_words": len(W.findall(out)),
            "novel4": round(sum(g not in sg for g in og) / len(og), 4) if og else None,
            "nums": len(sn), "nums_kept": sum(n in on for n in sn)}


def scorer():
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    torch.set_num_threads(4)
    m = P.L.model_path("fineweb_edu_classifier")
    tok = AutoTokenizer.from_pretrained(m)
    mdl = AutoModelForSequenceClassification.from_pretrained(m).eval()

    def score(texts):
        out = []
        with torch.no_grad():
            for i in range(0, len(texts), 8):
                b = tok(texts[i:i + 8], truncation=True, max_length=512, padding=True, return_tensors="pt")
                out += [round(float(x), 3) for x in mdl(**b).logits.squeeze(-1).tolist()]
        return out
    return score


def main():
    syn = os.path.join(P.L.scratch(), "syn")
    full = os.path.join(syn, "rephrase_qwen3_4b.jsonl")
    src_file = full if os.path.exists(full) else os.path.join(syn, "rephrase_smoke.jsonl")
    rows = [json.loads(x) for x in open(src_file)]
    score = scorer()
    docs = {}
    for r in rows:
        docs.setdefault(r["id"], {"id": r["id"], "url": r["url"], "source": r["source"], "styles": {}})
        docs[r["id"]]["styles"][r["style"]] = {"output": r["output"], "tokens": r.get("completion_tokens"),
                                                "model": r["model"]}
    ids = list(docs)
    src_sc = score([docs[i]["source"] for i in ids])
    flat = [(i, s) for i in ids for s in docs[i]["styles"]]
    out_sc = score([docs[i]["styles"][s]["output"] for i, s in flat])
    for i, sc in zip(ids, src_sc):
        docs[i]["edu"] = sc
    for (i, s), sc in zip(flat, out_sc):
        d = docs[i]["styles"][s]
        d.update(measures(docs[i]["source"], d["output"]), edu=sc)
    agg = {}
    for st in ("easy", "medium", "hard", "qa"):
        xs = [d["styles"][st] for d in docs.values() if st in d["styles"]]
        if not xs:
            continue
        agg[st] = {"n": len(xs), "len_ratio_median": statistics.median(x["out_words"] / max(1, x["src_words"]) for x in xs),
                   "novel4_median": statistics.median(x["novel4"] for x in xs if x["novel4"] is not None),
                   "nums_kept": sum(x["nums_kept"] for x in xs), "nums": sum(x["nums"] for x in xs),
                   "edu_mean": statistics.mean(x["edu"] for x in xs),
                   "src_edu_mean": statistics.mean(docs[i]["edu"] for i in ids)}
    # Cosmopedia seed -> document
    c = P.records("cosmo")
    random.Random(11).shuffle(c)
    cs = c[:200]
    s1 = score([r["seed"] for r in cs])
    s2 = score([r["response"] for r in cs])
    cos = []
    for r, a, b in zip(cs, s1, s2):
        cos.append(dict(i=r["i"], format=r["format"], audience=r["audience"], seed_edu=a, out_edu=b,
                        **measures(r["seed"], r["response"])))
    res = {"syn_file": os.path.basename(src_file), "complete": src_file == full, "docs": list(docs.values()),
           "agg": agg, "cosmo": cos,
           "cosmo_agg": {"n": len(cos), "seed_edu_mean": statistics.mean(x["seed_edu"] for x in cos),
                         "out_edu_mean": statistics.mean(x["out_edu"] for x in cos),
                         "seed_pass": sum(x["seed_edu"] >= 2.5 for x in cos), "out_pass": sum(x["out_edu"] >= 2.5 for x in cos),
                         "novel4_median": statistics.median(x["novel4"] for x in cos if x["novel4"] is not None),
                         "len_ratio_median": statistics.median(x["out_words"] / max(1, x["src_words"]) for x in cos),
                         "nums_kept": sum(x["nums_kept"] for x in cos), "nums": sum(x["nums"] for x in cos)}}
    P.save_out("rephrase.json", res)
    print(json.dumps(res["agg"]), json.dumps(res["cosmo_agg"]))


if __name__ == "__main__":
    main()
