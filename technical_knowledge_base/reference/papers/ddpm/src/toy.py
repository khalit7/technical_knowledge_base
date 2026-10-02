"""Shared definitions of the page's toy DDPM: the data, the schedule, the network, the losses and
the variational bound, all as in Ho, Jain and Abbeel 2020 (https://arxiv.org/html/2006.11239v2).

Data: a 2-D Swiss roll (the toy of Sohl-Dickstein et al. 2015, the paper DDPM builds on), each
coordinate stored as an integer in {0..255} and scaled linearly to [-1, 1] exactly as §3.3 does for
pixels, so the bound is a lossless codelength in bits per dimension like the paper's.
Schedule: T = 1000, beta linear from 1e-4 to 0.02 (§4).
Network: eps_theta(x_t, t), an MLP (width 64, three hidden layers, SiLU) with the Transformer
sinusoidal embedding of t added into every hidden layer (the paper adds it into every residual
block, Appendix B). The mu-variants use the same network, its output read as mu_theta directly.
"""
import math
import numpy as np
import torch
import torch.nn as nn

T = 1000
BETA = np.linspace(1e-4, 0.02, T)          # beta_1 .. beta_T  (index t-1)
ALPHA = 1 - BETA
ABAR = np.cumprod(ALPHA)
ABAR_PREV = np.concatenate([[1.0], ABAR[:-1]])
BTILDE = (1 - ABAR_PREV) / (1 - ABAR) * BETA  # Eq. 7 (BTILDE[0] = 0)
W, TE = 64, 32                               # hidden width, time-embedding size
D = 2


def mulberry32(seed):
    """The same tiny PRNG as the page's JS, so a sampling run can be replayed exactly."""
    a = seed & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def gauss_stream(seed):
    """Box-Muller on mulberry32, two normals per pair of uniforms, as in the JS."""
    u = mulberry32(seed); spare = []
    def g():
        if spare: return spare.pop()
        a = max(u(), 1e-12); b = u()
        r = math.sqrt(-2 * math.log(a))
        spare.append(r * math.sin(2 * math.pi * b))
        return r * math.cos(2 * math.pi * b)
    return g


def swiss_roll(n, seed, noise=0.25):
    """sklearn-style Swiss roll in 2-D: theta = 1.5 pi (1 + 2u), point theta (cos, sin) + noise,
    scaled into [-0.9, 0.9], then quantised to 8 bits per coordinate. Returns integers 0..255."""
    rng = np.random.default_rng(seed)
    th = 1.5 * np.pi * (1 + 2 * rng.random(n))
    p = np.stack([th * np.cos(th), th * np.sin(th)], 1) + noise * rng.standard_normal((n, 2))
    p = p * (0.9 / 14.2)
    return np.clip(np.round((p + 1) * 127.5), 0, 255).astype(np.int64)


def to_x(ints):
    return ints / 127.5 - 1.0


def roll_curve(m=4000):
    """The noiseless generating curve, in the scaled coordinates, for distance-to-roll measurements."""
    th = np.linspace(1.5 * np.pi, 4.5 * np.pi, m)
    return np.stack([th * np.cos(th), th * np.sin(th)], 1) * (0.9 / 14.2)


def temb(t):
    """Transformer sinusoidal embedding of the integer timestep t (tensor of shape [B]), size TE."""
    half = TE // 2
    f = torch.exp(-math.log(10000) * torch.arange(half, dtype=torch.float32) / (half - 1))
    a = t.float()[:, None] * f[None]
    return torch.cat([torch.sin(a), torch.cos(a)], 1)


class Net(nn.Module):
    def __init__(s):
        super().__init__()
        s.l1, s.l2, s.l3, s.lo = nn.Linear(D, W), nn.Linear(W, W), nn.Linear(W, W), nn.Linear(W, D)
        s.p1, s.p2, s.p3 = (nn.Linear(TE, W, bias=False) for _ in range(3))
        s.act = nn.SiLU()

    def forward(s, x, t):
        e = temb(t)
        h = s.act(s.l1(x) + s.p1(e))
        h = s.act(s.l2(h) + s.p2(e))
        h = s.act(s.l3(h) + s.p3(e))
        return s.lo(h)


SCH = {k: torch.tensor(v, dtype=torch.float32) for k, v in dict(beta=BETA, alpha=ALPHA, abar=ABAR, abar_prev=ABAR_PREV, btilde=BTILDE).items()}


def q_sample(x0, t, eps):
    ab = SCH['abar'][t - 1][:, None]
    return ab.sqrt() * x0 + (1 - ab).sqrt() * eps                       # Eq. 4


def post_mean(x0, xt, t):
    ab, abp, b, a = (SCH[k][t - 1][:, None] for k in ('abar', 'abar_prev', 'beta', 'alpha'))
    return abp.sqrt() * b / (1 - ab) * x0 + a.sqrt() * (1 - abp) / (1 - ab) * xt   # Eq. 7


def model_mean(net, kind, xt, t):
    """mu_theta(x_t, t): from eps via Eq. 11, or the network output itself for the mu-variants."""
    out = net(xt, t)
    if kind.startswith('eps'):
        b, ab, a = (SCH[k][t - 1][:, None] for k in ('beta', 'abar', 'alpha'))
        return (xt - b / (1 - ab).sqrt() * out) / a.sqrt(), out
    return out, None


def approx_std_normal_cdf(x):
    return 0.5 * (1.0 + torch.erf(x / math.sqrt(2.0)))


def disc_loglik(x0, mean, sd):
    """log p_theta(x_0 | x_1) of Eq. 13: the Gaussian integrated over each 8-bit bin, edges to +-inf."""
    up = torch.where(x0 > 0.999, torch.full_like(x0, 1e9), x0 + 1 / 255.)
    lo = torch.where(x0 < -0.999, torch.full_like(x0, -1e9), x0 - 1 / 255.)
    p = approx_std_normal_cdf((up - mean) / sd) - approx_std_normal_cdf((lo - mean) / sd)
    return torch.log(p.clamp(min=1e-12)).sum(1)


def gauss_kl(m1, v1, m2, v2):
    """KL(N(m1, v1 I) || N(m2, v2 I)) summed over the D coordinates (v scalar per row)."""
    return 0.5 * (D * (v1 / v2 - 1 - torch.log(v1 / v2)) + ((m1 - m2) ** 2).sum(1) / v2)


def bound_terms(net, kind, x0, t, eps, sig='beta'):
    """One term of the bound (Eq. 5) per row, in nats: L_{t-1} for t > 1 and L_0 for t = 1."""
    xt = q_sample(x0, t, eps)
    mu, _ = model_mean(net, kind, xt, t)
    var = (SCH['beta'] if sig == 'beta' else SCH['btilde'])[t - 1]
    var = torch.where(t == 1, SCH['beta'][0].expand_as(var), var)
    kl = gauss_kl(post_mean(x0, xt, t), SCH['btilde'][t - 1].clamp(min=1e-20), mu, var)
    l0 = -disc_loglik(x0, mu, var.sqrt()[:, None])
    return torch.where(t == 1, l0, kl)


def LT(x0):
    """L_T = KL(q(x_T | x_0) || N(0, I)) per row, nats."""
    ab = float(ABAR[-1])
    return 0.5 * (D * (1 - ab - 1 - math.log(1 - ab)) + ab * (x0 ** 2).sum(1))
