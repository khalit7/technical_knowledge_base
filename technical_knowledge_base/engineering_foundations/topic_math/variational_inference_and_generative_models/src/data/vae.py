# Tiny VAE on binarised MNIST (pixel > 127 -> 1). Bernoulli decoder, Gaussian encoder, standard normal prior.
# Run: OMP_NUM_THREADS=2 uv run --no-project --with torch --with numpy python vae.py
# Writes vae_out.json (curves, latent map, manifold, reconstructions, IWAE estimates, amortisation gap, beta sweep).
import gzip, json, math, time, sys
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F
torch.set_num_threads(2)
torch.manual_seed(0); np.random.seed(0)
def load(f, img):
    with gzip.open(f) as g: b = g.read()
    return np.frombuffer(b, np.uint8, offset=16).reshape(-1, 784) if img else np.frombuffer(b, np.uint8, offset=8)
Xtr = torch.tensor((load('train-images-idx3-ubyte.gz', 1) > 127).astype(np.float32))
Xte = torch.tensor((load('t10k-images-idx3-ubyte.gz', 1) > 127).astype(np.float32))
Yte = load('t10k-labels-idx1-ubyte.gz', 0)
H = 400
class VAE(nn.Module):
    def __init__(s, zd):
        super().__init__(); s.e1 = nn.Linear(784, H); s.mu = nn.Linear(H, zd); s.lv = nn.Linear(H, zd)
        s.d1 = nn.Linear(zd, H); s.d2 = nn.Linear(H, 784)
    def enc(s, x): h = F.relu(s.e1(x)); return s.mu(h), s.lv(h)
    def dec(s, z): return s.d2(F.relu(s.d1(z)))  # Bernoulli logits
def terms(m, x, k=1):
    mu, lv = m.enc(x); sd = (0.5 * lv).exp()
    eps = torch.randn(k, *mu.shape); z = mu + sd * eps        # reparameterisation
    logits = m.dec(z)
    rec = F.binary_cross_entropy_with_logits(logits, x.expand_as(logits), reduction='none').sum(-1).mean(0)  # -E_q log p(x|z)
    kl = 0.5 * (mu ** 2 + lv.exp() - 1 - lv).sum(-1)       # closed-form KL(q || N(0, I)), per example
    return rec, kl, mu, lv
def iwae(m, x, K=1000, chunk=250):
    # log p(x) ~= log (1/K) sum_k p(x, z_k) / q(z_k | x), z_k ~ q
    mu, lv = m.enc(x); sd = (0.5 * lv).exp(); out = []
    for c in range(0, K, chunk):
        eps = torch.randn(min(chunk, K - c), *mu.shape); z = mu + sd * eps
        lpx = -F.binary_cross_entropy_with_logits(m.dec(z), x.expand(z.shape[0], *x.shape), reduction='none').sum(-1)
        lpz = (-0.5 * z ** 2 - 0.5 * math.log(2 * math.pi)).sum(-1)
        lq = (-0.5 * eps ** 2 - 0.5 * math.log(2 * math.pi) - 0.5 * lv).sum(-1)
        out.append(lpx + lpz - lq)
    w = torch.cat(out, 0)
    return (torch.logsumexp(w, 0) - math.log(K)), w.mean(0)   # IWAE estimate, and the ELBO from the same draws
def train(zd, beta, epochs, log_every=100, tag=''):
    torch.manual_seed(1); m = VAE(zd); opt = torch.optim.Adam(m.parameters(), 1e-3)
    n = Xtr.shape[0]; step = 0; curve = []; ep_rows = []; acc = [0, 0, 0]
    for ep in range(epochs):
        perm = torch.randperm(n); t0 = time.time()
        for i in range(0, n, 128):
            x = Xtr[perm[i:i + 128]]
            rec, kl, _, _ = terms(m, x); loss = (rec + beta * kl).mean()
            opt.zero_grad(); loss.backward(); opt.step(); step += 1
            acc[0] += rec.mean().item(); acc[1] += kl.mean().item(); acc[2] += 1
            if step % log_every == 0:
                curve.append([step, round(acc[0] / acc[2], 3), round(acc[1] / acc[2], 3)]); acc = [0, 0, 0]
        with torch.no_grad():
            torch.manual_seed(100 + ep); rec, kl, _, _ = terms(m, Xte)
        ep_rows.append([ep + 1, round(rec.mean().item(), 3), round(kl.mean().item(), 3)])
        print(tag, 'epoch', ep + 1, ep_rows[-1], round(time.time() - t0, 1), 's', flush=True)
    return m, curve, ep_rows
out = {'note': 'binarised MNIST (pixel > 127), 784-400-z encoder and z-400-784 Bernoulli decoder, ReLU, Adam 1e-3, batch 128, one z sample per example; torch ' + torch.__version__}
# ---- 1. latent dimension 2, beta 1 ----
EP = int(sys.argv[1]) if len(sys.argv) > 1 else 30
m, curve, ep_rows = train(2, 1.0, EP, tag='z2')
torch.save(m.state_dict(), 'vae_z2.pt')
out['z2'] = {'curve': curve, 'epochs': ep_rows, 'steps_per_epoch': math.ceil(60000 / 128)}
with torch.no_grad():
    mu, lv = m.enc(Xte[:2000])
    out['z2']['latent'] = [[round(a, 2), round(b, 2), int(y)] for (a, b), y in zip(mu.tolist(), Yte[:2000])]
    out['z2']['latent_sd_mean'] = [round(v, 4) for v in (0.5 * lv).exp().mean(0).tolist()]
    G = 10; qs = [0.04 + 0.92 * i / (G - 1) for i in range(G)]
    from statistics import NormalDist
    zs = [NormalDist().inv_cdf(q) for q in qs]
    grid = torch.tensor([[zs[j], zs[G - 1 - i]] for i in range(G) for j in range(G)], dtype=torch.float32)
    P = torch.sigmoid(m.dec(grid)).numpy()
    out['z2']['grid_z'] = [round(v, 3) for v in zs]
    out['z2']['grid'] = ''.join('%x' % min(15, int(round(p * 15))) for p in P.reshape(-1))
    idx = [int(np.argmax(Yte == d)) for d in range(10)]  # first test example of each digit 0..9
    out['z2']['recon_idx'] = idx; out['z2']['recon_labels'] = [int(Yte[i]) for i in idx]
    xr = Xte[idx]; mu_r, _ = m.enc(xr); pr = torch.sigmoid(m.dec(mu_r)).numpy()
    out['z2']['recon_x'] = ''.join(str(int(v)) for v in xr.numpy().reshape(-1))
    out['z2']['recon_p'] = ''.join('%x' % min(15, int(round(p * 15))) for p in pr.reshape(-1))
    # IWAE on 1000 test images, K = 1000
    torch.manual_seed(7); xs = Xte[:1000]; L = []; E = []
    for i in range(0, 1000, 100):
        a, b = iwae(m, xs[i:i + 100], K=1000); L.append(a); E.append(b)
    L = torch.cat(L); E = torch.cat(E)
    out['z2']['iwae1000'] = round(L.mean().item(), 3); out['z2']['elbo_same'] = round(E.mean().item(), 3)
    for K in [1, 10, 100]:
        torch.manual_seed(8); a, _ = iwae(m, xs[:1000], K=K, chunk=K)
        out['z2']['iwae%d' % K] = round(a.mean().item(), 3)
    print('iwae', out['z2']['iwae1000'], 'elbo', out['z2']['elbo_same'], flush=True)
# ---- 2. amortisation gap (Cremer et al. 2018): optimise q per image, 200 test images ----
xs = Xte[:200]
with torch.no_grad(): mu0, lv0 = m.enc(xs)
mu_p = mu0.clone().requires_grad_(True); lv_p = lv0.clone().requires_grad_(True)
opt = torch.optim.Adam([mu_p, lv_p], 1e-2)
for it in range(1500):
    sd = (0.5 * lv_p).exp(); eps = torch.randn(32, *mu_p.shape); z = mu_p + sd * eps
    rec = F.binary_cross_entropy_with_logits(m.dec(z), xs.expand(32, *xs.shape), reduction='none').sum(-1).mean(0)
    kl = 0.5 * (mu_p ** 2 + lv_p.exp() - 1 - lv_p).sum(-1)
    loss = (rec + kl).sum(); opt.zero_grad(); loss.backward(); opt.step()
def elbo_of(mu, lv, x, S=5000):
    with torch.no_grad():
        tot = 0
        for c in range(0, S, 500):
            eps = torch.randn(500, *mu.shape); z = mu + (0.5 * lv).exp() * eps
            tot = tot + (-F.binary_cross_entropy_with_logits(m.dec(z), x.expand(500, *x.shape), reduction='none').sum(-1)).sum(0)
        return tot / S - 0.5 * (mu ** 2 + lv.exp() - 1 - lv).sum(-1)
torch.manual_seed(9)
e_amort = elbo_of(mu0, lv0, xs); e_opt = elbo_of(mu_p.detach(), lv_p.detach(), xs)
with torch.no_grad(): lp, _ = iwae(m, xs, K=5000, chunk=500)
out['gap'] = {'n': 200, 'logp_iwae5000': round(lp.mean().item(), 3), 'elbo_encoder': round(e_amort.mean().item(), 3),
              'elbo_optimised': round(e_opt.mean().item(), 3)}
print('gap', out['gap'], flush=True)
json.dump(out, open('vae_out.json', 'w'))
# ---- 3. beta sweep at latent dimension 16 ----
out['beta'] = []
for beta in [0.5, 1, 2, 4, 8]:
    mb, _, rows = train(16, beta, max(10, EP // 2), log_every=10 ** 9, tag='z16 b%g' % beta)
    with torch.no_grad():
        torch.manual_seed(11); rec, kl, mu, lv = terms(mb, Xte)
        klv = (0.5 * (mu ** 2 + lv.exp() - 1 - lv)).mean(0)
        au = (mu.var(0) > 0.01).sum().item()
        torch.manual_seed(12); a, _ = iwae(mb, Xte[:1000], K=1000)
    out['beta'].append({'beta': beta, 'rec': round(rec.mean().item(), 2), 'kl': round(kl.mean().item(), 2),
                        'kl_dims': [round(v, 3) for v in klv.tolist()], 'active': au, 'iwae1000': round(a.mean().item(), 2)})
    print(out['beta'][-1], flush=True)
    json.dump(out, open('vae_out.json', 'w'))
print('done')
