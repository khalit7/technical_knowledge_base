"""The running example of Topic: pytorch-ecosystem: a tiny GPT in plain PyTorch.

A decoder-only transformer (GPT-2 shape: learned positions, pre-LayerNorm blocks,
causal self-attention, GELU MLP, tied input and output embeddings) trained at
character level on a fixed 1.3 KB text (data.txt). Every tab and child page of the
topic imports this file instead of defining its own model.

Defaults: vocab from data.txt (43 characters), d_model 256, 4 layers, 4 heads,
context 64, batch 8. 3,186,944 parameters. Seeded: same weights and the
same batches on every run and every machine (CPU float32 math may still differ in
the last bits between machines and thread counts).

    from model import GPTConfig, GPT, get_batch, make_model
    cfg = GPTConfig(); model = make_model(cfg)            # seeded weights
    x, y = get_batch(cfg, step=0)                         # seeded batch
    logits, loss = model(x, y)
"""
from dataclasses import dataclass
import math
import os

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.checkpoint import checkpoint

HERE = os.path.dirname(os.path.abspath(__file__))
TEXT = open(os.path.join(HERE, "data.txt"), encoding="utf-8").read()
CHARS = sorted(set(TEXT))
STOI = {c: i for i, c in enumerate(CHARS)}
ITOS = {i: c for c, i in STOI.items()}


def encode(s):
    return [STOI[c] for c in s]


def decode(ids):
    return "".join(ITOS[int(i)] for i in ids)


DATA = torch.tensor(encode(TEXT), dtype=torch.long)


@dataclass
class GPTConfig:
    vocab_size: int = len(CHARS)
    block_size: int = 64      # context length T
    n_layer: int = 4
    n_head: int = 4
    d_model: int = 256
    batch_size: int = 8       # B
    bias: bool = True
    attn: str = "sdpa"        # "sdpa" (F.scaled_dot_product_attention) or "manual" (softmax(QK^T/sqrt(d))V written out)
    checkpoint: bool = False  # activation checkpointing per block (torch.utils.checkpoint, non-reentrant)
    seed: int = 0


class CausalSelfAttention(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        assert cfg.d_model % cfg.n_head == 0
        self.qkv = nn.Linear(cfg.d_model, 3 * cfg.d_model, bias=cfg.bias)
        self.proj = nn.Linear(cfg.d_model, cfg.d_model, bias=cfg.bias)
        self.n_head, self.attn = cfg.n_head, cfg.attn
        if cfg.attn == "manual":
            T = cfg.block_size
            self.register_buffer("mask", torch.tril(torch.ones(T, T, dtype=torch.bool)), persistent=False)

    def forward(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=2)                    # views of one (B, T, 3C) tensor
        q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)  # (B, H, T, hd), a view
        k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        if self.attn == "sdpa":
            y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        else:
            att = (q @ k.transpose(-2, -1)) / math.sqrt(k.size(-1))
            att = att.masked_fill(~self.mask[:T, :T], float("-inf"))
            y = F.softmax(att, dim=-1) @ v
        y = y.transpose(1, 2).contiguous().view(B, T, C)          # contiguous() copies: the view needs it
        return self.proj(y)


class MLP(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.fc = nn.Linear(cfg.d_model, 4 * cfg.d_model, bias=cfg.bias)
        self.proj = nn.Linear(4 * cfg.d_model, cfg.d_model, bias=cfg.bias)

    def forward(self, x):
        return self.proj(F.gelu(self.fc(x)))


class Block(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.ln1 = nn.LayerNorm(cfg.d_model, bias=cfg.bias)
        self.attn = CausalSelfAttention(cfg)
        self.ln2 = nn.LayerNorm(cfg.d_model, bias=cfg.bias)
        self.mlp = MLP(cfg)

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.mlp(self.ln2(x))
        return x


class GPT(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.cfg = cfg
        self.tok = nn.Embedding(cfg.vocab_size, cfg.d_model)
        self.pos = nn.Embedding(cfg.block_size, cfg.d_model)
        self.blocks = nn.ModuleList(Block(cfg) for _ in range(cfg.n_layer))
        self.ln_f = nn.LayerNorm(cfg.d_model, bias=cfg.bias)
        self.head = nn.Linear(cfg.d_model, cfg.vocab_size, bias=False)
        self.head.weight = self.tok.weight                        # tied: one Parameter, two uses
        self.apply(self._init)
        for n, p in self.named_parameters():                     # GPT-2 scaled init of residual projections
            if n.endswith("proj.weight"):
                nn.init.normal_(p, 0.0, 0.02 / math.sqrt(2 * cfg.n_layer))

    @staticmethod
    def _init(m):
        if isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, 0.0, 0.02)
            if m.bias is not None:
                nn.init.zeros_(m.bias)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, 0.0, 0.02)

    def forward(self, idx, targets=None):
        B, T = idx.shape
        pos = torch.arange(T, device=idx.device)
        x = self.tok(idx) + self.pos(pos)
        for blk in self.blocks:
            if self.cfg.checkpoint and torch.is_grad_enabled():
                x = checkpoint(blk, x, use_reentrant=False)
            else:
                x = blk(x)
        logits = self.head(self.ln_f(x))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss


def n_params(model):
    return sum(p.numel() for p in model.parameters())         # tied weight counted once


def make_model(cfg=None, device="cpu"):
    cfg = cfg or GPTConfig()
    torch.manual_seed(cfg.seed)
    return GPT(cfg).to(device)


def get_batch(cfg, step=0, device="cpu"):
    """Batch number `step`: B random windows of T+1 characters, the same on every run."""
    g = torch.Generator().manual_seed(1000 + step)
    ix = torch.randint(len(DATA) - cfg.block_size - 1, (cfg.batch_size,), generator=g)
    x = torch.stack([DATA[i:i + cfg.block_size] for i in ix])
    y = torch.stack([DATA[i + 1:i + 1 + cfg.block_size] for i in ix])
    return x.to(device), y.to(device)


def make_optimizer(model, lr=6e-4, weight_decay=0.1):
    """AdamW with weight decay on matrices only (GPT-2 convention), lr 6e-4 (nanoGPT default;
    3e-3 stalls near loss 2.3 here). Implementation left to PyTorch: at 2.14.1 the default for
    CPU and MPS parameters is the single-tensor for-loop (foreach and fused are defaults only on
    CUDA-like devices; torch.optim.optimizer._default_to_fused_or_foreach returns (False, False))."""
    decay = [p for p in model.parameters() if p.dim() >= 2]
    no_decay = [p for p in model.parameters() if p.dim() < 2]
    return torch.optim.AdamW([{"params": decay, "weight_decay": weight_decay},
                              {"params": no_decay, "weight_decay": 0.0}], lr=lr, betas=(0.9, 0.95))


def train_step(model, opt, x, y):
    """One training step, the unit every tab follows: forward, backward, optimizer step."""
    _, loss = model(x, y)
    loss.backward()
    opt.step()
    opt.zero_grad(set_to_none=True)
    return loss
