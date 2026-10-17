"""A VAE whose decoder is a small PixelCNN, for the posterior-collapse demo (child page Autoencoders and VAEs, av).

Encoder: the topic's shared ConvVAE encoder (src/data/nets.py, 16-d flat latent: mu and log-variance).
Decoder: a PixelCNN (van den Oord et al. 2016, arXiv:1601.06759 / 1606.05328): a 7x7 mask-A convolution then
`blocks` residual blocks of 3x3 mask-B convolutions, 64 channels, so pixel (i, j) is predicted from the pixels above
and to its left. The latent z conditions every layer through a learned per-channel bias (global conditioning, as in
the conditional PixelCNN, arXiv:1606.05328 eq. 4). Output: Bernoulli logits per pixel, the same loss as every tiny
model of the topic (objectives.recon_bce). The decoder sees the true previous pixels during training (teacher
forcing), so it can predict a lot without z: that is the setting where posterior collapse is known to happen
(Bowman et al. 2016, arXiv:1511.06349; Chen et al. 2017, Variational Lossy Autoencoder, arXiv:1611.02731).
"""
import os, sys

import torch
import torch.nn as nn
import torch.nn.functional as F


class MaskedConv(nn.Conv2d):
    def __init__(self, cin, cout, k, mask_type):
        super().__init__(cin, cout, k, padding=k // 2)
        m = torch.ones_like(self.weight)
        c = k // 2
        m[:, :, c, c + (mask_type == "B"):] = 0
        m[:, :, c + 1:] = 0
        self.register_buffer("mask", m)

    def forward(self, x):
        return F.conv2d(x, self.weight * self.mask, self.bias, padding=self.padding)


class PixelDecoder(nn.Module):
    def __init__(self, zdim=16, ch=64, blocks=5):
        super().__init__()
        self.inp = MaskedConv(1, ch, 7, "A")
        self.blocks = nn.ModuleList([MaskedConv(ch, ch, 3, "B") for _ in range(blocks)])
        self.zb = nn.Linear(zdim, ch * (blocks + 1))                  # one bias vector per layer from z
        self.out = nn.Sequential(nn.ReLU(), nn.Conv2d(ch, ch, 1), nn.ReLU(), nn.Conv2d(ch, 1, 1))
        self.ch = ch

    def forward(self, x, z):
        b = self.zb(z).view(z.shape[0], -1, self.ch, 1, 1)
        h = F.relu(self.inp(x) + b[:, 0])
        for i, blk in enumerate(self.blocks):
            h = h + F.relu(blk(h) + b[:, i + 1])
        return self.out(h)


class PixelVAE(nn.Module):
    def __init__(self, zdim=16, blocks=5):
        super().__init__()
        import nets
        self.encoder = nets.ConvVAE(latent_dim=zdim)                  # only its encoder half is used
        del self.encoder.dec, self.encoder.from_z
        self.decoder = PixelDecoder(zdim, blocks=blocks)
        self.zdim = zdim

    def encode(self, x):
        return self.encoder.encode(x)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)
        return self.decoder(x, z), mu, logvar

    @torch.no_grad()
    def sample(self, z, gen=None, mode="bernoulli"):
        """Autoregressive decoding, one pixel at a time (1,024 decoder passes for 32x32). mode "bernoulli" draws each
        pixel as black or white with the predicted probability; "mean" writes the probability itself (grey levels,
        deterministic given z). The 2-pixel padding ring is written too, like every other pixel."""
        x = -torch.ones(z.shape[0], 1, 32, 32, device=z.device)
        for i in range(32):
            for j in range(32):
                p = torch.sigmoid(self.decoder(x, z)[:, 0, i, j])
                if mode == "mean":
                    x[:, 0, i, j] = 2 * p - 1
                else:
                    u = torch.rand(p.shape, generator=gen).to(z.device)
                    x[:, 0, i, j] = torch.where(u < p, 1.0, -1.0)
        return x
