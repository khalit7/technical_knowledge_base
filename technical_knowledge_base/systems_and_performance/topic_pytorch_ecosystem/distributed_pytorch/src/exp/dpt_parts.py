"""Run-time adapters around the running example (imported unchanged from the root's src/model):
SplitQKVAttention (q, k, v as separate Linears, so a column split keeps whole heads) and Piece (a contiguous run of
blocks for a pipeline stage)."""
import torch
import torch.nn as nn
import torch.nn.functional as F


class SplitQKVAttention(nn.Module):
    """The same attention as model.CausalSelfAttention, with q, k, v as separate Linears (weights copied)."""
    def __init__(self, src, head_dim):
        super().__init__()
        C = src.qkv.in_features
        self.hd = head_dim
        self.q, self.k, self.v = (nn.Linear(C, C) for _ in range(3))
        with torch.no_grad():
            for i, lin in enumerate((self.q, self.k, self.v)):
                lin.weight.copy_(src.qkv.weight[i * C:(i + 1) * C]); lin.bias.copy_(src.qkv.bias[i * C:(i + 1) * C])
        self.proj = src.proj

    def forward(self, x):
        B, T, _ = x.shape
        q, k, v = self.q(x), self.k(x), self.v(x)          # local width = (heads on this rank) x head_dim
        h = q.shape[-1] // self.hd
        q, k, v = (t.view(B, T, h, self.hd).transpose(1, 2) for t in (q, k, v))
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        return self.proj(y.transpose(1, 2).contiguous().view(B, T, h * self.hd))


def split_qkv(model):
    hd = model.cfg.d_model // model.cfg.n_head
    for b in model.blocks:
        b.attn = SplitQKVAttention(b.attn, hd)
    return model


class Piece(nn.Module):
    """Blocks lo..hi-1, with the embeddings if lo == 0 and ln_f + head if hi == n_layer."""
    def __init__(self, m, lo, hi):
        super().__init__()
        self.lo, self.hi, self.L = lo, hi, m.cfg.n_layer
        if lo == 0: self.tok, self.pos = m.tok, m.pos
        self.blocks = nn.ModuleList(m.blocks[lo:hi])
        if hi == self.L: self.ln_f, self.head = m.ln_f, m.head

    def forward(self, x):
        if self.lo == 0: x = self.tok(x) + self.pos(torch.arange(x.shape[1]))
        for b in self.blocks: x = b(x)
        if self.hi == self.L: x = self.head(self.ln_f(x))
        return x
