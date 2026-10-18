"""fo_common.py: shared helpers for the Families and objectives runs.

Reuses the topic's running example unchanged (the root's src/data/tiny_gpt.py, its tokenizer, its TinyStories token
arrays and the reference checkpoint ref_baseline_s1500). Nothing in src/data is edited: the attention mask is changed
by swapping tiny_gpt.attn_bias for a version that reads MASK below, and forcing the explicit (non-SDPA) path.

Paths come from the environment: LA_SCRATCH (the topic scratch folder holding data/ and runs/).
"""
import json, math, os, sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

HERE = Path(__file__).resolve().parent
ROOT_DATA = HERE.parents[2] / "src" / "data"
sys.path.insert(0, str(ROOT_DATA))
import tiny_gpt  # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = Path(os.environ["LA_SCRATCH"])
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)

# ------------------------------------------------------------------------------------------- the attention mask
# MASK["mode"]: "causal" (decoder-only), "bidir" (encoder: every token sees every token),
#               "prefix" (prefix LM: the first MASK["prefix"] tokens see each other both ways, the rest are causal)
MASK = {"mode": "causal", "prefix": 0}
_orig_attn_bias = tiny_gpt.attn_bias


def attn_bias(cfg, layer_idx, q_pos, k_pos, device, slopes=None):
    diff = q_pos[:, None] - k_pos[None, :]
    if MASK["mode"] == "causal":
        keep = diff >= 0
    elif MASK["mode"] == "bidir":
        keep = torch.ones_like(diff, dtype=torch.bool)
    elif MASK["mode"] == "prefix":
        keep = (diff >= 0) | (k_pos[None, :] < MASK["prefix"])
    else:
        raise ValueError(MASK["mode"])
    return torch.zeros(keep.shape, device=device).masked_fill(~keep, float("-inf"))[None]


def enable_masks():
    """Route every attention layer through attn_bias above (the explicit softmax path; no window is set)."""
    tiny_gpt.attn_bias = attn_bias
    tiny_gpt.is_local = lambda cfg, li: True


def mask_matrix(mode, T, prefix=0):
    q = torch.arange(T)
    MASK.update(mode=mode, prefix=prefix)
    m = attn_bias(None, 0, q, q, "cpu")[0]
    MASK.update(mode="causal", prefix=0)
    return (m == 0).int().tolist()


# ------------------------------------------------------------------------------------------- data and models
def load_ref(name="ref_baseline_s1500", vocab_extra=0):
    ck = torch.load(SCR / "runs" / name / "ckpt.pt", map_location="cpu", weights_only=False)
    cfg = dict(ck["config"])
    sd = ck["model"]
    if vocab_extra:  # add rows (a [MASK] token) to the tied embedding, initialised like the others
        cfg["vocab_size"] += vocab_extra
        w = sd["wte.weight"]
        new = torch.randn(vocab_extra, w.shape[1]) * 0.02
        sd = dict(sd); sd["wte.weight"] = torch.cat([w, new]); sd["lm_head.weight"] = sd["wte.weight"]
    model = GPT(GPTConfig(**cfg))
    model.load_state_dict(sd)
    return model


class Batches:
    """Random windows from the token memmap, seeded (the same generator as src/data/train.py)."""

    def __init__(self, split, batch, ctx, seed):
        self.data = np.memmap(SCR / "data" / f"{split}.bin", dtype=np.uint16, mode="r")
        self.batch, self.ctx = batch, ctx
        self.rng = np.random.default_rng(seed)

    def next(self):
        ix = self.rng.integers(0, len(self.data) - self.ctx - 1, self.batch)
        x = np.stack([self.data[i:i + self.ctx + 1].astype(np.int64) for i in ix])
        return torch.from_numpy(x)


def running_sequence():
    return json.load(open(ROOT_DATA / "running_sequence.json"))


def eval_prompts():
    return json.load(open(ROOT_DATA / "eval_prompts.json"))


def tokenizer():
    from tokenizers import Tokenizer
    return Tokenizer.from_file(str(ROOT_DATA / "tokenizer.json"))


def trunk(model, idx):
    """Final residual stream (before ln_f) and logits of the main model, for the MTP modules."""
    x, pos = model.embed(idx)
    for b in model.blocks:
        x, _, _ = b(x, pos)
    return x, model.lm_head(model.ln_f(x))


def dump(name, obj):
    p = OUT / name
    json.dump(obj, open(p, "w"), indent=None, separators=(",", ":"))
    print("wrote", p.relative_to(HERE.parent))
