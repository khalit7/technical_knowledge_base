"""Quantizers for the quantizer playground (child page Autoencoders and VAEs, prefix av).

Every model is the topic's shared ConvAE with a spatial 8x8 latent (src/data/nets.py in the root folder); only the
bottleneck changes. Each quantizer maps the encoder's map ze (B, D, 8, 8) to (zq_straight_through, idx, aux_loss, logs).

- VQ: nearest of K learned vectors (van den Oord et al. 2017, arXiv:1711.00937, eq. 3, beta 0.25), in four variants:
    plain    codebook loss + beta * commitment loss, uniform(-1/K, 1/K) init (the Latent lab's recipe)
    restart  plain + dead codes (unused for 100 steps) re-seeded from encoder outputs (Jukebox, arXiv:2005.00341 s3.1)
    ema      codebook updated by exponential moving averages of the assigned vectors, decay 0.99, Laplace smoothing
             (VQ-VAE appendix A.1); only the commitment loss is backpropagated
    l2       vectors and codebook L2-normalised before the lookup (cosine similarity), as in ViT-VQGAN
             (Yu et al. 2021, arXiv:2110.04627, section 3.2 "l2-normalized codes")
- FSQ: finite scalar quantization (Mentzer et al. 2023, arXiv:2309.15505): bound each of d channels with tanh, round to
  L_i levels; implicit codebook of prod(L_i) codes, no codebook loss. bound()/quantize() ported from the paper's
  appendix A.1 code (JAX) to PyTorch line by line.
- LFQ: lookup-free quantization (MAGVIT-v2, Yu et al. 2023, arXiv:2310.05737, eq. 3 to 5): sign of each of log2 K
  channels; index = sum 2^(i-1) [z_i > 0]; entropy penalty E[H(q(z))] - H[E(q(z))] (weight 0.1 as in its appendix),
  commitment 0.25. The soft assignment used for the entropy is softmax(-||z - c||^2 / tau) over the 2^d corners
  (tau = 1; the paper does not state its soft assignment, so this choice is ours).
"""
import math

import torch
import torch.nn as nn
import torch.nn.functional as F


class VQ(nn.Module):
    def __init__(self, K=128, D=8, beta=0.25, mode="plain", restart_every=100, decay=0.99):
        super().__init__()
        self.K, self.D, self.beta, self.mode, self.restart_every, self.decay = K, D, beta, mode, restart_every, decay
        self.codebook = nn.Embedding(K, D)
        self.codebook.weight.data.uniform_(-1.0 / K, 1.0 / K)
        if mode == "ema":
            self.codebook.weight.requires_grad_(False)
            self.register_buffer("ema_n", torch.zeros(K))
            self.register_buffer("ema_m", self.codebook.weight.data.clone())
        self.register_buffer("usage", torch.zeros(K))
        self.steps, self.alive_log = 0, []

    def lookup(self, flat):
        E = self.codebook.weight
        if self.mode == "l2":
            flat, E = F.normalize(flat, dim=1), F.normalize(E, dim=1)
        d = flat.pow(2).sum(1, keepdim=True) - 2 * flat @ E.t() + E.pow(2).sum(1)[None]
        idx = d.argmin(1)
        return idx, E[idx], flat

    def forward(self, ze):
        B, D, H, W = ze.shape
        flat = ze.permute(0, 2, 3, 1).reshape(-1, D)
        idx, q, flat_n = self.lookup(flat)
        cb = (q - flat_n.detach()).pow(2).sum(1).mean() * H * W        # per image, like the Latent lab's vq_loss
        commit = (flat_n - q.detach()).pow(2).sum(1).mean() * H * W
        aux = commit * self.beta + (0 if self.mode == "ema" else cb)
        if self.training:
            self._bookkeeping(flat_n.detach(), idx)
        zq = flat_n + (q - flat_n).detach()                             # straight-through
        zq = zq.view(B, H, W, D).permute(0, 3, 1, 2)
        return zq, idx.view(B, H, W), aux, {"codebook": cb.item(), "commit": commit.item()}

    @torch.no_grad()
    def _bookkeeping(self, flat, idx):
        onehot = F.one_hot(idx, self.K).float()
        n = onehot.sum(0)
        if self.mode == "ema":
            self.ema_n.mul_(self.decay).add_(n, alpha=1 - self.decay)
            self.ema_m.mul_(self.decay).add_(onehot.t() @ flat, alpha=1 - self.decay)
            tot = self.ema_n.sum()
            nn_ = (self.ema_n + 1e-5) / (tot + self.K * 1e-5) * tot       # Laplace smoothing
            self.codebook.weight.data.copy_(self.ema_m / nn_[:, None])
        self.usage += n
        self.steps += 1
        if self.steps % self.restart_every == 0:
            self.alive_log.append((self.steps, int((self.usage > 0).sum())))
            dead = (self.usage == 0).nonzero().flatten()
            if self.mode == "restart" and len(dead):
                pick = torch.randint(0, flat.shape[0], (len(dead),), device=flat.device)
                self.codebook.weight.data[dead] = flat[pick] + 0.01 * torch.randn_like(flat[pick])
            self.usage.zero_()

    @torch.no_grad()
    def codes(self, idx):                                               # idx (B, H, W) -> (B, D, H, W)
        E = self.codebook.weight
        if self.mode == "l2":
            E = F.normalize(E, dim=1)
        return E[idx].permute(0, 3, 1, 2)


def round_ste(z):
    return z + (torch.round(z) - z).detach()


class FSQ(nn.Module):
    def __init__(self, levels=(5, 5, 5)):
        super().__init__()
        self.levels = list(levels); self.D = len(levels); self.K = int(math.prod(levels))
        L = torch.tensor(levels, dtype=torch.float32)
        self.register_buffer("L", L)
        self.register_buffer("basis", torch.cumprod(torch.cat([torch.ones(1), L[:-1]]), 0))
        self.steps, self.alive_log = 0, []
        self.register_buffer("usage", torch.zeros(self.K))

    def bound(self, z):                                                 # paper appendix A.1, def bound
        eps = 1e-3
        half_l = (self.L - 1) * (1 - eps) / 2
        offset = torch.where(self.L % 2 == 1, 0.0, 0.5)
        shift = torch.tan(offset / half_l)
        return torch.tanh(z + shift) * half_l - offset

    def forward(self, ze):
        B, D, H, W = ze.shape
        z = ze.permute(0, 2, 3, 1)
        q = round_ste(self.bound(z))                                    # integers, straight-through
        half_width = torch.div(self.L, 2, rounding_mode="floor")
        zq = q / half_width                                             # renormalise to about [-1, 1]
        idx = ((q.detach() + half_width) * self.basis).sum(-1).long()
        if self.training:
            with torch.no_grad():
                self.usage += torch.bincount(idx.flatten(), minlength=self.K).float(); self.steps += 1
                if self.steps % 100 == 0:
                    self.alive_log.append((self.steps, int((self.usage > 0).sum()))); self.usage.zero_()
        return zq.permute(0, 3, 1, 2), idx, torch.zeros((), device=ze.device), {}

    @torch.no_grad()
    def codes(self, idx):
        half_width = torch.div(self.L, 2, rounding_mode="floor")
        digits = torch.remainder(torch.div(idx[..., None], self.basis, rounding_mode="floor"), self.L)
        return ((digits - half_width) / half_width).permute(0, 3, 1, 2)


class LFQ(nn.Module):
    def __init__(self, bits=7, entropy_weight=0.1, commit=0.25, tau=1.0):
        super().__init__()
        self.D, self.K, self.entropy_weight, self.commit, self.tau = bits, 2 ** bits, entropy_weight, commit, tau
        corners = torch.tensor([[1.0 if (k >> i) & 1 else -1.0 for i in range(bits)] for k in range(self.K)])
        self.register_buffer("corners", corners)                       # (K, bits): code k's sign pattern
        self.register_buffer("pow2", 2 ** torch.arange(bits))
        self.steps, self.alive_log = 0, []
        self.register_buffer("usage", torch.zeros(self.K))

    def forward(self, ze):
        B, D, H, W = ze.shape
        z = ze.permute(0, 2, 3, 1).reshape(-1, D)
        q = torch.where(z > 0, 1.0, -1.0)
        idx = ((z > 0).long() * self.pow2).sum(1)
        commit = (z - q.detach()).pow(2).sum(1).mean() * H * W
        # entropy penalty, eq. 5: mean per-sample entropy (pushes confident codes) minus entropy of the mean (pushes
        # usage of every code)
        logits = -(z.pow(2).sum(1, keepdim=True) - 2 * z @ self.corners.t() + D) / self.tau
        p = logits.softmax(1)
        h_sample = -(p * torch.log(p + 1e-8)).sum(1).mean()
        pm = p.mean(0)
        h_mean = -(pm * torch.log(pm + 1e-8)).sum()
        ent = h_sample - h_mean
        aux = self.commit * commit + self.entropy_weight * ent * H * W
        if self.training:
            with torch.no_grad():
                self.usage += torch.bincount(idx, minlength=self.K).float(); self.steps += 1
                if self.steps % 100 == 0:
                    self.alive_log.append((self.steps, int((self.usage > 0).sum()))); self.usage.zero_()
        zq = z + (q - z).detach()
        return (zq.view(B, H, W, D).permute(0, 3, 1, 2), idx.view(B, H, W), aux,
                {"commit": commit.item(), "h_sample": h_sample.item(), "h_mean": h_mean.item()})

    @torch.no_grad()
    def codes(self, idx):
        return self.corners[idx].permute(0, 3, 1, 2)


class QAE(nn.Module):
    """The shared ConvAE (spatial 8x8 latent of D channels) with a quantizer in the middle."""
    def __init__(self, quant):
        super().__init__()
        import nets
        self.q = quant
        self.ae = nets.ConvAE(spatial=True, latent_ch=quant.D, ch=32)

    def forward(self, x):
        zq, idx, aux, logs = self.q(self.ae.encode(x))
        return self.ae.decode(zq), idx, aux, logs

    @torch.no_grad()
    def tokens(self, x):
        return self.q(self.ae.encode(x))[1]

    @torch.no_grad()
    def decode_tokens(self, idx):
        return self.ae.decode(self.q.codes(idx))
