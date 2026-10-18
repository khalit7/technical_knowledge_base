"""Shared helpers for the MoE child page's CPU analyses of trained tiny-GPT checkpoints.

The tiny GPT lives in the root's src/data/ (read-only). This file re-implements tiny_gpt.MoE.forward with optional
interventions (capacity factor, top-k at inference, masking the top routed experts, switching the shared experts off)
and checks that with no intervention it gives exactly the original output (max abs difference 0).
Paths come from LA_SCRATCH (checkpoints in $LA_SCRATCH/runs/<name>/ckpt.pt); nothing user-specific is written.
"""
import json, math, os, sys
import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig, MoE  # noqa: E402

SCR = os.environ["LA_SCRATCH"]
ORIG_FORWARD = MoE.forward


def load(name):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"]))
    m.load_state_dict(ck["model"])
    return m.eval()


def moe_forward(self, x):
    """tiny_gpt.MoE.forward plus interventions read from self.opts (dict, may be empty):
    capacity_factor (float or None: overrides cfg), top_k (int), mask_top (int: hide the m highest-scoring experts
    from selection, DeepSeekMoE section 4.5), no_shared (bool), record_probs (bool: keep full router scores)."""
    o = getattr(self, "opts", {}) or {}
    cfg, (B, T, D) = self.cfg, x.shape
    xf = x.reshape(-1, D)
    n, E = xf.shape[0], cfg.n_experts
    k = o.get("top_k", cfg.top_k)
    logits = self.router(xf).float()
    scores = logits.sigmoid() if cfg.router == "sigmoid" else logits.softmax(-1)
    sel = scores + self.e_bias if cfg.balance == "bias" else scores
    m = o.get("mask_top", 0)
    if m:
        hide = sel.topk(m, -1).indices
        sel = sel.scatter(-1, hide, float("-inf"))
    top_i = sel.topk(k, -1).indices
    top_w = scores.gather(-1, top_i)
    if cfg.router == "sigmoid" or k > 1:
        top_w = top_w / top_w.sum(-1, keepdim=True)
    out = torch.zeros_like(xf)
    load = torch.bincount(top_i.flatten(), minlength=E)
    cf = o["capacity_factor"] if "capacity_factor" in o else cfg.capacity_factor
    cap = math.ceil(cf * n * k / E) if cf else None
    dropped = 0
    tok_dropped = torch.zeros(n, dtype=torch.long)
    for e in range(E):
        tok, slot = (top_i == e).nonzero(as_tuple=True)
        if cap is not None and tok.numel() > cap:
            dropped += tok.numel() - cap
            tok_dropped.index_add_(0, tok[cap:], torch.ones_like(tok[cap:]))
            tok, slot = tok[:cap], slot[:cap]
        if tok.numel():
            out.index_add_(0, tok, self.experts[e](xf[tok]) * top_w[tok, slot, None].to(x.dtype))
    if not o.get("no_shared"):
        for s in self.shared:
            out = out + s(xf)
    self.last = {"top_i": top_i.view(B, T, k), "top_w": top_w.view(B, T, k), "load": load,
                 "dropped_frac": dropped / max(1, n * k), "tok_all_dropped": int((tok_dropped == k).sum()),
                 "logits": logits.view(B, T, E) if o.get("record_probs") else None,
                 "scores": scores.view(B, T, E) if o.get("record_probs") else None}
    return out.view(B, T, D), xf.new_zeros(())


def set_opts(model, **opts):
    for b in model.blocks:
        if b.is_moe:
            b.ffn.opts = dict(opts)


MoE.forward = moe_forward


def val_batches(n_batches, batch=32, ctx=256, seed=1234):
    """The same fixed validation windows as train.held_out_loss (seed 1234), as CPU tensors."""
    data = np.memmap(os.path.join(SCR, "data", "val.bin"), dtype=np.uint16, mode="r")
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n_batches):
        ix = rng.integers(0, len(data) - ctx - 1, batch)
        x = torch.from_numpy(np.stack([data[i:i + ctx + 1].astype(np.int64) for i in ix]))
        out.append((x[:, :-1], x[:, 1:]))
    return out


def check_identical(model, x):
    """The re-implemented forward with no options equals the original tiny_gpt.MoE.forward exactly."""
    set_opts(model)
    with torch.inference_mode():
        a = model(x)[0]
        MoE.forward = ORIG_FORWARD
        b = model(x)[0]
        MoE.forward = moe_forward
    return float((a - b).abs().max())


def jdump(obj, path):
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"))
