"""Perplexity under a small reference LM on CPU: EleutherAI/pythia-160m @ 50f5173d (trained on the Pile; the scale of
the 125M reference models in Ankner et al. 2024, "Perplexed by Perplexity", arXiv 2405.20541).
Mean token negative log-likelihood over the first 512 tokens of each document (as the root's q_ppl.py does for Qwen3).
Sets: run0 (2,617) and fw2k (the root's 2,000 FineWeb rows). Output: $DC_SCRATCH/qc/scores/pythia160m_nll__<set>.npy
usage: qc_ppl.py [set ...]"""
import os
import sys
import time

import numpy as np
import torch

torch.set_num_threads(min(4, int(os.environ.get("OMP_NUM_THREADS", "4"))))
try:
    torch.set_num_interop_threads(1)
except RuntimeError:
    pass

import qc_common as C
import qc_encoders as E

SD = C.sdir("scores", "x")[:-1]


def main(sets):
    from transformers import AutoModelForCausalLM, AutoTokenizer
    p = os.environ.get("QC_LM", C.ddir("models", "pythia160m"))  # the GPU queue passes a Qwen3 path
    tag = "pythia160m" if "QC_LM" not in os.environ else os.path.basename(p.rstrip("/")).lower()
    dev = os.environ.get("QC_DEVICE", "cpu")
    tok = AutoTokenizer.from_pretrained(p)
    m = AutoModelForCausalLM.from_pretrained(p, dtype=torch.float32).to(dev).eval()
    for st in sets:
        out = os.path.join(SD, f"{tag}_nll__{st}.npy")
        if os.path.exists(out):
            continue
        texts, _ = E.sets(st)
        t0 = time.time()
        res = np.zeros(len(texts), dtype=np.float32)
        for i, t in enumerate(texts):
            ids = tok(t, return_tensors="pt", truncation=True, max_length=512).input_ids.to(dev)
            if ids.shape[1] < 2:
                res[i] = np.nan
                continue
            with torch.no_grad():
                res[i] = float(m(ids, labels=ids).loss)
        np.save(out, res)
        print(st, len(texts), f"{(time.time() - t0) / len(texts):.3f} s/doc rough", float(np.nanmedian(np.exp(res))), flush=True)


if __name__ == "__main__":
    main(sys.argv[1:] or ["run0", "fw2k"])
