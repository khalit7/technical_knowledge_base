"""Samplers for this page, written out by hand (the page shows them). Conventions as the root's samplers.py:
linear betas, T = 1000, trailing timesteps, the net takes t / T, classifier-free guidance in diffusers' scale s.

eps_fn(x, t_int) -> predicted noise. Guidance variants build eps_fn; samplers only call it.
"""
import torch


def trailing(n, T=1000):
    return [int(round(T - k * T / n)) - 1 for k in range(n)]


@torch.no_grad()
def ddim_eta(eps_fn, abar, x, n, eta=0.0, gen=None, clip=False, trace=None):
    """DDIM with stochasticity eta (Song et al. 2020, eq. 12 and 16). eta = 0: deterministic DDIM (the probability-flow
    ODE, first order); eta = 1: the ancestral DDPM sampler with sigma^2 = beta_tilde. clip: clamp x0_hat to [-1, 1]."""
    ts = trailing(n)
    for i, t in enumerate(ts):
        ab = abar[t]
        ab_prev = abar[ts[i + 1]] if i + 1 < n else torch.ones_like(ab)
        eps = eps_fn(x, t)
        x0 = (x - (1 - ab).sqrt() * eps) / ab.sqrt()
        if clip:
            x0 = x0.clamp(-1, 1)
            eps = (x - ab.sqrt() * x0) / (1 - ab).sqrt()            # keep eps consistent with the clipped x0
        sigma = eta * ((1 - ab_prev) / (1 - ab) * (1 - ab / ab_prev)).sqrt() if i + 1 < n else 0 * ab
        x = ab_prev.sqrt() * x0 + (1 - ab_prev - sigma ** 2).clamp(min=0).sqrt() * eps
        if i + 1 < n and eta > 0:
            x = x + sigma * torch.randn(x.shape, generator=gen).to(x.device)
        if trace is not None:
            trace.append((t, x.clone(), x0.clone()))
    return x


def cfg(net, y, s=1.0, phi=0.0, null=10, T=1000, interval=None):
    """Classifier-free guidance eps_u + s (eps_c - eps_u); phi > 0: CFG rescale (Lin et al. 2023, sec. 3.4; diffusers
    rescale_noise_cfg); interval = (t_lo, t_hi): guide only for t_lo <= t <= t_hi, plain conditional elsewhere
    (Kynkaanniemi et al. 2024)."""
    def f(x, t):
        tt = torch.full((x.shape[0],), float(t) / T, device=x.device)
        on = s != 1 and (interval is None or interval[0] <= t <= interval[1])
        if not on:
            return net(x, tt, y)
        out = net(torch.cat([x, x]), torch.cat([tt, tt]), torch.cat([y, torch.full_like(y, null)]))
        c, u = out.chunk(2)
        g = u + s * (c - u)
        if phi > 0:
            dims = list(range(1, g.ndim))
            r = g * (c.std(dim=dims, keepdim=True) / g.std(dim=dims, keepdim=True))
            g = phi * r + (1 - phi) * g
        return g
    return f


def autoguide(good, bad, y, w=2.0, T=1000):
    """Autoguidance (Karras et al. 2024): guide the good conditional model with a weaker version of itself,
    eps_bad + w (eps_good - eps_bad). Both models get the same condition."""
    def f(x, t):
        tt = torch.full((x.shape[0],), float(t) / T, device=x.device)
        g = good(x, tt, y)
        if w == 1:
            return g
        b = bad(x, tt, y)
        return b + w * (g - b)
    return f


class Count:
    """Wrap a network and count evaluations (one per image batch call)."""
    def __init__(self, net):
        self.net, self.n = net, 0

    def __call__(self, *a, **k):
        self.n += 1
        return self.net(*a, **k)
