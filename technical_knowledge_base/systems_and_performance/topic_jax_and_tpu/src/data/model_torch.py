"""The running example in PyTorch: a tiny decoder-only (GPT-style) character LM.

Pre-LayerNorm blocks: x + attn(ln1(x)), then x + mlp(ln2(x)); learned positional embeddings;
causal multi-head attention written out by hand (no fused kernel, so every op is visible);
exact GELU (erf); untied output head; no dropout (so runs are deterministic).
Parameter names are the keys the weight-transfer functions in model_nnx.py and model_jax.py use.
"""
import math

import torch
import torch.nn as nn
import torch.nn.functional as F


class Attention(nn.Module):
    def __init__(self, d, h):
        super().__init__()
        self.h, self.dh = h, d // h
        self.wq, self.wk, self.wv, self.wo = (nn.Linear(d, d) for _ in range(4))

    def forward(self, x):                                    # x [B, T, D]
        B, T, D = x.shape
        q = self.wq(x).view(B, T, self.h, self.dh).transpose(1, 2)   # [B, H, T, dh]
        k = self.wk(x).view(B, T, self.h, self.dh).transpose(1, 2)
        v = self.wv(x).view(B, T, self.h, self.dh).transpose(1, 2)
        s = q @ k.transpose(-1, -2) / math.sqrt(self.dh)             # [B, H, T, T]
        mask = torch.ones(T, T, dtype=torch.bool, device=x.device).tril()
        s = s.masked_fill(~mask, float("-inf"))
        a = s.softmax(-1) @ v                                        # [B, H, T, dh]
        return self.wo(a.transpose(1, 2).reshape(B, T, D))


class MLP(nn.Module):
    def __init__(self, d, f):
        super().__init__()
        self.fc1, self.fc2 = nn.Linear(d, f), nn.Linear(f, d)

    def forward(self, x):
        return self.fc2(F.gelu(self.fc1(x)))                 # exact (erf) GELU, PyTorch's default


class Block(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        d = cfg["d_model"]
        self.ln1 = nn.LayerNorm(d, eps=cfg["ln_eps"])
        self.attn = Attention(d, cfg["n_heads"])
        self.ln2 = nn.LayerNorm(d, eps=cfg["ln_eps"])
        self.mlp = MLP(d, cfg["d_ff"])

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        return x + self.mlp(self.ln2(x))


class TinyLM(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        d = cfg["d_model"]
        self.tok_emb = nn.Embedding(cfg["vocab"], d)
        self.pos_emb = nn.Embedding(cfg["ctx"], d)
        self.blocks = nn.ModuleList(Block(cfg) for _ in range(cfg["n_layers"]))
        self.ln_f = nn.LayerNorm(d, eps=cfg["ln_eps"])
        self.head = nn.Linear(d, cfg["vocab"], bias=False)
        # GPT-2-style init: N(0, 0.02) for embeddings and linear weights, zero biases, LayerNorm (1, 0).
        for name, p in self.named_parameters():
            if name.endswith("bias"):
                nn.init.zeros_(p)
            elif ".ln" in name or name.startswith("ln_f"):
                nn.init.ones_(p)
            else:
                nn.init.normal_(p, 0.0, 0.02)

    def forward(self, idx):                                  # idx int [B, T] -> logits [B, T, V]
        T = idx.shape[1]
        x = self.tok_emb(idx) + self.pos_emb(torch.arange(T, device=idx.device))
        for b in self.blocks:
            x = b(x)
        return self.head(self.ln_f(x))


def loss_fn(model, x, y):
    logits = model(x)
    return F.cross_entropy(logits.reshape(-1, logits.shape[-1]), y.reshape(-1))


def make_model(cfg, seed=0):
    torch.manual_seed(seed)
    return TinyLM(cfg)


def make_optimizer(model, cfg, lr_at):
    """AdamW with weight decay on 2-D weight matrices only, and the shared warmup schedule."""
    from common import decay_mask_name
    decay = [p for n, p in model.named_parameters() if decay_mask_name(n)]
    rest = [p for n, p in model.named_parameters() if not decay_mask_name(n)]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": cfg["weight_decay"]},
                             {"params": rest, "weight_decay": 0.0}],
                            lr=cfg["lr"], betas=cfg["betas"], eps=cfg["adam_eps"])
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: lr_at(s) / cfg["lr"])
    return opt, sched


def train_step(model, opt, sched, x, y, clip):
    opt.zero_grad(set_to_none=True)
    loss = loss_fn(model, x, y)
    loss.backward()
    gnorm = torch.nn.utils.clip_grad_norm_(model.parameters(), clip)
    opt.step()
    sched.step()
    return loss.item(), gnorm.item()


def state_numpy(model):
    """{pytorch name: float32 numpy array} (Linear weights stay [out, in], PyTorch's layout)."""
    return {k: v.detach().cpu().numpy().copy() for k, v in model.state_dict().items()}
