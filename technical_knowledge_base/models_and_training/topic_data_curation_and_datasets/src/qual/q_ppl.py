"""Perplexity filtering, CCNet style, with a small local LM instead of a KenLM Wikipedia model.

CCNet (Wenzek et al. 2019, arXiv 1911.00359) scores each paragraph with a 5-gram KenLM model trained on
Wikipedia and splits each language into head / middle / tail thirds by perplexity. KenLM's English model is
4.44 GB and needs a compiled package, so this script uses Qwen3-0.6B (a 0.6B-parameter LM trained on web-scale
data; local copy in the shared model store) and computes per-document perplexity over the first --max-tokens
tokens. That is a different reference distribution from Wikipedia: say so wherever the numbers are shown.

usage: q_ppl.py --set run0|sample --device cpu|mps|cuda [--limit N] [--max-tokens 512]
  run0  : all 2,617 run0 final documents   (pending GPU run; ~10 min on one M1 Pro GPU, hours on 4 CPU threads)
  sample: the hand-labelled sample in labels.jsonl (CPU is fine)
Writes $DC_SCRATCH/q/ppl_<set>.jsonl: id, tokens, mean NLL (nats/token), ppl.
"""
import argparse
import json
import math
import os
import time

import q_common as Q

L = Q.L
ap = argparse.ArgumentParser()
ap.add_argument("--set", default="sample")
ap.add_argument("--device", default="cpu")
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--max-tokens", type=int, default=512)
ap.add_argument("--model", default=os.path.join(L.scratch(), "..", "inf", "models", "hf", "Qwen3-0.6B"))
a = ap.parse_args()

import torch  # noqa: E402
from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

Q.threads()
tok = AutoTokenizer.from_pretrained(a.model)
m = AutoModelForCausalLM.from_pretrained(a.model, dtype=torch.float32 if a.device == "cpu" else torch.float16).to(a.device).eval()

docs = {d["id"]: d["text"] for d in L.run0("final")}
if a.set == "sample":
    ids = [json.loads(x)["id"] for x in open(os.path.join(Q.HERE, "labels.jsonl"))]
else:
    ids = list(docs)
if a.limit:
    ids = ids[: a.limit]
out = open(Q.qdir(f"ppl_{a.set}.jsonl"), "w")
t0 = time.time()
for k, i in enumerate(ids):
    enc = tok(docs[i], return_tensors="pt", truncation=True, max_length=a.max_tokens).to(a.device)
    with torch.no_grad():
        lg = m(**enc).logits[0, :-1]  # half precision on the GPU; log-softmax in float32, 128 positions at a time
        tgt = enc["input_ids"][0, 1:]
        nll = 0.0
        for s in range(0, lg.shape[0], 128):
            lp = torch.log_softmax(lg[s:s + 128].float(), dim=-1)
            nll -= lp.gather(1, tgt[s:s + 128, None]).sum().item()
        loss = nll / max(1, tgt.shape[0])
    out.write(json.dumps({"id": i, "tokens": int(enc["input_ids"].shape[1]), "nll": loss, "ppl": math.exp(loss)}) + "\n")
    out.flush()
    if k % 25 == 0:
        print(k, round(time.time() - t0, 1), "s", flush=True)
print("done", len(ids), "docs in", round(time.time() - t0), "s")
if a.limit:  # smoke test: record the rough timing used for the GPU-queue estimate
    json.dump({"n": len(ids), "device": a.device, "max_tokens": a.max_tokens, "secs_per_doc": (time.time() - t0) / len(ids),
               "note": "rough, shared machine, 4 threads, low priority"}, open(os.path.join(Q.OUT, "q_ppl_smoke.json"), "w"), indent=1)
