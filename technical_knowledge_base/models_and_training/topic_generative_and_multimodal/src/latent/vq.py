"""A tiny VQ-VAE on the running example (Latent lab): the shared ConvAE with a spatial 8x8 latent, plus a codebook.

Each of the 8x8 latent vectors (D numbers) is replaced by its nearest codebook entry, so an image becomes 64
integers (image tokens). Loss (van den Oord et al. 2017, arXiv:1711.00937, eq. 3):
    reconstruction + ||sg[z_e] - e||^2 (codebook loss) + beta * ||z_e - sg[e]||^2 (commitment loss)
with the straight-through estimator z_e + sg[e - z_e] carrying the decoder's gradient to the encoder.
restart=True replaces codes unused for `restart_every` steps by random encoder outputs from the current batch
(the "dead code" fix used by e.g. Jukebox, arXiv:2005.00341 section 2.2); restart=False is the plain recipe.
"""
import os, sys

import torch
import torch.nn as nn

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))
from nets import ConvAE
from objectives import recon_bce


class VQVAE(nn.Module):
    def __init__(self, K=128, D=8, ch=32, beta=0.25, restart=False, restart_every=100):
        super().__init__()
        self.K, self.D, self.beta, self.restart, self.restart_every = K, D, beta, restart, restart_every
        self.ae = ConvAE(spatial=True, latent_ch=D, ch=ch)
        self.codebook = nn.Embedding(K, D)
        self.codebook.weight.data.uniform_(-1.0 / K, 1.0 / K)       # the common default init (e.g. diffusers VectorQuantizer)
        self.register_buffer("usage", torch.zeros(K))
        self.steps = 0
        self.alive_log = []                                          # (step, codes used in the last window)

    def quantize(self, ze):
        B, D, H, W = ze.shape
        flat = ze.permute(0, 2, 3, 1).reshape(-1, D)
        E = self.codebook.weight
        d = flat.pow(2).sum(1, keepdim=True) - 2 * flat @ E.t() + E.pow(2).sum(1)[None]
        idx = d.argmin(1)
        zq = E[idx].view(B, H, W, D).permute(0, 3, 1, 2)
        return zq, idx.view(B, H, W)

    def forward(self, x):
        ze = self.ae.encode(x)
        zq, idx = self.quantize(ze)
        z_st = ze + (zq - ze).detach()                              # straight-through estimator
        return self.ae.decode(z_st), ze, zq, idx

    @torch.no_grad()
    def tokens(self, x):
        return self.quantize(self.ae.encode(x))[1]

    @torch.no_grad()
    def decode_tokens(self, idx):
        zq = self.codebook.weight[idx].permute(0, 3, 1, 2)
        return self.ae.decode(zq)


def vq_loss(model, x):
    logits, ze, zq, idx = model(x)
    rec = recon_bce(logits, x)
    cb = (zq - ze.detach()).pow(2).flatten(1).sum(1).mean()
    commit = (ze - zq.detach()).pow(2).flatten(1).sum(1).mean()
    loss = rec + cb + model.beta * commit
    with torch.no_grad():
        model.usage += torch.bincount(idx.flatten(), minlength=model.K).float()
        model.steps += 1
        if model.steps % model.restart_every == 0:
            alive = int((model.usage > 0).sum())
            model.alive_log.append((model.steps, alive))
            dead = (model.usage == 0).nonzero().flatten()
            if model.restart and len(dead):
                flat = ze.detach().permute(0, 2, 3, 1).reshape(-1, model.D)
                pick = torch.randint(0, flat.shape[0], (len(dead),), device=flat.device)
                model.codebook.weight.data[dead] = flat[pick] + 0.01 * torch.randn_like(flat[pick])
            model.usage.zero_()
    used = float(torch.unique(idx).numel())
    return loss, {"loss": loss.item(), "rec": rec.item(), "codebook": cb.item(), "commit": commit.item(), "used_in_batch": used}
