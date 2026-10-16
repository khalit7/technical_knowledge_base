"""GPU queue job 2: Qwen3-1.7B perplexity (first 512 tokens) on the root's 2,000 FineWeb CC-MAIN-2024-30 rows (seed 0,
the same rows as the root's q_score.py "fw" sample and this page's fw2k set).
Method copied from the root Quality lab's q_ppl.py: model in float16 on the GPU, log-softmax in float32, 128 positions at a time
(a float32 1.7B model thrashed swap on this 16 GB machine). Resumable: appends to $DC_SCRATCH/qc/qwen17_fw2k.jsonl.
usage: qc_qwen_ppl.py --device mps"""
import argparse
import json
import math
import os
import time

import qc_common as C
import qc_encoders as E

ap = argparse.ArgumentParser()
ap.add_argument("--device", default="mps")
ap.add_argument("--max-tokens", type=int, default=512)
ap.add_argument("--model", default=os.path.join(C.L.scratch(), "..", "inf", "models", "hf", "Qwen3-1.7B"))
a = ap.parse_args()

import torch  # noqa: E402
from transformers import AutoModelForCausalLM, AutoTokenizer  # noqa: E402

torch.set_num_threads(2)
tok = AutoTokenizer.from_pretrained(a.model)
m = AutoModelForCausalLM.from_pretrained(a.model, dtype=torch.float16 if a.device != "cpu" else torch.float32).to(a.device).eval()
texts, _ = E.sets("fw2k")
outp = C.sdir("qwen17_fw2k.jsonl")
done = sum(1 for _ in open(outp)) if os.path.exists(outp) else 0
out = open(outp, "a")
t0 = time.time()
for k in range(done, len(texts)):
    enc = tok(texts[k], return_tensors="pt", truncation=True, max_length=a.max_tokens).to(a.device)
    with torch.no_grad():
        lg = m(**enc).logits[0, :-1]
        tgt = enc["input_ids"][0, 1:]
        nll = 0.0
        for s in range(0, lg.shape[0], 128):
            lp = torch.log_softmax(lg[s:s + 128].float(), dim=-1)
            nll -= lp.gather(1, tgt[s:s + 128, None]).sum().item()
        loss = nll / max(1, tgt.shape[0])
    out.write(json.dumps({"row": k, "tokens": int(enc["input_ids"].shape[1]), "nll": loss, "ppl": math.exp(loss)}) + "\n")
    out.flush()
    if k % 50 == 0:
        if a.device == "mps":
            torch.mps.empty_cache()
        print(k, round(time.time() - t0, 1), "s", flush=True)
print("done", len(texts), "in", round(time.time() - t0), "s", flush=True)
