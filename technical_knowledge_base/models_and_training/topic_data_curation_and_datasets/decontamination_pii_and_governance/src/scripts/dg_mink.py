"""Pending GPU run (smoke-tested on CPU with --smoke): membership-inference scores for benchmark items under Qwen3.

For each item: mean token loss, Min-K% Prob (k = 20, Shi et al. arXiv 2310.16789 Sec 3), Min-K%++ (z-scored token
log-probs, Zhang et al. arXiv 2404.02936 Sec 3) and the zlib ratio (Carlini et al. arXiv 2012.07805 Sec 6.1), on
  members?  the published test items (GSM8K, MATH-500, MMLU high_school_mathematics)
  controls  the same items with every number shifted (a GSM1k-style perturbation made by a script, same distribution
            apart from the numbers), so a difference reflects exposure to the exact strings, not topic or style.
Reports AUC per benchmark and model. Expected outcome, from Duan et al. (arXiv 2402.07841): near 0.5 unless the exact
items were seen many times.

Usage: python dg_mink.py --model <path to Qwen3 HF folder> [--device mps] [--smoke]
Output: $DC_SCRATCH/data/dg/mink/<model>.json
"""
import argparse
import json
import os
import re
import sys
import zlib

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

NUM = re.compile(r"\d+")


def perturb(s):
    return NUM.sub(lambda m: str(int(m.group(0)) + 3) if len(m.group(0)) < 7 else m.group(0), s)


def scores(text, tok, model, device):
    import torch
    ids = tok(text, return_tensors="pt", truncation=True, max_length=512).input_ids.to(device)
    with torch.inference_mode():
        logits = model(ids).logits[0, :-1].float()
    lp = torch.log_softmax(logits, -1)
    tgt = ids[0, 1:]
    tl = lp.gather(1, tgt[:, None])[:, 0]
    mu = (lp.exp() * lp).sum(-1)
    sigma = ((lp.exp() * lp.pow(2)).sum(-1) - mu.pow(2)).clamp_min(1e-6).sqrt()
    zpp = (tl - mu) / sigma
    k = max(1, int(0.2 * len(tl)))
    loss = float(-tl.mean())
    return {"loss": loss, "mink": float(tl.sort().values[:k].mean()), "minkpp": float(zpp.sort().values[:k].mean()),
            "zlib": loss / len(zlib.compress(text.encode()))}


def auc(pos, neg):
    pos, neg = np.asarray(pos), np.asarray(neg)
    return float(((pos[:, None] > neg[None, :]).mean() + 0.5 * (pos[:, None] == neg[None, :]).mean()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    torch.set_num_threads(4)
    tok = AutoTokenizer.from_pretrained(a.model)
    model = AutoModelForCausalLM.from_pretrained(a.model, dtype=torch.float32).to(a.device).eval()
    mm = C.L.bench("mmlu_test")
    items = [it for it in C.bench_items() if it["bench"] in ("gsm8k_test", "math500_test")
             or (it["bench"] == "mmlu_test" and mm.subject[it["idx"]] == "high_school_mathematics")]
    if a.smoke:
        items = items[:3]
    res = []
    for it in items:
        t = it["full"]
        res.append({"bench": it["bench"], "idx": it["idx"], "orig": scores(t, tok, model, a.device),
                    "pert": scores(perturb(t), tok, model, a.device)})
    out = {"model": os.path.basename(a.model.rstrip("/")), "n": len(res), "auc": {}}
    for b in sorted({r["bench"] for r in res}):
        R = [r for r in res if r["bench"] == b]
        # higher membership score = more likely member: use -loss, mink, minkpp, -zlib
        out["auc"][b] = {m: auc([s * r["orig"][m] for r in R], [s * r["pert"][m] for r in R])
                         for m, s in (("loss", -1), ("mink", 1), ("minkpp", 1), ("zlib", -1))}
    od = C.out_dir("mink")
    json.dump({"summary": out, "items": res}, open(os.path.join(od, out["model"] + (".smoke" if a.smoke else "")
                                                                + ".json"), "w"))
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
