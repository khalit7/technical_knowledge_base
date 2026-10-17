"""Reference objectives and the simplest samplers, used by the smoke tests and available to every lab.

The labs are free to write their own (writing a sampler is part of the lesson); these exist so the shared
loop is proven end to end and so the Diffusion and Flow labs start from the same definitions.

Conventions (stated because the literature and libraries disagree):
- DDPM: integer steps t = 0..T-1 with T = 1000; x_t = sqrt(abar_t) x0 + sqrt(1 - abar_t) eps; the net sees
  t / T as a float in [0,1). Linear betas 1e-4..0.02 (Ho et al. 2020) or the cosine schedule (Nichol and
  Dhariwal 2021, s = 0.008, betas clipped at 0.999).
- Flow matching: t in [0,1] with t = 0 noise and t = 1 data (Lipman et al. 2023 convention);
  x_t = (1 - t) x0 + t x1, target velocity x1 - x0. diffusers' FlowMatchEulerDiscreteScheduler uses the
  opposite direction (sigma = 1 is noise), so mind the sign when comparing.
"""
import math

import torch
import torch.nn.functional as F

NULL_CLASS = 10


def drop_labels(y, p_uncond):
    """Classifier-free guidance training: replace a fraction p_uncond of labels by the null class."""
    if p_uncond <= 0:
        return y
    m = torch.rand(y.shape, device=y.device) < p_uncond
    return torch.where(m, torch.full_like(y, NULL_CLASS), y)


# ------------------------------------------------------------------ DDPM
def betas_linear(T=1000, b0=1e-4, b1=0.02):
    return torch.linspace(b0, b1, T, dtype=torch.float64)


def betas_cosine(T=1000, s=0.008):
    f = lambda t: torch.cos((t / T + s) / (1 + s) * math.pi / 2) ** 2
    t = torch.arange(T + 1, dtype=torch.float64)
    abar = f(t) / f(torch.tensor(0.0, dtype=torch.float64))
    return (1 - abar[1:] / abar[:-1]).clamp(max=0.999)


class Schedule:
    def __init__(self, betas):
        self.T = len(betas)
        self.betas = betas.float()
        self.alphas = 1 - self.betas
        self.abar = torch.cumprod(betas.new_ones(()) - betas, 0).float()   # cumulative product in float64, then float32

    def to(self, dev):
        for k in ("betas", "alphas", "abar"):
            setattr(self, k, getattr(self, k).to(dev))
        return self

    def q_sample(self, x0, t, eps):
        a = self.abar[t].view(-1, 1, 1, 1)
        return a.sqrt() * x0 + (1 - a).sqrt() * eps

    def snr(self):
        return self.abar / (1 - self.abar)


def ddpm_loss(model, x0, y, sched, p_uncond=0.1):
    """Simple epsilon-prediction loss (Ho et al. 2020, eq. 14): || eps - eps_theta(x_t, t) ||^2."""
    t = torch.randint(0, sched.T, (x0.shape[0],), device=x0.device)
    eps = torch.randn_like(x0)
    pred = model(sched.q_sample(x0, t, eps), t.float() / sched.T, drop_labels(y, p_uncond))
    loss = F.mse_loss(pred, eps)
    return loss, {"loss": loss.item()}


@torch.no_grad()
def sample_ddpm(model, sched, y, shape, guidance=0.0, gen=None):
    """Ancestral DDPM sampling, all T steps, sigma_t^2 = beta_t; CFG: eps = eps_u + (1 + w)(eps_c - eps_u)
    written here as eps_c + w (eps_c - eps_u), w = 0 means plain conditional sampling."""
    dev = sched.abar.device
    x = torch.randn(shape, device=dev, generator=gen)
    for i in reversed(range(sched.T)):
        t = torch.full((shape[0],), i / sched.T, device=dev)
        e = model(x, t, y)
        if guidance:
            e = e + guidance * (e - model(x, t, None))
        a, ab, b = sched.alphas[i], sched.abar[i], sched.betas[i]
        x = (x - b / (1 - ab).sqrt() * e) / a.sqrt()
        if i > 0:
            x = x + b.sqrt() * torch.randn(shape, device=dev, generator=gen)
    return x.clamp(-1, 1)


# ------------------------------------------------------------------ flow matching
def cfm_loss(model, x1, y, p_uncond=0.1):
    """Conditional flow matching with straight paths (rectified flow / OT-CFM with sigma_min = 0)."""
    x0 = torch.randn_like(x1)
    t = torch.rand(x1.shape[0], device=x1.device)
    tt = t.view(-1, 1, 1, 1)
    pred = model((1 - tt) * x0 + tt * x1, t, drop_labels(y, p_uncond))
    loss = F.mse_loss(pred, x1 - x0)
    return loss, {"loss": loss.item()}


@torch.no_grad()
def sample_euler(model, y, shape, steps=50, guidance=0.0, dev="cpu", gen=None):
    """Integrate dx/dt = v(x, t) from t = 0 (noise) to t = 1 (data) with fixed Euler steps."""
    x = torch.randn(shape, device=dev, generator=gen)
    for k in range(steps):
        t = torch.full((shape[0],), k / steps, device=dev)
        v = model(x, t, y)
        if guidance:
            v = v + guidance * (v - model(x, t, None))
        x = x + v / steps
    return x.clamp(-1, 1)


# ------------------------------------------------------------------ autoencoders
def to_image(logits):
    """Decoder logits -> image in [-1,1]."""
    return torch.sigmoid(logits) * 2 - 1


def recon_bce(logits, x):
    """Bernoulli reconstruction loss in nats per image (targets (x+1)/2 in [0,1]), summed over 32x32 pixels."""
    return F.binary_cross_entropy_with_logits(logits, (x + 1) / 2, reduction="sum") / x.shape[0]


def ae_loss(model, x, y=None):
    logits, z = model(x)
    rec = recon_bce(logits, x)
    return rec, {"loss": rec.item(), "rec": rec.item()}


def vae_loss(model, x, y=None, beta=1.0):
    """Negative ELBO (beta = 1) per image: reconstruction + beta * KL(q(z|x) || N(0, I))."""
    logits, mu, logvar = model(x)
    rec = recon_bce(logits, x)
    kl = 0.5 * (mu.pow(2) + logvar.exp() - 1 - logvar).flatten(1).sum(1).mean()
    loss = rec + beta * kl
    return loss, {"loss": loss.item(), "rec": rec.item(), "kl": kl.item()}
