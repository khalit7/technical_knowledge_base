"""Flow lab: sample the trained flow-matching model every way the tab shows, and score it (MPS, under the bench lock).

    python -I sample_fm.py --name fm_4000          # full study
    python -I sample_fm.py --name reflow_2000      # the 2-rectified model: Euler steps, straightness, trajectories
Scoring is the Diffusion lab's, unchanged, so the numbers sit in one table with its DDPM / DDIM / DPM-Solver rows:
fd = Frechet distance in the shared Fashion-MNIST classifier's feature space against the 10,000 test images
(fid.fd_fmnist), acc = classifier accuracy on the requested labels, div = mean same-class pairwise feature distance;
N = 1,000 samples (100 per class) from the same noise seed (11) as the Diffusion lab.
Writes out/samples_<name>.json and out/strips_<name>.npz (uint8 images for the page).
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data")); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "diff"))
import numpy as np
import torch
from common import cap_threads, device, load_split, scratch, sync, from_model, MACHINE, touch_bench
from nets import TinyUNet
from objectives import Schedule, betas_linear
import fid
from fm_samplers import euler, heun, midpoint, vel
import samplers as dfs          # the Diffusion lab's DDIM, for same-noise comparisons and path lengths

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="fm_4000")
ap.add_argument("--cpu", action="store_true")
ap.add_argument("--n", type=int, default=1000)
a = ap.parse_args()
FULL = a.name.startswith("fm_")
cap_threads(4)
dev = device("cpu" if a.cpu else "mps")
ck = torch.load(scratch("ckpt", f"fw_{a.name}.pt"), map_location="cpu")
net = TinyUNet(); net.load_state_dict(ck["ema"]); net.to(dev).eval()
dck = torch.load(scratch("ckpt", "df_ddpm_eps_4000.pt"), map_location="cpu")
dnet = TinyUNet(); dnet.load_state_dict(dck["ema"]); dnet.to(dev).eval()
abar = Schedule(betas_linear()).to(dev).abar
clf = fid.load_classifier(dev)
N = a.n
out = {"name": a.name, "config": ck["config"], "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"),
       "torch": torch.__version__, "N": N}
strips = {}
CLS = torch.arange(10).repeat_interleave(N // 10).to(dev)
STRIP_Y = torch.arange(10).to(dev)


def noise(n, seed):          # identical to the Diffusion lab's, so seed 11 / 5 / 21 give the same starting noise
    return torch.randn((n, 1, 32, 32), generator=torch.Generator().manual_seed(seed)).to(dev)


def score(x, y):
    d, acc = fid.fd_fmnist(from_model(x), clf, dev, labels=y.cpu().numpy())
    return round(float(d), 2), round(float(acc), 4)


def diversity(x, y):
    f, _ = fid.classifier_features(from_model(x), clf, dev)
    f = torch.as_tensor(np.asarray(f)); yy = y.cpu()
    return round(float(np.mean([torch.pdist(f[yy == c]).mean().item() for c in range(10)])), 3)


SOLVE = {"euler": euler, "heun": heun, "midpoint": midpoint}
NFE = {"euler": 1, "heun": 2, "midpoint": 2}


def run(kind, n, x, y, s=1.0):
    return SOLVE[kind](net, x, y, n, s)


xv, yv = load_split("val")
out["floor_fd"] = round(float(fid.fd_fmnist(xv[:N], clf, dev, labels=yv[:N])[0]), 2)
f_real, _ = fid.classifier_features(xv[:N], clf, dev)
f_real = torch.as_tensor(np.asarray(f_real)); yr = torch.as_tensor(yv[:N])
out["real_div"] = round(float(np.mean([torch.pdist(f_real[yr == c]).mean().item() for c in range(10)])), 3)
print("floor", out["floor_fd"], "real div", out["real_div"], flush=True)

# ------------------------------------------------------------- timing: one network evaluation (same net as the DDPM)
tm = {}
with torch.no_grad():
    for b in [1, 1000]:
        xb = noise(b, 3); tb = torch.full((b,), 0.5, device=dev); yb = torch.zeros(b, dtype=torch.long, device=dev)
        for _ in range(3):
            net(xb, tb, yb)
        sync(dev); ts = []
        for _ in range(15):
            t0 = time.perf_counter(); net(xb, tb, yb); sync(dev); ts.append(time.perf_counter() - t0)
        tm[str(b)] = round(float(np.median(ts)) * 1000, 2)
out["ms_per_eval"] = tm
print("ms per eval", tm, flush=True)

# ------------------------------------------------------------- solvers x steps
zN = noise(N, 11); zS = noise(10, 5)
PLAN = {"euler": [1, 2, 4, 10, 20, 50, 250], "heun": [1, 2, 5, 10, 25], "midpoint": [1, 2, 5, 10, 25]} if FULL else \
       {"euler": [1, 2, 4, 10, 20, 50]}
res = []
for kind, steps in PLAN.items():
    for n in steps:
        t0 = time.perf_counter()
        x = torch.cat([run(kind, n, zN[i:i + 500], CLS[i:i + 500]) for i in range(0, N, 500)]); sync(dev)
        sec = time.perf_counter() - t0
        d, acc = score(x, CLS)
        strips[f"{kind}_{n}"] = from_model(run(kind, n, zS, STRIP_Y))
        r = {"solver": kind, "steps": n, "nfe": n * NFE[kind], "fd": d, "acc": acc, "sec": round(sec, 2),
             "div": diversity(x, CLS), "nan": int(torch.isnan(x).any())}
        res.append(r); print(r, flush=True); touch_bench("fw")
out["samplers"] = res

# ------------------------------------------------------------- integration error against a fine reference (200 images)
zE = zN[:200]; yE = torch.arange(10, device=dev).repeat_interleave(20)[:len(zE)]   # 20 per class
ref = heun(net, zE, yE, 250)
err = []
for kind in ["euler", "heun", "midpoint"]:
    for nfe in [2, 4, 10, 20, 50, 100]:
        n = nfe // NFE[kind]
        x = SOLVE[kind](net, zE, yE, n)
        err.append({"solver": kind, "nfe": nfe, "rms": round(float(((x - ref) ** 2).mean().sqrt()), 5)})
out["ode_err"] = err
print("ode err", err, flush=True)

# ------------------------------------------------------------- straightness: straight-line distance / path length (50 Euler or DDIM steps)
def path_ratio(paths):
    P = torch.stack(paths)                                  # steps+1, B, 1, 32, 32
    seg = (P[1:] - P[:-1]).flatten(2).norm(dim=2).sum(0)
    return round(float(((P[-1] - P[0]).flatten(1).norm(dim=1) / seg).mean()), 4)   # straightness: distance / path length, 1 = straight (the Math page's definition)

tr = []; x = euler(net, zE, yE, 50, trace=tr)
fpaths = [p for _, p, _ in tr] + [x]
out["straightness"] = path_ratio(fpaths)
# 1 step vs 50 steps: how far the one-step guess lands from the 50-step answer
x1 = euler(net, zE, yE, 1)
out["one_vs_50_rms"] = round(float(((x1 - x) ** 2).mean().sqrt()), 5)
if FULL:
    dtr = []; dx = dfs.ddim(dnet, abar, zE, yE, 50, 1.0, "eps", trace=dtr)
    out["ddim_straightness"] = path_ratio([zE] + [p for _, p, _ in dtr])
    out["ddim_one_vs_50_rms"] = round(float(((dfs.ddim(dnet, abar, zE, yE, 1, 1.0, "eps") - dx) ** 2).mean().sqrt()), 5)
print("path ratio", out["straightness"], out.get("ddim_straightness"), flush=True)

# ------------------------------------------------------------- trajectories (the Diffusion lab's 4 starting noises and classes)
zA = noise(4, 21); yA = torch.tensor([3, 5, 8, 9], device=dev)
for n in [1, 4, 10]:
    tr = []; xe = euler(net, zA, yA, n, trace=tr)
    strips[f"traj_{n}_xt"] = np.stack([from_model(p) for _, p, _ in tr] + [from_model(xe)])
    strips[f"traj_{n}_x1"] = np.stack([from_model(g) for _, _, g in tr])
    if FULL:
        dtr = []; dx = dfs.ddim(dnet, abar, zA, yA, n, 1.0, "eps", trace=dtr)
        strips[f"ddim_traj_{n}_xt"] = np.stack([from_model(zA)] + [from_model(p) for _, p, _ in dtr])
        strips[f"ddim_traj_{n}_x0"] = np.stack([from_model(g) for _, _, g in dtr])
strips["traj_noise"] = from_model(zA)

if FULL:
    # --------------------------------------------------------- the Diffusion lab's DDIM on the strip noise at 2 steps (its run has 1, 4, 10, 20, 50)
    strips["ddim_2"] = from_model(dfs.ddim(dnet, abar, zS, STRIP_Y, 2, 1.0, "eps"))
    # --------------------------------------------------------- guidance (Euler 50)
    g = []
    for s in [0, 1, 1.5, 2, 3, 5]:
        x = torch.cat([euler(net, zN[i:i + 500], CLS[i:i + 500], 50, s) for i in range(0, N, 500)])
        d, acc = score(x.clamp(-1, 1), CLS)
        strips[f"cfg_{s}"] = from_model(euler(net, zS, STRIP_Y, 50, s))
        r = {"scale": s, "fd": d, "acc": acc, "div": diversity(x.clamp(-1, 1), CLS)}
        g.append(r); print(r, flush=True)
    out["cfg"] = g; touch_bench("fw")
    # --------------------------------------------------------- time shift at few steps (SD3 uses 3.0 at 1024 px)
    sh = []
    for shift in [1 / 3, 1.0, 3.0]:
        for n in [4, 10]:
            x = torch.cat([euler(net, zN[i:i + 500], CLS[i:i + 500], n, 1.0, shift) for i in range(0, N, 500)])
            d, acc = score(x, CLS)
            strips[f"shift_{shift:.2f}_{n}"] = from_model(euler(net, zS, STRIP_Y, n, 1.0, shift))
            sh.append({"shift": round(shift, 4), "steps": n, "fd": d, "acc": acc}); print(sh[-1], flush=True)
    out["shift"] = sh
    # --------------------------------------------------------- two classic bugs
    @torch.no_grad()
    def backwards(x, y, n):        # treats t = 1 as noise (diffusers' sigma convention) with this t = 0-is-noise model
        for k in range(n):
            t = 1 - k / n
            x = x - vel(net, x, t, y) / n
        return x

    @torch.no_grad()
    def times1000(x, y, n):        # feeds t * 1000 (what diffusers' pipelines pass a transformer) to a net trained on t in [0, 1]
        for k in range(n):
            tt = torch.full((x.shape[0],), 1000.0 * k / n, device=x.device)
            x = x + net(x, tt, y) / n
        return x
    bugs = []
    for nm, f in [("reversed_time", backwards), ("time_x1000", times1000)]:
        x = torch.cat([f(zN[i:i + 500], CLS[i:i + 500], 50) for i in range(0, N, 500)])
        d, acc = score(x.clamp(-1, 1), CLS)
        strips[f"bug_{nm}"] = from_model(f(zS, STRIP_Y, 50).clamp(-1, 1))
        bugs.append({"bug": nm, "steps": 50, "fd": d, "acc": acc}); print(bugs[-1], flush=True)
    out["bugs"] = bugs
json.dump(out, open(os.path.join(HERE, "out", f"samples_{a.name}.json"), "w"), indent=0)
np.savez_compressed(os.path.join(HERE, "out", f"strips_{a.name}.npz"), **strips)
print("done", flush=True)
