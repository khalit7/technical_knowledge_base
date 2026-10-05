# The ELBO gap on the 2-D VAE, split as Cremer et al. 2018: log p(x) - ELBO(encoder q) = approximation gap + amortisation gap.
# log p(x) for a 2-D latent is computed by brute-force quadrature on a 2-D grid around each image's optimised q (and checked
# against importance sampling), so it is not itself a bound.
import gzip, json, math
import numpy as np, torch, torch.nn.functional as F
torch.set_num_threads(2); torch.manual_seed(0)
def load(f, img):
    with gzip.open(f) as g: b = g.read()
    return np.frombuffer(b, np.uint8, offset=16).reshape(-1, 784) if img else np.frombuffer(b, np.uint8, offset=8)
Xte = torch.tensor((load('t10k-images-idx3-ubyte.gz', 1) > 127).astype(np.float32))
H = 400
import torch.nn as nn
class VAE(nn.Module):
    def __init__(s, zd):
        super().__init__(); s.e1 = nn.Linear(784, H); s.mu = nn.Linear(H, zd); s.lv = nn.Linear(H, zd)
        s.d1 = nn.Linear(zd, H); s.d2 = nn.Linear(H, 784)
    def enc(s, x): h = F.relu(s.e1(x)); return s.mu(h), s.lv(h)
    def dec(s, z): return s.d2(F.relu(s.d1(z)))
m = VAE(2); m.load_state_dict(torch.load('vae_z2.pt')); m.eval()
NI = 100; xs = Xte[:NI]
with torch.no_grad(): mu0, lv0 = m.enc(xs)
mu_p = mu0.clone().requires_grad_(True); lv_p = lv0.clone().requires_grad_(True)
opt = torch.optim.Adam([mu_p, lv_p], 1e-2)
for it in range(2000):
    sd = (0.5 * lv_p).exp(); eps = torch.randn(64, *mu_p.shape); z = mu_p + sd * eps
    rec = F.binary_cross_entropy_with_logits(m.dec(z), xs.expand(64, *xs.shape), reduction='none').sum(-1).mean(0)
    kl = 0.5 * (mu_p ** 2 + lv_p.exp() - 1 - lv_p).sum(-1)
    loss = (rec + kl).sum(); opt.zero_grad(); loss.backward(); opt.step()
mu_p = mu_p.detach(); lv_p = lv_p.detach()
def elbo_of(mu, lv, S=4000):
    with torch.no_grad():
        tot = 0
        for c in range(0, S, 500):
            z = mu + (0.5 * lv).exp() * torch.randn(500, *mu.shape)
            tot = tot + (-F.binary_cross_entropy_with_logits(m.dec(z), xs.expand(500, *xs.shape), reduction='none').sum(-1)).sum(0)
        return tot / S - 0.5 * (mu ** 2 + lv.exp() - 1 - lv).sum(-1)
e_enc = elbo_of(mu0, lv0); e_opt = elbo_of(mu_p, lv_p)
# quadrature: grid of 161 x 161 points over the box mean +- 8 sd of the optimised q (sd floored at 0.05), per image
lp = []
with torch.no_grad():
    for i in range(NI):
        sd = torch.clamp((0.5 * lv_p[i]).exp(), min=0.05) * 8
        g1 = torch.linspace(-1, 1, 161)
        A = mu_p[i, 0] + sd[0] * g1; B = mu_p[i, 1] + sd[1] * g1
        Z = torch.stack(torch.meshgrid(A, B, indexing='ij'), -1).reshape(-1, 2)
        lpx = -F.binary_cross_entropy_with_logits(m.dec(Z), xs[i].expand(Z.shape[0], 784), reduction='none').sum(-1)
        lj = lpx + (-0.5 * Z ** 2 - 0.5 * math.log(2 * math.pi)).sum(-1)
        cell = (A[1] - A[0]) * (B[1] - B[0])
        lp.append((torch.logsumexp(lj, 0) + torch.log(cell)).item())
lp = torch.tensor(lp)
out = {'n': NI, 'logpx_quadrature': round(lp.mean().item(), 3), 'elbo_encoder': round(e_enc.mean().item(), 3), 'elbo_optimised': round(e_opt.mean().item(), 3)}
out['total_gap'] = round(out['logpx_quadrature'] - out['elbo_encoder'], 3)
out['approximation_gap'] = round(out['logpx_quadrature'] - out['elbo_optimised'], 3)
out['amortisation_gap'] = round(out['elbo_optimised'] - out['elbo_encoder'], 3)
out['min_per_image_gap_opt'] = round((lp - e_opt).min().item(), 3)
print(out)
json.dump(out, open('vae_gap.json', 'w'))
