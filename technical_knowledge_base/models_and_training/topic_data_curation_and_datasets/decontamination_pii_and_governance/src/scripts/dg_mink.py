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
        logits = model(ids).logits[0, :-1]
        tgt = ids[0, 1:]
        tls, mus, sigs = [], [], []
        for a in range(0, logits.shape[0], 64):  # float32 log-softmax in chunks of 64 positions: bounded memory
            lp = torch.log_softmax(logits[a:a + 64].float(), -1)
            p = lp.exp()
            mu_ = (p * lp).sum(-1)
            tls.append(lp.gather(1, tgt[a:a + 64, None])[:, 0])
            mus.append(mu_)
            sigs.append(((p * lp.pow(2)).sum(-1) - mu_.pow(2)).clamp_min(1e-6).sqrt())
            del lp, p
        tl, mu, sigma = torch.cat(tls).cpu(), torch.cat(mus).cpu(), torch.cat(sigs).cpu()
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
    ap.add_argument("--dtype", default="float32", choices=["float32", "float16", "bfloat16"],
                    help="weights; log-softmax is always float32")
    a = ap.parse_args()
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    torch.set_num_threads(4)
    tok = AutoTokenizer.from_pretrained(a.model)
    model = AutoModelForCausalLM.from_pretrained(a.model, dtype=getattr(torch, a.dtype)).to(a.device).eval()
    mm = C.L.bench("mmlu_test")
    items = [it for it in C.bench_items() if it["bench"] in ("gsm8k_test", "math500_test")
             or (it["bench"] == "mmlu_test" and mm.subject[it["idx"]] == "high_school_mathematics")]
    if a.smoke:
        items = items[:3]
    res = []
    for k, it in enumerate(items):
        if k % 200 == 0:
            print("item", k, "of", len(items), flush=True)
            if a.device == "mps":
                torch.mps.empty_cache()
        t = it["full"]
        res.append({"bench": it["bench"], "idx": it["idx"], "orig": scores(t, tok, model, a.device),
                    "pert": scores(perturb(t), tok, model, a.device)})
    out = {"model": os.path.basename(a.model.rstrip("/")), "dtype": a.dtype, "n": len(res), "auc": {}}
    for b in sorted({r["bench"] for r in res}):
        R = [r for r in res if r["bench"] == b]
        # higher membership score = more likely member: use -loss, mink, minkpp, -zlib
        out["auc"][b] = {m: auc([s * r["orig"][m] for r in R], [s * r["pert"][m] for r in R])
                         for m, s in (("loss", -1), ("mink", 1), ("minkpp", 1), ("zlib", -1))}
    od = C.out_dir("mink")
    json.dump({"summary": out, "items": res}, open(os.path.join(od, out["model"] + "." + a.dtype + (".smoke" if a.smoke else "")
                                                                + ".json"), "w"))
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
