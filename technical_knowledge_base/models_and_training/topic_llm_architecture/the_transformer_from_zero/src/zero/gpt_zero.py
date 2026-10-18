"""gpt_zero.py: a decoder-only GPT written from an empty file, one step at a time.

Each block between "# ==== STEP n" markers is one step of the page's Build-it-up tab; steps.py runs every
step's test on the running sequence and records the shapes and outputs. With every switch at its default this
file builds exactly the tiny GPT's "baseline" preset (Topic: llm-architecture, src/data/tiny_gpt.py): the same
5,836,032 parameters, created and initialised in the same order, so a seeded run starts from the same weights,
and load_tiny() loads a trained tiny_gpt checkpoint and reproduces its logits.

Shapes: B batch, T tokens, D d_model, H heads, hd = D / H head size, V vocabulary, F FFN hidden size.
"""
import math
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F


# ==== STEP 1: the config. Every number the model needs, and the switches the ablations turn off.
@dataclass
class Config:
    vocab: int = 4096        # V: the running example's byte-level BPE
    ctx: int = 256           # T max: the training context
    d: int = 256             # D: width of the residual stream
    n_layer: int = 6         # L: blocks
    n_head: int = 8          # H: heads per attention layer, hd = D / H = 32
    ffn_mult: int = 4        # F = 4 D = 1,024
    swiglu: bool = False     # SwiGLU FFN instead of GELU (F = 8/3 D rounded up to 32: 704)
    # ablation switches: all True is the baseline
    pos: bool = True         # learned position table
    resid: bool = True       # x + sublayer(x); False: x = sublayer(x)
    norm: bool = True        # LayerNorm before each sublayer and before the head; False: no norm anywhere
    attn: bool = True        # the attention sublayer
    ffn: bool = True         # the feed-forward sublayer

    @property
    def hd(self):
        return self.d // self.n_head

    @property
    def f(self):
        return 32 * ((int(8 * self.d / 3) + 31) // 32) if self.swiglu else self.ffn_mult * self.d


# ==== STEP 2: embedding. Token ids (B, T) become vectors (B, T, D): one row of a V x D table per token,
# plus one row of a ctx x D table per position.
class Embedding(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.tok = nn.Embedding(cfg.vocab, cfg.d)                         # (V, D)
        self.pos = nn.Embedding(cfg.ctx, cfg.d) if cfg.pos else None      # (ctx, D)

    def forward(self, idx, start=0):
        B, T = idx.shape
        x = self.tok(idx)                                                 # (B, T, D)
        if self.pos is not None:
            x = x + self.pos(torch.arange(start, start + T, device=idx.device))  # (T, D) broadcast over B
        return x


# ==== STEP 3: one attention head, by hand. Each token asks a question (q), offers a label (k) and a
# payload (v); scores q.k / sqrt(hd); the causal mask hides the future; softmax turns scores into weights.
def one_head(x, Wq, Wk, Wv):
    """x (T, D); W* (D, hd). Returns (T, hd) and the (T, T) weights."""
    T = x.shape[0]
    q, k, v = x @ Wq, x @ Wk, x @ Wv                                      # each (T, hd)
    s = q @ k.T / math.sqrt(q.shape[-1])                                  # (T, T): row i = token i's scores
    future = torch.triu(torch.ones(T, T, dtype=torch.bool, device=x.device), 1)
    s = s.masked_fill(future, float("-inf"))                              # token i sees tokens 0..i only
    w = s.softmax(-1)                                                     # rows sum to 1
    return w @ v, w


# ==== STEP 4: all heads at once. One (D, D) matrix per q, k, v; split D into H heads of hd, move heads
# before T so each head is a batch of (T, hd) matrices; attend; merge heads back; output projection.
class CausalSelfAttention(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        D = cfg.d
        self.H, self.hd = cfg.n_head, cfg.hd
        self.q = nn.Linear(D, D, bias=False)                              # weight stored (out, in) = (D, D)
        self.k = nn.Linear(D, D, bias=False)
        self.v = nn.Linear(D, D, bias=False)
        self.o = nn.Linear(D, D, bias=False)
        self.o.is_residual_out = True

    def forward(self, x, cache=None, manual=False):
        B, T, D = x.shape
        H, hd = self.H, self.hd
        q = self.q(x).view(B, T, H, hd).transpose(1, 2)                   # (B, H, T, hd)
        k = self.k(x).view(B, T, H, hd).transpose(1, 2)
        v = self.v(x).view(B, T, H, hd).transpose(1, 2)
        if cache is not None:                                             # decoding: keep every past k and v
            if "k" in cache:
                k, v = torch.cat([cache["k"], k], 2), torch.cat([cache["v"], v], 2)
            cache["k"], cache["v"] = k, v
        Tk = k.shape[2]
        if manual or (cache is not None and T != Tk):
            s = (q @ k.transpose(-2, -1)) / math.sqrt(hd)                 # (B, H, T, Tk)
            qpos = torch.arange(Tk - T, Tk, device=x.device)
            future = qpos[:, None] < torch.arange(Tk, device=x.device)[None, :]
            y = s.masked_fill(future, float("-inf")).softmax(-1) @ v      # (B, H, T, hd)
        else:
            y = F.scaled_dot_product_attention(q, k, v, is_causal=True, scale=1 / math.sqrt(hd))
        y = y.transpose(1, 2).reshape(B, T, D)                            # merge heads: (B, T, D)
        return self.o(y)


# ==== STEP 5: the feed-forward network. The same two-layer MLP applied to every token on its own:
# up to F = 4 D, a nonlinearity, back down to D. SwiGLU: a gated version with three matrices.
class FFN(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.up = nn.Linear(cfg.d, cfg.f, bias=False)                     # (F, D)
        self.down = nn.Linear(cfg.f, cfg.d, bias=False)                   # (D, F)
        self.down.is_residual_out = True

    def forward(self, x):
        return self.down(F.gelu(self.up(x), approximate="tanh"))         # (B, T, F) inside, (B, T, D) out


class SwiGLU(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.gate = nn.Linear(cfg.d, cfg.f, bias=False)
        self.up = nn.Linear(cfg.d, cfg.f, bias=False)
        self.down = nn.Linear(cfg.f, cfg.d, bias=False)
        self.down.is_residual_out = True

    def forward(self, x):
        return self.down(F.silu(self.gate(x)) * self.up(x))


# ==== STEP 6: the block. Pre-norm residual: normalise a copy, run the sublayer, ADD its output to the
# stream. The stream x itself is never normalised in place, so every block only writes a correction.
class Block(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.cfg = cfg
        if cfg.attn:
            self.attn = CausalSelfAttention(cfg)
        if cfg.ffn:
            self.ffn = SwiGLU(cfg) if cfg.swiglu else FFN(cfg)
        self.n1 = nn.LayerNorm(cfg.d, bias=False) if (cfg.norm and cfg.attn) else nn.Identity()
        self.n2 = nn.LayerNorm(cfg.d, bias=False) if (cfg.norm and cfg.ffn) else nn.Identity()

    def forward(self, x, cache=None, manual=False):
        if self.cfg.attn:
            a = self.attn(self.n1(x), cache, manual)
            x = x + a if self.cfg.resid else a
        if self.cfg.ffn:
            f = self.ffn(self.n2(x))
            x = x + f if self.cfg.resid else f
        return x


# ==== STEP 7: the whole model. Embed, L blocks, a final norm, and the unembedding: a D x V matrix that
# turns the last residual vector into one score (logit) per vocabulary entry. Tied: it IS the embedding table.
class GPT(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.cfg = cfg
        self.emb = Embedding(cfg)
        self.blocks = nn.ModuleList(Block(cfg) for _ in range(cfg.n_layer))
        self.ln_f = nn.LayerNorm(cfg.d, bias=False) if cfg.norm else nn.Identity()
        self.lm_head = nn.Linear(cfg.d, cfg.vocab, bias=False)            # (V, D)
        self.apply(self._init)
        self.lm_head.weight = self.emb.tok.weight                         # weight tying

    def _init(self, m):                                                   # GPT-2 initialisation
        if isinstance(m, nn.Linear):
            std = 0.02 / math.sqrt(2 * self.cfg.n_layer) if getattr(m, "is_residual_out", False) else 0.02
            nn.init.normal_(m.weight, 0.0, std)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, 0.0, 0.02)

    # ==== STEP 8: the loss. Position t predicts token t+1: targets are the inputs shifted by one.
    def forward(self, idx, targets=None, cache=None, manual=False):
        start = cache[0].get("len", 0) if cache else 0
        if cache is not None and not cache:
            cache.extend({} for _ in self.blocks)
        x = self.emb(idx, start)                                          # (B, T, D)
        for i, b in enumerate(self.blocks):
            x = b(x, cache[i] if cache is not None else None, manual)    # (B, T, D) in and out
        if cache is not None:
            for c in cache:
                c["len"] = start + idx.shape[1]
        logits = self.lm_head(self.ln_f(x))                               # (B, T, V)
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.float().view(-1, logits.shape[-1]), targets.reshape(-1))
        return logits, loss, logits.new_zeros(()), None                   # same signature as tiny_gpt.GPT

    # ==== STEP 9: sampling. Feed the prompt once, then one token at a time, reusing cached k and v.
    @torch.no_grad()
    def generate(self, idx, n_new, temperature=0.0, top_k=None, generator=None):
        cache = []
        logits, *_ = self(idx, cache=cache)
        out = idx
        for _ in range(n_new):
            lg = logits[:, -1].float()
            if temperature <= 0:
                nxt = lg.argmax(-1, keepdim=True)                         # greedy
            else:
                lg = lg / temperature
                if top_k:
                    v, _ = lg.topk(top_k)
                    lg[lg < v[:, -1:]] = float("-inf")
                nxt = torch.multinomial(lg.softmax(-1), 1, generator=generator)
            out = torch.cat([out, nxt], 1)
            if out.shape[1] >= self.cfg.ctx:                             # learned positions stop at ctx
                break
            logits, *_ = self(nxt, cache=cache)
        return out


def n_params(model):
    return sum(p.numel() for p in model.parameters())                    # tied weights counted once


def load_tiny(state):
    """Rename a tiny_gpt.py baseline state dict to this file's module names."""
    ren = {"wte.": "emb.tok.", "wpe.": "emb.pos.", ".mix.": ".attn."}
    out = {}
    for k, v in state.items():
        for a, b in ren.items():
            k = k.replace(a, b) if (a.startswith(".") or k.startswith(a)) else k
        out[k] = v
    return out
