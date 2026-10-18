"""mtp.py: multi-token prediction modules for the tiny GPT, after DeepSeek-V3 section 2.2 (arXiv 2412.19437).

Two drafts of the token two places ahead (t+2), both reading the main model's final residual stream h_t:
  "sequential" (DeepSeek-V3 MTP, depth 1): RMSNorm(h_t) and RMSNorm(Emb(x_{t+1})) concatenated, projected 2D -> D
                (DeepSeek's eh_proj), one transformer block, then the main model's own final norm and output head
                (shared). It sees the next token, so it is a one-step look-ahead conditioned on the real t+1.
  "parallel"   (Gloeckle et al. 2024, arXiv 2404.19737, one extra head): one transformer block on h_t only, then the
                shared norm and head. It must guess t+2 without knowing t+1.
"""
import torch
import torch.nn as nn

from fo_common import tiny_gpt


class MTPModule(nn.Module):
    def __init__(self, cfg, kind="sequential"):
        super().__init__()
        self.kind = kind
        D = cfg.d_model
        if kind == "sequential":
            self.hnorm = nn.RMSNorm(D, eps=cfg.norm_eps)
            self.enorm = nn.RMSNorm(D, eps=cfg.norm_eps)
            self.eh_proj = nn.Linear(2 * D, D, bias=False)
        self.block = tiny_gpt.Block(cfg, cfg.n_layer - 1)   # same shape as the main model's last block
        for m in self.modules():
            if isinstance(m, nn.Linear):
                std = cfg.init_std / (2 * cfg.n_layer) ** 0.5 if getattr(m, "is_residual_out", False) else cfg.init_std
                nn.init.normal_(m.weight, 0.0, std)

    def forward(self, model, h, idx_next):
        """h (B,T,D): main model's final residual stream at positions 0..T-1; idx_next (B,T): token at t+1.
        Returns logits (B,T,V) for the token at t+2, through the main model's shared ln_f and lm_head."""
        if self.kind == "sequential":
            x = self.eh_proj(torch.cat([self.hnorm(h), self.enorm(model.wte(idx_next))], -1))
        else:
            x = h
        pos = torch.arange(x.shape[1], device=x.device)
        x, _, _ = self.block(x, pos)
        return model.lm_head(model.ln_f(x))


def n_params(m):
    return sum(p.numel() for p in m.parameters())
