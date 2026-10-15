"""Encoder classifiers on CPU (float32, first 512 tokens): NVIDIA's two FineWeb-Edu-style regressors used in the
Nemotron-CC ensemble, and WebOrganizer's topic and format classifiers (for the bias analysis).
  nemo_mixtral  nvidia/nemocurator-fineweb-mixtral-edu-classifier @ 768fe255 (Mixtral 8x22B annotations)
  nemo_nemotron nvidia/nemocurator-fineweb-nemotron-4-edu-classifier @ 84231629 (Nemotron-4-340B annotations)
    scored exactly like NeMo Curator 1.4.0 FineWebModelStage (stages/text/classifiers/fineweb_edu.py:98-126): logits, clip 0..5
  wo_topic, wo_format  WebOrganizer/{Topic,Format}Classifier (gte-base-en-v1.5, 140M), input "{url}\\n\\n{text}" as the
    model card says; softmax over 24 classes. trust_remote_code loads the modeling.py pinned in the downloaded revision
    (read before running: torch and transformers imports only). Truncated at 512 tokens here for CPU cost (the
    encoder accepts 8,192): a departure, said on the page.
Sets: run0 (2,617), nemo (1,000 Nemotron-CC head docs, 200 per level, same rows as the root's q_score.py nemo),
fw2k (the root's 2,000 FineWeb rows, seed 0).
Output: $DC_SCRATCH/qc/scores/<model>__<set>.npy
usage: qc_encoders.py <model> [set ...]"""
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

SD = C.sdir("scores", "x")[:-1]
PATHS = {"nemo_mixtral": C.ddir("models", "nemo_mixtral_edu"), "nemo_nemotron": C.ddir("models", "nemo_nemotron_edu"),
         "wo_topic": C.ddir("models", "wo_topic"), "wo_format": C.ddir("models", "wo_format")}


def sets(name):
    if name == "run0":
        d = C.run0_final()
        return [x["text"] for x in d], [x["url"] for x in d]
    if name == "nemo":
        t, u = [], []
        for qb in ["high", "medium-high", "medium", "medium-low", "low"]:
            for x in C.L.nemotron(qb, limit=200):
                t.append(x["text"]); u.append(x["url"])
        return t, u
    if name == "fw50k":  # pending GPU run (run_pending.sh)
        f = C.L.curated("fineweb_rand50k", columns=["url", "text"])
        return f.text.tolist(), f.url.tolist()
    if name == "fw2k":
        f = C.L.curated("fineweb_rand50k", columns=["url", "text"])
        idx = np.sort(np.random.default_rng(0).choice(len(f), 2000, replace=False))
        sub = f.iloc[idx]
        return sub.text.tolist(), sub.url.tolist()


def run(model, texts, urls, batch=16):
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    p = PATHS[model]
    tok = AutoTokenizer.from_pretrained(p)
    kw = {"trust_remote_code": True, "use_memory_efficient_attention": False, "unpad_inputs": False} if model.startswith("wo_") else {}
    dev = os.environ.get("QC_DEVICE", "cpu")  # the GPU queue sets mps
    if model.startswith("wo_"):
        # transformers 5 builds models on the meta device and leaves the remote code's non-persistent buffers
        # (rotary inv_freq, cos/sin caches, position_ids) uninitialised, which crashed the first run (index out of
        # bounds in modeling.py:392). Build on CPU from the config, then load the weights.
        from transformers import AutoConfig
        from safetensors.torch import load_file
        cfg = AutoConfig.from_pretrained(p, **kw)
        m = AutoModelForSequenceClassification.from_config(cfg, trust_remote_code=True)
        missing, unexpected = m.load_state_dict(load_file(os.path.join(p, "model.safetensors")), strict=False)
        assert not unexpected and all(("position_ids" in k or "inv_freq" in k or "cached" in k) for k in missing), (missing, unexpected)
        m = m.float().to(dev).eval()

        def ext_mask(self, attention_mask, input_shape, device=None, dtype=None):
            # transformers 4.x ModuleUtilsMixin.get_extended_attention_mask (removed in 5.x), for a 2-D padding mask
            dt = dtype or torch.float32
            em = attention_mask[:, None, None, :].to(dt)
            return (1.0 - em) * torch.finfo(dt).min
        for mod in m.modules():
            if type(mod).__name__ == "NewModel" and not hasattr(type(mod), "get_extended_attention_mask"):
                type(mod).get_extended_attention_mask = ext_mask
    else:
        m = AutoModelForSequenceClassification.from_pretrained(p, dtype=torch.float32, **kw).to(dev).eval()
    inp = [f"{u}\n\n{t}" for u, t in zip(urls, texts)] if model.startswith("wo_") else texts
    order = sorted(range(len(inp)), key=lambda i: len(inp[i]))
    res = [None] * len(inp)
    for s in range(0, len(order), batch):
        idx = order[s:s + batch]
        enc = tok([inp[i] for i in idx], return_tensors="pt", padding="longest", truncation=True, max_length=512).to(dev)
        with torch.no_grad():
            lg = m(**enc).logits.float().cpu()
        out = lg.softmax(-1).numpy() if model.startswith("wo_") else lg.squeeze(-1).numpy().reshape(-1)
        for i, v in zip(idx, out):
            res[i] = v
    return np.array(res, dtype=np.float32)


if __name__ == "__main__":
    model = sys.argv[1]
    for st in sys.argv[2:] or ["run0", "nemo", "fw2k"]:
        p = os.path.join(SD, f"{model}__{st}.npy")
        if os.path.exists(p):
            continue
        t, u = sets(st)
        t0 = time.time()
        r = run(model, t, u)
        np.save(p, r)
        print(model, st, r.shape, f"{(time.time() - t0) / len(t):.3f} s/doc rough", flush=True)
