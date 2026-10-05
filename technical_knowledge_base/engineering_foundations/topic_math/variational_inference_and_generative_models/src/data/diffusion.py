# Two tiny class-conditional generative models on 2-D two-moons data, for the page's Diffusion lab and animation.
#  eps model: DDPM noise prediction (Ho et al. 2020, L_simple), conditioned on the log-SNR lambda = log(abar/(1-abar))
#             instead of the step index, so one network serves the linear (Ho et al.) and cosine (Nichol and Dhariwal) schedules;
#             trained on t uniform in 1..1000 under either schedule.
#  flow model: conditional flow matching / rectified flow, x_t = (1-t) x0 + t eps, target v = eps - x0 (Lipman et al. 2023; Liu et al. 2023).
#  Both: class label (0 upper moon, 1 lower moon, 2 = no label) dropped to 2 with probability 0.15 for classifier-free guidance (Ho and Salimans 2022).
# Run: OMP_NUM_THREADS=2 uv run --no-project --with torch --with numpy python diffusion.py [width] [steps]
import json, math, sys, time
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F
torch.set_num_threads(2)
W = int(sys.argv[1]) if len(sys.argv) > 1 else 64
STEPS = int(sys.argv[2]) if len(sys.argv) > 2 else 30000
T = 1000
def moons(n, rng, noise=0.06):
    # sklearn.datasets.make_moons geometry: outer arc (cos th, sin th), inner arc (1 - cos th, 0.5 - sin th), th in [0, pi]
    y = rng.integers(0, 2, n); th = rng.uniform(0, math.pi, n)
    x = np.where(y[:, None] == 0, np.stack([np.cos(th), np.sin(th)], 1), np.stack([1 - np.cos(th), 0.5 - np.sin(th)], 1))
    x = x + noise * rng.standard_normal((n, 2))
    return ((x - np.array([0.5, 0.25])) / 0.7).astype(np.float32), y   # centred, scaled so the data has spread about 1
def abar_linear():
    b = np.linspace(1e-4, 0.02, T); return np.cumprod(1 - b)
def abar_cosine(s=0.008):
    t = np.arange(T + 1); f = np.cos((t / T + s) / (1 + s) * math.pi / 2) ** 2
    ab = f / f[0]; beta = np.clip(1 - ab[1:] / ab[:-1], 0, 0.999); return np.cumprod(1 - beta)
AB = torch.tensor(np.stack([abar_linear(), abar_cosine()]), dtype=torch.float32)  # [2, T], index t-1
NF = 8
FREQ = torch.tensor([2.0 ** k for k in range(NF)]) * math.pi
def emb(s):  # s: noise level scaled to roughly [-1, 1]; sinusoidal features
    a = s[:, None] * FREQ[None, :] / 16
    return torch.cat([torch.sin(a), torch.cos(a)], 1)
class Net(nn.Module):
    def __init__(s):
        super().__init__(); s.l1 = nn.Linear(2 + 2 * NF + 3, W); s.l2 = nn.Linear(W, W); s.l3 = nn.Linear(W, W); s.l4 = nn.Linear(W, 2)
    def forward(s, x, lev, c):
        h = torch.cat([x, emb(lev), F.one_hot(c, 3).float()], 1)
        h = F.silu(s.l1(h)); h = F.silu(s.l2(h)); h = F.silu(s.l3(h)); return s.l4(h)
def lam_feat(ab):  # log-SNR, divided by 12 so the range [-12, 12] maps to [-1, 1]
    return torch.log(ab / (1 - ab)) / 12
def train(kind):
    torch.manual_seed(0); rng = np.random.default_rng(0)
    net = Net(); opt = torch.optim.Adam(net.parameters(), 2e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, STEPS)
    log = []; acc = 0; t0 = time.time()
    for it in range(STEPS):
        x0, y = moons(512, rng); x0 = torch.tensor(x0); c = torch.tensor(y)
        c = torch.where(torch.rand(512) < 0.15, torch.full_like(c, 2), c)
        eps = torch.randn_like(x0)
        if kind == 'eps':
            t = torch.randint(1, T + 1, (512,)); k = torch.randint(0, 2, (512,)); ab = AB[k, t - 1]
            xt = ab.sqrt()[:, None] * x0 + (1 - ab).sqrt()[:, None] * eps
            loss = ((net(xt, lam_feat(ab), c) - eps) ** 2).sum(1).mean()
        else:
            t = torch.rand(512)
            xt = (1 - t)[:, None] * x0 + t[:, None] * eps
            loss = ((net(xt, 2 * t - 1, c) - (eps - x0)) ** 2).sum(1).mean()
        opt.zero_grad(); loss.backward(); opt.step(); sched.step(); acc += loss.item()
        if (it + 1) % 500 == 0:
            log.append([it + 1, round(acc / 500, 4)]); acc = 0
            if (it + 1) % 5000 == 0: print(kind, it + 1, log[-1], round(time.time() - t0), 's', flush=True)
    return net, log
def export(net):
    # int8 per output row: w = q * scale, q in [-127, 127]; biases float32 (rounded to 6 significant digits)
    L = []
    for l in [net.l1, net.l2, net.l3, net.l4]:
        w = l.weight.detach().numpy().astype(np.float64); sc = np.abs(w).max(1) / 127
        q = np.round(w / sc[:, None]).astype(np.int8)
        L.append({'out': w.shape[0], 'in': w.shape[1], 'scale': [float('%.6g' % v) for v in sc],
                  'q': bytes((q.astype(np.int16) & 255).astype(np.uint8).reshape(-1)).hex(), 'b': [float('%.6g' % v) for v in l.bias.detach().numpy()]})
    return L
out = {'W': W, 'steps': STEPS, 'T': T, 'NF': NF, 'torch': torch.__version__}
for kind in ['eps', 'flow']:
    net, log = train(kind)
    out[kind] = {'log': log, 'layers': export(net)}
    torch.save(net.state_dict(), 'dm_%s_w%d.pt' % (kind, W))
json.dump(out, open('dm_w%d.json' % W, 'w'))
print('done')
