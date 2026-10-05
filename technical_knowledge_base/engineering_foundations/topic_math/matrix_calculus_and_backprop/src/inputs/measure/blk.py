"""A tiny pre-LN transformer block written with explicit ops, so the autograd graph shows every step.
Shared by graph.py (the real grad_fn graph), cost.py (FLOPs, time, memory) and ckpt.py (activation checkpointing)."""
import math, torch
import torch.nn.functional as F


def make_params(d, h, f, V, L=1, seed=0, dtype=torch.float32):
    g = torch.Generator().manual_seed(seed)
    def W(*s):
        return (torch.randn(*s, generator=g, dtype=dtype) / math.sqrt(s[-1])).requires_grad_()
    def ones(n):
        return torch.ones(n, dtype=dtype).requires_grad_()
    def zeros(n):
        return torch.zeros(n, dtype=dtype).requires_grad_()
    layers = []
    for _ in range(L):
        layers.append(dict(ln1_w=ones(d), ln1_b=zeros(d), Wqkv=W(3 * d, d), Wo=W(d, d),
                           ln2_w=ones(d), ln2_b=zeros(d), W1=W(f, d), b1=zeros(f), W2=W(d, f), b2=zeros(d)))
    emb = W(V, d)
    return dict(layers=layers, emb=emb, lnf_w=ones(d), lnf_b=zeros(d), h=h)


def block(x, p, h, names=None):
    """x: (B, T, d). Returns (B, T, d). names: optional dict that receives every named intermediate."""
    B, T, d = x.shape
    hd = d // h
    def keep(n, t):
        if names is not None:
            names[n] = t
        return t
    a = keep("ln1", F.layer_norm(x, (d,), p["ln1_w"], p["ln1_b"]))
    qkv = keep("qkv", a @ p["Wqkv"].t())                       # (B, T, 3d)
    q, k, v = qkv.split(d, dim=-1)
    q = q.view(B, T, h, hd).transpose(1, 2)                    # (B, h, T, hd)
    k = k.view(B, T, h, hd).transpose(1, 2)
    v = v.view(B, T, h, hd).transpose(1, 2)
    s = keep("scores", (q @ k.transpose(-2, -1)) / math.sqrt(hd))   # (B, h, T, T)
    mask = torch.ones(T, T, dtype=torch.bool, device=x.device).tril()
    s = keep("masked", s.masked_fill(~mask, float("-inf")))
    P = keep("probs", torch.softmax(s, dim=-1))
    o = keep("attn_out", P @ v)                                  # (B, h, T, hd)
    o = o.transpose(1, 2).reshape(B, T, d)
    x = keep("resid1", x + o @ p["Wo"].t())
    m = keep("ln2", F.layer_norm(x, (d,), p["ln2_w"], p["ln2_b"]))
    u = keep("up", m @ p["W1"].t() + p["b1"])
    g = keep("gelu", F.gelu(u))
    x = keep("resid2", x + g @ p["W2"].t() + p["b2"])
    return x


def model_loss(tokens, P, ckpt_every=0, names=None):
    """tokens: (B, T+1) ints; next-token loss with tied embeddings."""
    from torch.utils.checkpoint import checkpoint
    inp, tgt = tokens[:, :-1], tokens[:, 1:]
    x = P["emb"][inp]
    if names is not None:
        names["embed"] = x
    for i, lp in enumerate(P["layers"]):
        if ckpt_every and i % ckpt_every == 0:
            x = checkpoint(block, x, lp, P["h"], use_reentrant=False)
        else:
            x = block(x, lp, P["h"], names if i == 0 else None)
    x = F.layer_norm(x, (x.shape[-1],), P["lnf_w"], P["lnf_b"])
    logits = x @ P["emb"].t()
    if names is not None:
        names["logits"] = logits
    return F.cross_entropy(logits.reshape(-1, logits.shape[-1]), tgt.reshape(-1))
