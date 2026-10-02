"""Toy latent diffusion: the data, the checker, the autoencoder, the UNet with cross-attention, the schedule, DDIM.

Everything the page's JavaScript re-implements (parts/22_js_model.js) is defined here, op for op:
conv 3x3 (padding 1, stride 1 or 2), nearest 2x upsampling, GroupNorm (4 groups, eps 1e-5), SiLU, Linear, LayerNorm (eps 1e-5),
single-head softmax attention.

Data: 32 x 32 RGB images of one shape (circle, square, triangle) in one of four colours at one of nine positions, on a light
background with faint per-pixel grain (the "imperceptible detail" that perceptual compression is meant to drop). The prompt is
three tokens: colour, shape, position. Every sample is checkable by a deterministic rule (check()).
"""
import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# ---------------------------------------------------------------- data
COLOURS = ['red', 'green', 'blue', 'yellow']
RGB = np.array([[0.85, 0.20, 0.20], [0.20, 0.62, 0.30], [0.22, 0.36, 0.85], [0.95, 0.78, 0.15]])
SHAPES = ['circle', 'square', 'triangle']
POS = ['top left', 'top', 'top right', 'left', 'centre', 'right', 'bottom left', 'bottom', 'bottom right']
VOCAB = COLOURS + SHAPES + POS + ['(none)']           # 17 tokens; the last is the null prompt for classifier-free guidance
NULL = len(VOCAB) - 1
CENTRES = [8.0, 16.0, 24.0]
R = 32
GRAIN = 0.02                                           # std of the per-pixel grain, in [0, 1] units


def all_combos():
    return [(c, s, p) for c in range(4) for s in range(3) for p in range(9)]


def heldout_combos(seed=7, n=12):
    """12 of the 108 (colour, shape, position) prompts never seen in training; each colour, shape and position is still seen."""
    rng = np.random.default_rng(seed)
    cs = all_combos()
    idx = rng.choice(len(cs), n, replace=False)
    return sorted(cs[i] for i in idx)


def tokens(combo):
    c, s, p = combo
    return [c, 4 + s, 7 + p]


def sample_params(n, rng, combos):
    pick = rng.integers(0, len(combos), n)
    cb = np.array([combos[i] for i in pick])
    size = rng.uniform(4.5, 7.0, n)                    # half-width of the shape in pixels
    cx = np.array(CENTRES)[cb[:, 2] % 3] + rng.uniform(-2, 2, n)
    cy = np.array(CENTRES)[cb[:, 2] // 3] + rng.uniform(-2, 2, n)
    bg = 0.80 + rng.uniform(-0.06, 0.08, (n, 1)) + rng.uniform(-0.03, 0.03, (n, 3))
    col = RGB[cb[:, 0]] + rng.uniform(-0.05, 0.05, (n, 3))
    return dict(combo=cb, size=size, cx=cx, cy=cy, bg=bg, col=col, seed=rng.integers(0, 2**31, n))


def render(P, ss=4):
    """Anti-aliased rendering by ss x ss supersampling. Returns float images in [0, 1], shape (n, 32, 32, 3)."""
    n = len(P['size'])
    g = (np.arange(R * ss) + 0.5) / ss
    X, Y = np.meshgrid(g, g)
    out = np.zeros((n, R, R, 3))
    for i in range(n):
        s, cx, cy, sh = P['size'][i], P['cx'][i], P['cy'][i], P['combo'][i][1]
        dx, dy = X - cx, Y - cy
        if sh == 0:
            m = dx * dx + dy * dy <= s * s
        elif sh == 1:
            m = (np.abs(dx) <= s * 0.9) & (np.abs(dy) <= s * 0.9)
        else:  # upward triangle with base 2s and height 2s
            m = (dy <= s) & (dy >= -s) & (np.abs(dx) <= (dy + s) / 2)
        cov = m.reshape(R, ss, R, ss).mean(axis=(1, 3))[..., None]
        img = P['bg'][i] * (1 - cov) + P['col'][i] * cov
        gr = np.random.default_rng(int(P['seed'][i])).normal(0, GRAIN, (R, R, 1))
        out[i] = np.clip(img + gr, 0, 1)
    return out


def check(imgs):
    """Deterministic checker for images in [0, 1], shape (n, 32, 32, 3). Returns a dict of arrays:
    valid (one clean blob of plausible size), colour, shape, pos (indices, -1 when invalid)."""
    n = len(imgs)
    res = {k: np.full(n, -1) for k in ('colour', 'shape', 'pos')}
    res['valid'] = np.zeros(n, bool)
    for i in range(n):
        im = imgs[i]
        border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
        bg = np.median(border, axis=0)
        d = np.sqrt(((im - bg) ** 2).sum(-1))
        m = d > 0.3
        A = int(m.sum())
        if A < 25 or A > 320:
            continue
        lab = _largest(m)
        if lab.sum() < 0.9 * A:
            continue
        ys, xs = np.nonzero(lab)
        bb = (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)
        fill = A / bb
        res['fill'] = res.get('fill', np.zeros(n)); res['fill'][i] = fill
        res['shape'][i] = 1 if fill > 0.88 else (0 if fill > 0.665 else (2 if fill > 0.38 else -1))
        mean = im[lab].mean(0)
        res['colour'][i] = int(np.argmin(((RGB - mean) ** 2).sum(-1)))
        cx, cy = (xs.min() + xs.max() + 1) / 2, (ys.min() + ys.max() + 1) / 2   # bounding-box centre (a triangle's centroid sits low)
        col = 0 if cx < 12 else (1 if cx < 20 else 2)
        row = 0 if cy < 12 else (1 if cy < 20 else 2)
        res['pos'][i] = row * 3 + col
        res['valid'][i] = res['shape'][i] >= 0
    return res


def _largest(m):
    """Largest 4-connected component of a boolean mask (flood fill)."""
    H, W = m.shape
    seen = np.zeros_like(m)
    best = None
    bn = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not seen[y, x]:
                st = [(y, x)]
                seen[y, x] = True
                comp = []
                while st:
                    a, b = st.pop()
                    comp.append((a, b))
                    for u, v in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= u < H and 0 <= v < W and m[u, v] and not seen[u, v]:
                            seen[u, v] = True
                            st.append((u, v))
                if len(comp) > bn:
                    bn = len(comp)
                    best = comp
    out = np.zeros_like(m)
    for a, b in best:
        out[a, b] = True
    return out


def score(imgs, combos):
    """Share of samples whose colour, shape and position all match their prompt, plus each part."""
    r = check(imgs)
    cb = np.array(combos)
    ok_c = r['colour'] == cb[:, 0]
    ok_s = r['shape'] == cb[:, 1]
    ok_p = r['pos'] == cb[:, 2]
    v = r['valid']
    return dict(valid=float(v.mean()), colour=float((v & ok_c).mean()), shape=float((v & ok_s).mean()),
                pos=float((v & ok_p).mean()), all=float((v & ok_c & ok_s & ok_p).mean()))


# ---------------------------------------------------------------- networks
def gn(c):
    return nn.GroupNorm(4, c, eps=1e-5)


class AE(nn.Module):
    """KL-regularised autoencoder with downsampling factor f = 2^m and c latent channels (Sec. 3.1, Appendix G).
    Encoder: conv(3->C), m x [conv stride 2, SiLU, conv, SiLU], conv(C -> 2c) giving mean and log-variance.
    Decoder: conv(c->C), SiLU, m x [nearest 2x, conv, SiLU, conv, SiLU], conv(C -> 3)."""

    def __init__(self, f, c, C):
        super().__init__()
        self.f, self.c, self.C = f, c, C
        m = int(round(math.log2(f)))
        self.ein = nn.Conv2d(3, C, 3, padding=1)
        self.edown = nn.ModuleList([nn.ModuleList([nn.Conv2d(C, C, 3, stride=2, padding=1), nn.Conv2d(C, C, 3, padding=1)]) for _ in range(m)])
        self.eout = nn.Conv2d(C, 2 * c, 3, padding=1)
        with torch.no_grad():                          # start with small posterior noise (sigma about 0.05) so the decoder uses z from step 1
            self.eout.bias[c:].fill_(-6.0)
        self.din = nn.Conv2d(c, C, 3, padding=1)
        self.dup = nn.ModuleList([nn.ModuleList([nn.Conv2d(C, C, 3, padding=1), nn.Conv2d(C, C, 3, padding=1)]) for _ in range(m)])
        self.dout = nn.Conv2d(C, 3, 3, padding=1)

    def encode(self, x):
        h = F.silu(self.ein(x))
        for a, b in self.edown:
            h = F.silu(b(F.silu(a(h))))
        mo = self.eout(h)
        return mo[:, :self.c], mo[:, self.c:].clamp(-30, 20)

    def decode(self, z):
        h = F.silu(self.din(z))
        for a, b in self.dup:
            h = F.interpolate(h, scale_factor=2, mode='nearest')
            h = F.silu(b(F.silu(a(h))))
        return self.dout(h)


def temb_sin(t, dim):
    """Sinusoidal timestep embedding as in the LDM code (openaimodel.timestep_embedding): [cos, sin], max period 10000."""
    half = dim // 2
    fr = torch.exp(-math.log(10000) * torch.arange(half, dtype=torch.float32) / half)
    a = t.float()[:, None] * fr[None]
    return torch.cat([torch.cos(a), torch.sin(a)], -1)


class ResBlock(nn.Module):
    def __init__(self, C, T):
        super().__init__()
        self.n1, self.c1, self.t, self.n2, self.c2 = gn(C), nn.Conv2d(C, C, 3, padding=1), nn.Linear(T, C), gn(C), nn.Conv2d(C, C, 3, padding=1)

    def forward(self, x, te):
        h = self.c1(F.silu(self.n1(x))) + self.t(te)[:, :, None, None]
        return x + self.c2(F.silu(self.n2(h)))


class CrossAttn(nn.Module):
    """Q = W_Q LN(phi(z_t)), K = W_K tau(y), V = W_V tau(y); softmax(Q K^T / sqrt(d)) V; out projection; residual (Sec. 3.3)."""

    def __init__(self, C, D):
        super().__init__()
        self.ln = nn.LayerNorm(C, eps=1e-5)
        self.q, self.k, self.v, self.o = nn.Linear(C, C, bias=False), nn.Linear(D, C, bias=False), nn.Linear(D, C, bias=False), nn.Linear(C, C)

    def forward(self, x, ctx, keep=None):
        B, C, H, W = x.shape
        h = x.flatten(2).transpose(1, 2)               # (B, N, C): the flattened feature map phi_i(z_t)
        q = self.q(self.ln(h))
        k, v = self.k(ctx), self.v(ctx)
        a = torch.softmax(q @ k.transpose(1, 2) / math.sqrt(C), -1)
        if keep is not None:
            keep.append(a.detach())
        h = h + self.o(a @ v)
        return h.transpose(1, 2).reshape(B, C, H, W)


class TextEnc(nn.Module):
    """tau_theta: token + position embedding, one pre-LN transformer block, final LayerNorm (Eq. 18 to 23, depth N = 1)."""

    def __init__(self, D):
        super().__init__()
        self.tok, self.pos = nn.Embedding(len(VOCAB), D), nn.Parameter(torch.randn(3, D) * 0.02)
        self.ln1, self.ln2, self.lnf = nn.LayerNorm(D, eps=1e-5), nn.LayerNorm(D, eps=1e-5), nn.LayerNorm(D, eps=1e-5)
        self.qkv, self.o = nn.Linear(D, 3 * D), nn.Linear(D, D)
        self.m1, self.m2 = nn.Linear(D, 2 * D), nn.Linear(2 * D, D)
        self.D = D

    def forward(self, ids):
        z = self.tok(ids) + self.pos[None]
        h = self.ln1(z)
        q, k, v = self.qkv(h).split(self.D, -1)
        a = torch.softmax(q @ k.transpose(1, 2) / math.sqrt(self.D), -1)
        z2 = self.o(a @ v) + z
        z = self.m2(F.gelu(self.m1(self.ln2(z2)), approximate='tanh')) + z2
        return self.lnf(z)


class UNet(nn.Module):
    """epsilon_theta(z_t, t, tau(y)). chs[i] channels at resolution res / 2^i; cross-attention at resolutions <= attn_max.
    Down: [ResBlock, (CrossAttn)] then conv stride 2 to the next width. Up: nearest 2x, conv to the width, add the skip,
    [ResBlock, (CrossAttn)]. Out: GroupNorm, SiLU, conv."""

    def __init__(self, res, cin, chs, D=24, T=32, attn_max=8):
        super().__init__()
        self.res, self.cin, self.chs, self.D, self.T = res, cin, chs, D, T
        self.te1, self.te2 = nn.Linear(T, T), nn.Linear(T, T)
        self.tau = TextEnc(D)
        self.inc = nn.Conv2d(cin, chs[0], 3, padding=1)
        self.down, self.ds, self.up, self.us = nn.ModuleList(), nn.ModuleList(), nn.ModuleList(), nn.ModuleList()
        self.att_d, self.att_u = nn.ModuleList(), nn.ModuleList()
        self.has_att = []
        for i, C in enumerate(chs):
            r = res >> i
            self.has_att.append(r <= attn_max)
            self.down.append(ResBlock(C, T))
            self.att_d.append(CrossAttn(C, D) if r <= attn_max else nn.Identity())
            if i < len(chs) - 1:
                self.ds.append(nn.Conv2d(C, chs[i + 1], 3, stride=2, padding=1))
                self.us.append(nn.Conv2d(chs[i + 1], C, 3, padding=1))
                self.up.append(ResBlock(C, T))
                self.att_u.append(CrossAttn(C, D) if r <= attn_max else nn.Identity())
        self.on, self.oc = gn(chs[0]), nn.Conv2d(chs[0], cin, 3, padding=1)

    def forward(self, x, t, ids, keep=None):
        te = self.te2(F.silu(self.te1(temb_sin(t, self.T))))
        ctx = self.tau(ids)
        h = self.inc(x)
        skips = []
        for i in range(len(self.chs)):
            h = self.down[i](h, te)
            if self.has_att[i]:
                h = self.att_d[i](h, ctx, keep)
            if i < len(self.chs) - 1:
                skips.append(h)
                h = self.ds[i](h)
        for i in reversed(range(len(self.chs) - 1)):
            h = self.us[i](F.interpolate(h, scale_factor=2, mode='nearest')) + skips[i]
            h = self.up[i](h, te)
            if self.has_att[i]:
                h = self.att_u[i](h, ctx, keep)
        return self.oc(F.silu(self.on(h)))


def macs(model, shape):
    """Multiply-adds of one forward pass, counted with hooks on conv, linear and attention matmuls."""
    tot = [0]

    def conv_hook(m, i, o):
        tot[0] += o.numel() // o.shape[0] * (m.in_channels // m.groups) * m.kernel_size[0] * m.kernel_size[1]

    def lin_hook(m, i, o):
        tot[0] += o.numel() // o.shape[0] * m.in_features

    hs = []
    for m in model.modules():
        if isinstance(m, nn.Conv2d):
            hs.append(m.register_forward_hook(conv_hook))
        elif isinstance(m, nn.Linear):
            hs.append(m.register_forward_hook(lin_hook))
        elif isinstance(m, CrossAttn):
            hs.append(m.register_forward_hook(lambda m, i, o: tot.__setitem__(0, tot[0] + 2 * o.shape[2] * o.shape[3] * 3 * o.shape[1])))
    with torch.no_grad():
        x = torch.zeros(1, *shape)
        if isinstance(model, UNet):
            model(x, torch.zeros(1, dtype=torch.long), torch.zeros(1, 3, dtype=torch.long))
        else:
            model(x)
    for h in hs:
        h.remove()
    return tot[0]


# ---------------------------------------------------------------- diffusion
TSTEPS = 1000
LIN_START, LIN_END = 0.0015, 0.0195                     # the LDM-4 configs' "linear" schedule (configs/latent-diffusion/*.yaml)


def schedule():
    """make_beta_schedule('linear') in the LDM code: betas = linspace(sqrt(start), sqrt(end), T)^2."""
    b = np.linspace(LIN_START ** 0.5, LIN_END ** 0.5, TSTEPS, dtype=np.float64) ** 2
    ab = np.cumprod(1 - b)
    return b, ab


def ddim_steps(S):
    """DDIM 'uniform' timestep selection as in the LDM code: range(0, T, T // S) + 1."""
    c = TSTEPS // S
    return np.arange(0, TSTEPS, c) + 1


@torch.no_grad()
def ddim(model, ids, shape, S=50, scale=3.0, seed=0, keep_traj=False):
    """Deterministic DDIM (eta = 0) with classifier-free guidance: eps = eps_u + s (eps_c - eps_u)."""
    _, ab = schedule()
    g = torch.Generator().manual_seed(seed)
    n = ids.shape[0]
    x = torch.randn(n, *shape, generator=g)
    ts = ddim_steps(S)[::-1]
    null = torch.full_like(ids, NULL)
    traj = [x.clone()]
    for j, t in enumerate(ts):
        a = float(ab[t])
        ap = float(ab[ts[j + 1]]) if j + 1 < len(ts) else float(ab[0])   # as the LDM DDIM sampler: alphas_prev starts at alphas_cumprod[0]
        tt = torch.full((n,), int(t), dtype=torch.long)
        if scale == 1.0:
            e = model(x, tt, ids)
        else:
            eu, ec = model(torch.cat([x, x]), torch.cat([tt, tt]), torch.cat([null, ids])).chunk(2)
            e = eu + scale * (ec - eu)
        x0 = (x - math.sqrt(1 - a) * e) / math.sqrt(a)
        x = math.sqrt(ap) * x0 + math.sqrt(1 - ap) * e
        if keep_traj:
            traj.append(x.clone())
    return (x, traj) if keep_traj else x
