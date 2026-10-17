"""The tiny models every lab shares (inputs are 1x32x32 Fashion-MNIST in [-1,1], see common.to_model).

TinyUNet   denoiser / velocity net for the Diffusion and Flow labs (same network, different objective).
TinyDiT    the same job with a transformer over 4x4 patches (adaLN-Zero conditioning, as in DiT).
ConvAE     plain autoencoder (flat latent or spatial latent).
ConvVAE    the same encoder and decoder, the encoder outputting a mean and a log-variance.
FMClassifier  small CNN used to score samples (class accuracy, and a Frechet distance in its feature space).

Conditioning convention for the generators: t is a float tensor [B] in [0,1]; y is a long tensor [B]
in 0..10, where 10 (common.NULL_CLASS) means "no label" (classifier-free guidance). y=None means all null.
"""
import math

import torch
import torch.nn as nn
import torch.nn.functional as F

NULL_CLASS = 10


def n_params(m):
    return sum(p.numel() for p in m.parameters())


def timestep_embedding(t, dim, scale=1000.0):
    """Sinusoidal embedding of t in [0,1] (scaled by 1000 like DDPM's integer steps) -> [B, dim]."""
    half = dim // 2
    freqs = torch.exp(-math.log(10000.0) * torch.arange(half, device=t.device, dtype=torch.float32) / half)
    a = (t.float() * scale)[:, None] * freqs[None]
    return torch.cat([torch.cos(a), torch.sin(a)], dim=1)


class CondEmbed(nn.Module):
    """time embedding (sinusoid -> MLP) plus a learned class embedding (11 rows: 10 classes + null)."""
    def __init__(self, dim, num_classes=10):
        super().__init__()
        self.dim = dim
        self.mlp = nn.Sequential(nn.Linear(dim, dim * 4), nn.SiLU(), nn.Linear(dim * 4, dim * 4))
        self.cls = nn.Embedding(num_classes + 1, dim * 4)

    def forward(self, t, y):
        if y is None:
            y = torch.full((t.shape[0],), NULL_CLASS, device=t.device, dtype=torch.long)
        return self.mlp(timestep_embedding(t, self.dim)) + self.cls(y)


# ------------------------------------------------------------------ TinyUNet
class ResBlock(nn.Module):
    def __init__(self, cin, cout, emb):
        super().__init__()
        self.n1 = nn.GroupNorm(8, cin); self.c1 = nn.Conv2d(cin, cout, 3, padding=1)
        self.e = nn.Linear(emb, cout)
        self.n2 = nn.GroupNorm(8, cout); self.c2 = nn.Conv2d(cout, cout, 3, padding=1)
        self.skip = nn.Conv2d(cin, cout, 1) if cin != cout else nn.Identity()

    def forward(self, x, e):
        h = self.c1(F.silu(self.n1(x)))
        h = h + self.e(F.silu(e))[:, :, None, None]
        h = self.c2(F.silu(self.n2(h)))
        return h + self.skip(x)


class Attn(nn.Module):
    def __init__(self, c, heads=4):
        super().__init__()
        self.n = nn.GroupNorm(8, c); self.qkv = nn.Conv2d(c, 3 * c, 1); self.o = nn.Conv2d(c, c, 1); self.h = heads

    def forward(self, x):
        B, C, H, W = x.shape
        q, k, v = self.qkv(self.n(x)).reshape(B, 3, self.h, C // self.h, H * W).unbind(1)
        a = F.scaled_dot_product_attention(q.transpose(-1, -2), k.transpose(-1, -2), v.transpose(-1, -2))
        return x + self.o(a.transpose(-1, -2).reshape(B, C, H, W))


class TinyUNet(nn.Module):
    """32x32 -> 16x16 -> 8x8 U-Net, num_res ResBlocks per level (num_res + 1 on the way up), self-attention
    at 8x8 and in the middle, skip connections.

    The shared default (base=32, num_res=1): 1,040,353 parameters, about 4.6 training steps per second at
    batch 128 on the M1 Pro's GPU (smoke/bench_nets.json). Bigger: base=64, num_res=2 is 6,177,537 parameters
    and 1.6 steps per second. Output has the input's shape
    (predicted noise, x0, v or velocity, depending on the objective the lab trains it with).
    """
    def __init__(self, in_ch=1, base=32, mult=(1, 2, 2), attn_res=(8,), num_res=1, num_classes=10):
        super().__init__()
        emb = base * 4
        self.cond = CondEmbed(base, num_classes)
        self.inp = nn.Conv2d(in_ch, base, 3, padding=1)
        chs = [base * m for m in mult]
        self.down, self.up = nn.ModuleList(), nn.ModuleList()
        c, res, skips = base, 32, [base]
        for i, co in enumerate(chs):
            for _ in range(num_res):
                self.down.append(nn.ModuleList([ResBlock(c, co, emb), Attn(co) if res in attn_res else nn.Identity()]))
                c = co; skips.append(c)
            if i < len(chs) - 1:
                self.down.append(nn.Conv2d(c, c, 3, stride=2, padding=1)); skips.append(c); res //= 2
        self.mid1, self.mida, self.mid2 = ResBlock(c, c, emb), Attn(c), ResBlock(c, c, emb)
        for i, co in reversed(list(enumerate(chs))):
            for _ in range(num_res + 1):
                self.up.append(nn.ModuleList([ResBlock(c + skips.pop(), co, emb), Attn(co) if res in attn_res else nn.Identity()]))
                c = co
            if i > 0:
                self.up.append(nn.Upsample(scale_factor=2, mode="nearest")); res *= 2
        self.out = nn.Sequential(nn.GroupNorm(8, c), nn.SiLU(), nn.Conv2d(c, in_ch, 3, padding=1))
        nn.init.zeros_(self.out[-1].weight); nn.init.zeros_(self.out[-1].bias)

    def forward(self, x, t, y=None):
        e = self.cond(t, y)
        h = self.inp(x); hs = [h]
        for m in self.down:
            if isinstance(m, nn.ModuleList):
                h = m[1](m[0](h, e))
            else:
                h = m(h)
            hs.append(h)
        h = self.mid2(self.mida(self.mid1(h, e)), e)
        for m in self.up:
            if isinstance(m, nn.ModuleList):
                h = m[1](m[0](torch.cat([h, hs.pop()], 1), e))
            else:
                h = m(h)
        return self.out(h)


# ------------------------------------------------------------------ TinyDiT
def sincos_2d(dim, n):
    """Fixed 2-D sine-cosine position embedding for an n x n grid -> [n*n, dim] (as in MAE and DiT)."""
    g = torch.arange(n, dtype=torch.float32)
    yy, xx = torch.meshgrid(g, g, indexing="ij")
    q = dim // 4
    om = 1.0 / 10000 ** (torch.arange(q, dtype=torch.float32) / q)
    out = [f(c.flatten()[:, None] * om[None]) for c in (yy, xx) for f in (torch.sin, torch.cos)]
    return torch.cat(out, 1)


class DiTBlock(nn.Module):
    def __init__(self, d, heads, emb):
        super().__init__()
        self.n1 = nn.LayerNorm(d, elementwise_affine=False, eps=1e-6)
        self.attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.n2 = nn.LayerNorm(d, elementwise_affine=False, eps=1e-6)
        self.mlp = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(approximate="tanh"), nn.Linear(4 * d, d))
        self.ada = nn.Sequential(nn.SiLU(), nn.Linear(emb, 6 * d))
        nn.init.zeros_(self.ada[-1].weight); nn.init.zeros_(self.ada[-1].bias)   # adaLN-Zero: block starts as identity

    def forward(self, x, e):
        s1, b1, g1, s2, b2, g2 = self.ada(e)[:, None].chunk(6, dim=2)
        h = self.n1(x) * (1 + s1) + b1
        x = x + g1 * self.attn(h, h, h, need_weights=False)[0]
        h = self.n2(x) * (1 + s2) + b2
        return x + g2 * self.mlp(h)


class TinyDiT(nn.Module):
    """Patchify 32x32 into 8x8=64 tokens of 4x4 pixels, d=192, 6 blocks, 6 heads: 4,127,632 parameters."""
    def __init__(self, in_ch=1, patch=4, d=192, depth=6, heads=6, num_classes=10):
        super().__init__()
        self.p, self.in_ch, self.n = patch, in_ch, 32 // patch
        self.embed = nn.Conv2d(in_ch, d, patch, stride=patch)
        self.register_buffer("pos", sincos_2d(d, self.n)[None], persistent=False)
        self.cond = CondEmbed(d // 4, num_classes)      # output width 4 * (d // 4) = d
        self.blocks = nn.ModuleList([DiTBlock(d, heads, d) for _ in range(depth)])
        self.nf = nn.LayerNorm(d, elementwise_affine=False, eps=1e-6)
        self.ada_f = nn.Sequential(nn.SiLU(), nn.Linear(d, 2 * d))
        self.head = nn.Linear(d, patch * patch * in_ch)
        for m in (self.ada_f[-1], self.head):
            nn.init.zeros_(m.weight); nn.init.zeros_(m.bias)

    def forward(self, x, t, y=None):
        B = x.shape[0]
        h = self.embed(x).flatten(2).transpose(1, 2) + self.pos          # [B, 64, d]
        e = self.cond(t, y)
        for b in self.blocks:
            h = b(h, e)
        s, b_ = self.ada_f(e)[:, None].chunk(2, dim=2)
        h = self.head(self.nf(h) * (1 + s) + b_)                         # [B, 64, p*p*C]
        h = h.reshape(B, self.n, self.n, self.p, self.p, self.in_ch)
        return h.permute(0, 5, 1, 3, 2, 4).reshape(B, self.in_ch, 32, 32)


# ------------------------------------------------------------------ autoencoders
class _Enc(nn.Module):
    def __init__(self, in_ch, ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, ch, 3, stride=2, padding=1), nn.SiLU(),        # 16x16
            nn.Conv2d(ch, 2 * ch, 3, stride=2, padding=1), nn.SiLU(),       # 8x8
            nn.Conv2d(2 * ch, 2 * ch, 3, padding=1), nn.SiLU())

    def forward(self, x):
        return self.net(x)


class _Dec(nn.Module):
    def __init__(self, out_ch, ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(2 * ch, 2 * ch, 3, padding=1), nn.SiLU(),
            nn.ConvTranspose2d(2 * ch, ch, 4, stride=2, padding=1), nn.SiLU(),   # 16x16
            nn.ConvTranspose2d(ch, ch, 4, stride=2, padding=1), nn.SiLU(),       # 32x32
            nn.Conv2d(ch, out_ch, 3, padding=1))

    def forward(self, h):
        return self.net(h)


class ConvAE(nn.Module):
    """Encoder 32x32 -> 8x8 feature map; latent either flat (latent_dim numbers, via a Linear) or spatial
    (latent_ch channels at 8x8, a 4x downsampled map like the Stable Diffusion VAE's 8x/4-channel latent).
    The decoder returns logits; image = tanh-free mapping sigmoid(logits)*2-1 (objectives.to_image)."""
    def __init__(self, latent_dim=16, spatial=False, latent_ch=2, in_ch=1, ch=32):
        super().__init__()
        self.spatial, self.latent_dim, self.latent_ch, self.ch = spatial, latent_dim, latent_ch, ch
        self.enc, self.dec = _Enc(in_ch, ch), _Dec(in_ch, ch)
        k = self._k()
        if spatial:
            self.to_z = nn.Conv2d(2 * ch, k, 1); self.from_z = nn.Conv2d(latent_ch, 2 * ch, 1)
        else:
            self.to_z = nn.Linear(2 * ch * 64, k); self.from_z = nn.Linear(latent_dim, 2 * ch * 64)

    def _k(self):
        return self.latent_ch if self.spatial else self.latent_dim

    def encode(self, x):
        h = self.enc(x)
        return self.to_z(h if self.spatial else h.flatten(1))

    def decode(self, z):
        h = self.from_z(z)
        if not self.spatial:
            h = h.reshape(-1, 2 * self.ch, 8, 8)
        return self.dec(h)

    def forward(self, x):
        z = self.encode(x)
        return self.decode(z), z


class ConvVAE(ConvAE):
    """Same encoder and decoder; the encoder outputs mean and log-variance, z = mu + sigma * eps."""
    def _k(self):
        return 2 * (self.latent_ch if self.spatial else self.latent_dim)

    def encode(self, x):
        mu, logvar = super().encode(x).chunk(2, dim=1)
        return mu, logvar.clamp(-30, 20)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = mu + torch.exp(0.5 * logvar) * torch.randn_like(mu)     # the reparameterisation trick
        return self.decode(z), mu, logvar


# ------------------------------------------------------------------ scorer
class FMClassifier(nn.Module):
    """Small CNN on 1x32x32 in [-1,1]; .features() is the 128-d penultimate layer used for FD."""
    def __init__(self):
        super().__init__()
        def blk(a, b):
            return nn.Sequential(nn.Conv2d(a, b, 3, padding=1), nn.BatchNorm2d(b), nn.ReLU(),
                                 nn.Conv2d(b, b, 3, padding=1), nn.BatchNorm2d(b), nn.ReLU(), nn.MaxPool2d(2))
        self.body = nn.Sequential(blk(1, 32), blk(32, 64), blk(64, 128))   # 4x4
        self.fc = nn.Sequential(nn.Flatten(), nn.Dropout(0.3), nn.Linear(128 * 16, 128), nn.ReLU())
        self.cls = nn.Linear(128, 10)

    def features(self, x):
        return self.fc(self.body(x))

    def forward(self, x):
        return self.cls(self.features(x))
