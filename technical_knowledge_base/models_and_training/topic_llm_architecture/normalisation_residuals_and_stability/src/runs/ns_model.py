"""Normalisation, residuals and stability page: switches the shared tiny GPT does not have, added by patching at
import (the root's src/data is read-only for children). Nothing changes unless a switch is set in NS.

NS["norm_pos"] = "output"   OLMo 2's reordered norm: x = x + Norm(F(x)), the branch reads the raw stream
                            (tiny_gpt already has pre, post and sandwich).
NS["attn_softcap"] = c      Gemma 2's attention-logit soft cap: s = c * tanh(s / c) before the mask.
NS["probe"] = True          the next forward records, per layer, the largest attention logit (scaled q.k over
                            causal positions), the mean attention entropy and the mean largest weight per row,
                            in NS["stats"]. Used on a fixed probe batch under no_grad, never on training batches.
NS["init"] = "flat"         every Linear N(0, 0.02): no GPT-2 1/sqrt(2L) scaling of the residual-branch outputs.
Only the MHA / GQA / MQA attention path is re-implemented (all runs on this page use it).
"""
import math, os, sys
import torch
import torch.nn.functional as F

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data")
sys.path.insert(0, os.path.abspath(DATA))
import tiny_gpt  # noqa: E402

NS = {"norm_pos": None, "attn_softcap": None, "probe": False, "stats": [], "init": "gpt2"}
_attn_fwd0 = tiny_gpt.Attention.forward
_block_fwd0 = tiny_gpt.Block.forward
_init0 = tiny_gpt.GPT._init


def attn_forward(self, x, pos, cache=None, record=False):
    cfg = self.cfg
    if cfg.attn == "mla" or cache is not None or not (NS["probe"] or NS["attn_softcap"] or record):
        if NS["attn_softcap"] and cfg.attn == "mla":
            raise NotImplementedError("softcap on MLA")
        return _attn_fwd0(self, x, pos, cache, record)
    B, T = x.shape[0], x.shape[1]
    H, Hk, hd = self.H, self.Hk, self.hd
    q = self.q(x).view(B, T, H, hd).transpose(1, 2)
    k = self.k(x).view(B, T, Hk, hd).transpose(1, 2)
    v = self.v(x).view(B, T, Hk, hd).transpose(1, 2)
    if cfg.qk_norm:
        q, k = self.q_norm(q), self.k_norm(k)
    if self.rope is not None:
        q, k = self.rope(q, pos), self.rope(k, pos)
    if Hk != H:
        k = k.repeat_interleave(H // Hk, 1); v = v.repeat_interleave(H // Hk, 1)
    s = (q @ k.transpose(-2, -1)) * self.scale                     # (B,H,T,T) attention logits
    raw = s
    c = NS["attn_softcap"]
    if c:
        s = c * torch.tanh(s / c)
    bias = tiny_gpt.attn_bias(cfg, self.li, pos, pos, x.device, self.slopes)[None]
    s = s + bias
    w = s.float().softmax(-1).to(q.dtype)
    if NS["probe"]:
        keep = torch.isfinite(bias)                               # (1,1|H,T,T)
        rmax = raw.masked_fill(~keep, float("-inf")).amax(dim=(0, 2, 3))        # per head
        ent = -(w.clamp_min(1e-12).log() * w).sum(-1)              # (B,H,T)
        NS["stats"].append({"max_logit": rmax.max().item(), "max_logit_head": rmax.tolist(),
                            "entropy": ent[:, :, 1:].mean().item(),
                            "top_w": w.amax(-1)[:, :, 1:].mean().item(),
                            "q_norm": q.norm(dim=-1).mean().item(), "k_norm": k.norm(dim=-1).mean().item()})
    y = (w @ v).transpose(1, 2).reshape(B, T, H * hd)
    return self.o(y), (w if record else None)


def block_forward(self, x, pos, cache=None, record=False):
    if NS["norm_pos"] != "output":
        return _block_fwd0(self, x, pos, cache, record)
    a, w = self.mix(x, pos, cache, record)       # OLMo 2: the branch reads the raw stream ...
    x = x + self.n1(a)                           # ... and its output is normalised before the add
    f, aux = self._ffn(x)
    x = x + self.n2(f)
    return x, w, aux


def gpt_init(self, m):
    if NS["init"] == "flat" and isinstance(m, torch.nn.Linear):
        torch.nn.init.normal_(m.weight, 0.0, self.cfg.init_std)
        if m.bias is not None:
            torch.nn.init.zeros_(m.bias)
        return
    return _init0(self, m)


tiny_gpt.Attention.forward = attn_forward
tiny_gpt.Block.forward = block_forward
tiny_gpt.GPT._init = gpt_init


def probe(model, idx):
    """One no_grad forward on idx with attention statistics on; returns per-layer stats, residual norms, logits."""
    NS["probe"], NS["stats"] = True, []
    try:
        with torch.no_grad():
            logits, _, _, rec = model(idx, record=True)
    finally:
        NS["probe"] = False
    st = NS["stats"]; NS["stats"] = []
    return st, rec, logits
