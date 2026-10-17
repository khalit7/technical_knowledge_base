"""Tiny transformers over image tokens (child page Native multimodal and any-to-any models, prefix nm).

An image is 64 tokens (the 8x8 grid of a tiny tokenizer, raster order) from a vocabulary of K codes. Two models of
the same shape, differing only in the attention mask and the training target:

  causal ("ar")    GPT-style: input [class, t0 .. t62], predict t0 .. t63, each from the class and the tokens before
                   it (Parti, LlamaGen, Chameleon, Emu3 generate images this way; LlamaGen arXiv 2406.06525 puts the
                   class embedding first, as here).
  bidirectional    MaskGIT-style (arXiv 2202.04200): input [class, 64 tokens with a random subset replaced by MASK],
  ("mask")         predict the masked ones; generation fills the grid in a few parallel rounds. Show-o (arXiv
                   2408.12528) uses this kind of discrete masked modelling for its image tokens.

Class conditioning with a null class (10) for classifier-free guidance, dropped 10% of the time as in the topic's
DDPM. Pre-LayerNorm blocks, learned absolute positions, GELU MLP 4x, no dropout, tied nothing.
"""
import math

import torch
import torch.nn as nn
import torch.nn.functional as F

NULL = 10


class Block(nn.Module):
    def __init__(self, d, heads):
        super().__init__()
        self.h = heads
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.qkv, self.proj = nn.Linear(d, 3 * d), nn.Linear(d, d)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))

    def attn(self, x, causal, cache=None):
        B, T, D = x.shape
        q, k, v = self.qkv(x).view(B, T, 3, self.h, D // self.h).permute(2, 0, 3, 1, 4)
        if cache is not None:                      # incremental decoding: append this step's keys and values
            if "k" in cache:
                k = torch.cat([cache["k"], k], 2); v = torch.cat([cache["v"], v], 2)
            cache["k"], cache["v"] = k, v
            causal = False                         # the single new query may see every cached position
        y = F.scaled_dot_product_attention(q, k, v, is_causal=causal)
        return self.proj(y.transpose(1, 2).reshape(B, T, D))

    def forward(self, x, causal, cache=None):
        x = x + self.attn(self.ln1(x), causal, cache)
        return x + self.mlp(self.ln2(x))


class TinyTokenTransformer(nn.Module):
    def __init__(self, K, kind="ar", d=192, layers=6, heads=6, n_tok=64, n_cls=11):
        super().__init__()
        self.K, self.kind, self.n_tok = K, kind, n_tok
        self.mask_id = K                                           # only used by the masked model
        self.tok = nn.Embedding(K + (1 if kind == "mask" else 0), d)
        self.cls = nn.Embedding(n_cls, d)
        self.pos = nn.Parameter(torch.zeros(1, n_tok + 1, d))
        nn.init.normal_(self.pos, std=0.02)
        self.blocks = nn.ModuleList([Block(d, heads) for _ in range(layers)])
        self.ln = nn.LayerNorm(d)
        self.head = nn.Linear(d, K)

    def forward(self, tokens, y, caches=None, start=0):
        """tokens (B, T) of token ids, y (B,) class ids. Returns logits (B, T', K).
        ar: sequence = [class] + tokens; the output at position i predicts token i.
        caches: list of dicts (one per block) for incremental decoding; start = position of the first input."""
        if self.kind == "ar":
            if start == 0:
                h = torch.cat([self.cls(y)[:, None], self.tok(tokens)], 1) if tokens.shape[1] else self.cls(y)[:, None]
            else:
                h = self.tok(tokens)
            h = h + self.pos[:, start:start + h.shape[1]]
            for i, b in enumerate(self.blocks):
                h = b(h, causal=True, cache=None if caches is None else caches[i])
            return self.head(self.ln(h))
        h = torch.cat([self.cls(y)[:, None], self.tok(tokens)], 1) + self.pos
        for b in self.blocks:
            h = b(h, causal=False)
        return self.head(self.ln(h))[:, 1:]


def ar_loss(m, batch, p_uncond=0.1):
    t, y = batch
    y = torch.where(torch.rand(y.shape, device=y.device) < p_uncond, torch.full_like(y, NULL), y)
    logits = m(t[:, :-1], y)                                       # (B, 64, K)
    loss = F.cross_entropy(logits.reshape(-1, m.K), t.reshape(-1))
    return loss, {"loss": loss.item(), "bits_per_image": loss.item() * t.shape[1] / math.log(2)}


def mask_loss(m, batch, p_uncond=0.1):
    """MaskGIT training: mask ratio r = cos(pi/2 * u), u ~ U(0,1); cross-entropy on the masked positions only."""
    t, y = batch
    B, T = t.shape
    y = torch.where(torch.rand(y.shape, device=y.device) < p_uncond, torch.full_like(y, NULL), y)
    r = torch.cos(math.pi / 2 * torch.rand(B, 1, device=t.device))
    n_mask = (r * T).ceil().clamp(min=1)
    rank = torch.rand(B, T, device=t.device).argsort(1).argsort(1)
    masked = rank < n_mask
    inp = torch.where(masked, torch.full_like(t, m.mask_id), t)
    logits = m(inp, y)
    # fixed-shape loss: boolean indexing (logits[masked]) changes shape every step, and on MPS that grew the
    # allocator's cache past the 0.45 memory cap within 200 steps (out of memory, 2026-10-17)
    ce = F.cross_entropy(logits.reshape(-1, m.K), t.reshape(-1), reduction="none").view(B, T)
    w = masked.float()
    loss = (ce * w).sum() / w.sum()
    return loss, {"loss": loss.item(), "mask_frac": w.mean().item()}


def _filter(logits, temperature, top_k):
    if temperature == 0:
        return None
    logits = logits / temperature
    if top_k and top_k < logits.shape[-1]:
        kth = logits.topk(top_k, -1).values[..., -1:]
        logits = logits.masked_fill(logits < kth, float("-inf"))
    return logits


def guided_logits(m, fn, y, cfg):
    """Classifier-free guidance on logits: l_u + s (l_c - l_u) (s = 1 is the plain conditional model, as diffusers'
    guidance_scale; the same form LlamaGen and Parti use)."""
    if cfg == 1:
        return fn(y)
    if cfg == 0:
        return fn(torch.full_like(y, NULL))
    lc, lu = fn(torch.cat([y, torch.full_like(y, NULL)])).chunk(2)
    return lu + cfg * (lc - lu)


def _draw(p, u):
    """Inverse-CDF draw with given uniforms u (B,): the same u under two settings is the same 'random draw', so
    samples can be compared setting against setting (before/after on the same input)."""
    c = p.cumsum(-1)
    return torch.searchsorted(c, (u * c[:, -1]).unsqueeze(1).contiguous()).squeeze(1).clamp(max=p.shape[-1] - 1)


@torch.no_grad()
def sample_ar(m, y, temperature=1.0, top_k=0, cfg=1.0, gen=None, use_cache=True, record=False, u=None):
    """Raster-order sampling, one token per network call. Returns tokens (B, 64) and, if record, the probability the
    model gave each chosen token and the entropy of each step's distribution. u (B, 64): fixed uniforms (optional)."""
    B, dev = y.shape[0], y.device
    yy = y if cfg == 1 else (torch.full_like(y, NULL) if cfg == 0 else torch.cat([y, torch.full_like(y, NULL)]))
    caches = [dict() for _ in m.blocks] if use_cache else None
    out = torch.zeros(B, 0, dtype=torch.long, device=dev)
    probs, ents, tops = [], [], []
    for i in range(m.n_tok):
        inp_tokens = out if (not use_cache or i == 0) else out[:, -1:]
        if cfg not in (0, 1):
            inp_tokens = torch.cat([inp_tokens, inp_tokens])
        if use_cache:
            lg = m(inp_tokens if i > 0 else inp_tokens[:, :0], yy, caches=caches, start=0 if i == 0 else i)[:, -1]
        else:
            lg = m(inp_tokens, yy)[:, -1]
        if cfg not in (0, 1):
            lc, lu = lg.chunk(2); lg = lu + cfg * (lc - lu)
        f = _filter(lg.float(), temperature, top_k)
        if f is None:
            nxt = lg.argmax(-1)
            p = lg.float().softmax(-1)
        else:
            p = f.softmax(-1)
            if u is not None:
                nxt = _draw(p, u[:, i].to(dev))
            else:
                nxt = torch.multinomial(p.cpu(), 1, generator=gen).squeeze(1).to(dev)
        if record:
            probs.append(p.gather(1, nxt[:, None]).squeeze(1))
            pl = p.clamp_min(1e-12)
            ents.append(-(p * pl.log()).sum(-1) / math.log(2))
            tv, ti = p.topk(5, -1); tops.append(torch.stack([ti.float(), tv], -1))
        out = torch.cat([out, nxt[:, None]], 1)
    if record:
        return out, torch.stack(probs, 1), torch.stack(ents, 1), torch.stack(tops, 1)
    return out


@torch.no_grad()
def sample_mask(m, y, steps=8, temperature=1.0, top_k=0, cfg=1.0, gen=None, choice_temp=4.5, record=False):
    """MaskGIT decoding (arXiv 2202.04200 sec. 3.2): start fully masked; each round predict every masked token, keep
    the most confident ones (confidence = log p of the sampled token + choice_temp * (1 - progress) * Gumbel noise,
    as in the official maskgit code), re-mask the rest; the number still masked follows cos(pi/2 * progress)."""
    B, T, dev = y.shape[0], m.n_tok, y.device
    t = torch.full((B, T), m.mask_id, dtype=torch.long, device=dev)
    frames = []
    for s in range(steps):
        unknown = t == m.mask_id
        lg = guided_logits(m, lambda yy: m(torch.cat([t, t]) if yy.shape[0] == 2 * B else t, yy), y, cfg)
        f = _filter(lg.float(), temperature, top_k)
        if f is None:
            cand = lg.argmax(-1); p = lg.float().softmax(-1)
        else:
            p = f.softmax(-1)
            cand = torch.multinomial(p.reshape(-1, m.K).cpu(), 1, generator=gen).view(B, T).to(dev)
        conf = p.gather(2, cand[..., None]).squeeze(-1).clamp_min(1e-12).log()
        prog = (s + 1) / steps
        g = -torch.log(-torch.log(torch.rand(B, T, generator=gen).clamp(1e-20, 1)))
        conf = conf + choice_temp * (1 - prog) * g.to(dev)
        conf = torch.where(unknown, conf, torch.full_like(conf, float("inf")))
        n_keep_masked = int(math.floor(T * math.cos(math.pi / 2 * prog)))
        t = torch.where(unknown, cand, t)
        if n_keep_masked > 0:
            n_keep_masked = min(n_keep_masked, int(unknown.sum(1).min().item()) - 1) if s < steps - 1 else 0
        if n_keep_masked > 0:
            lowest = conf.topk(n_keep_masked, 1, largest=False).indices
            t.scatter_(1, lowest, m.mask_id)
        if record:
            frames.append(t.clone())
    return (t, frames) if record else t
