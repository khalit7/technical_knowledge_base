"""The tiny GPT past its trained length (256 tokens): per-position held-out loss on 2,048-token windows of
TinyStories validation, with plain RoPE and with RoPE scaling applied at inference (no retraining), and for a
model fine-tuned briefly at 1,024 tokens (lc_pi_ft, see finetune_long.py). CPU, 4 threads, deterministic.
Writes out/past.json. For the Positional Encodings child too: every number here is reusable as is.
Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 python past_len.py"""
import json, os, sys, traceback
import numpy as np, torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DATA = os.path.join(HERE, "../../../src/data")
sys.path.insert(0, ROOT_DATA)
from tiny_gpt import GPT, GPTConfig

SCR = os.environ["LA_SCRATCH"]
torch.set_num_threads(4)
L, N, BIN = 2048, 24, 64


def windows():
    val = np.memmap(os.path.join(SCR, "data/val.bin"), dtype=np.uint16, mode="r")
    rng = np.random.default_rng(1234)
    offs = rng.integers(0, len(val) - L - 1, N)
    return torch.tensor(np.stack([val[o:o + L + 1].astype(np.int64) for o in offs]))


def load(name, scaling=None):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    cfg = dict(ck["config"])
    if scaling is not None:
        cfg["rope_scaling"] = scaling
    m = GPT(GPTConfig(**cfg)); m.load_state_dict(ck["model"]); return m.eval(), cfg


@torch.inference_mode()
def per_pos(m, W, length=L):
    tot = torch.zeros(length)
    for i in range(0, W.shape[0], 4):
        x, y = W[i:i + 4, :length], W[i:i + 4, 1:length + 1]
        lg, *_ = m(x)
        tot += F.cross_entropy(lg.float().transpose(1, 2), y, reduction="none").sum(0)
    return tot / W.shape[0]


def summarise(pp):
    b = lambda a, e: round(float(pp[a:e].mean()), 4)
    return {"0-255": b(0, 256), "256-511": b(256, 512), "512-1023": b(512, 1024), "1024-2047": b(1024, 2048),
            "curve": [round(float(pp[i:i + BIN].mean()), 3) for i in range(0, L, BIN)]}


def main():
    W = windows()
    out = {"length": L, "windows": N, "bin": BIN, "trained_ctx": 256, "runs": []}
    variants = [("plain", None), ("linear x4", {"type": "linear", "factor": 4}), ("linear x8", {"type": "linear", "factor": 8}),
                ("ntk x8", {"type": "ntk", "factor": 8}), ("yarn x8", {"type": "yarn", "factor": 8, "orig_ctx": 256})]
    models = [n for n in ["at_mha", "at_swa64", "lc_pi_ft", "lc_plain_ft"] if os.path.exists(os.path.join(SCR, "runs", n, "ckpt.pt"))]
    for name in models:
        for label, sc in variants:
            if name in ("lc_pi_ft",) and label != "linear x4":
                continue
            if name in ("lc_plain_ft", "at_swa64") and label != "plain":
                continue
            m, cfg = load(name, sc)
            r = {"model": name, "scaling": label, "window": cfg.get("window"), **summarise(per_pos(m, W))}
            out["runs"].append(r); print(name, label, {k: r[k] for k in ("0-255", "256-511", "512-1023", "1024-2047")}, flush=True)
    # learned positions: the error a reader hits
    try:
        m, _ = load("ref_baseline_s1500")
        per_pos(m, W[:1], 300)
    except Exception as e:
        out["learned_error"] = f"{type(e).__name__}: {e}"
    json.dump(out, open(os.path.join(HERE, "out/past.json"), "w"), indent=1)
    print(out.get("learned_error"))


if __name__ == "__main__":
    main()
