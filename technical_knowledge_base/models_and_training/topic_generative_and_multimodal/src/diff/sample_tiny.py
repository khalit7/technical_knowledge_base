"""Diffusion lab: sample the trained tiny DDPM every way the tab shows, and score it (MPS, under the bench lock).

    python -I sample_tiny.py --pred eps     # full study: samplers x steps, guidance sweep, trajectories, timing
    python -I sample_tiny.py --pred v       # the v-prediction model: DDIM steps only
Writes out/samples_<pred>.json (metrics, timings, checks) and out/strips_<pred>.npz (uint8 images for the page).
Scores: fd = Frechet distance in the shared Fashion-MNIST classifier's 128-d feature space against the 10,000 test
images (fid.fd_fmnist), acc = the classifier's accuracy on the labels the samples were asked for, N = 1,000 per setting
(100 per class), plus the floor: 1,000 real validation images scored the same way.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data")); sys.path.insert(0, HERE)
import numpy as np
import torch
from common import cap_threads, device, load_split, scratch, sync, from_model, PeakMem, MACHINE, empty_cache, touch_bench
from nets import TinyUNet
from objectives import Schedule, betas_linear
import fid
from samplers import ddim, ddpm, with_scheduler, guided
from diffusers import DDIMScheduler, DDPMScheduler, DPMSolverMultistepScheduler, EulerDiscreteScheduler

ap = argparse.ArgumentParser()
ap.add_argument("--pred", default="eps", choices=["eps", "v"])
ap.add_argument("--ckpt", default=None)
ap.add_argument("--cpu", action="store_true")
ap.add_argument("--n", type=int, default=1000)
a = ap.parse_args()
cap_threads(4)
dev = device("cpu" if a.cpu else "mps")
ck = torch.load(a.ckpt or scratch("ckpt", f"df_ddpm_{a.pred}_4000.pt"), map_location="cpu")
net = TinyUNet(); net.load_state_dict(ck["ema"]); net.to(dev).eval()
abar = Schedule(betas_linear()).to(dev).abar
clf = fid.load_classifier(dev)
N = a.n
out = {"pred": a.pred, "config": ck["config"], "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"),
       "torch": torch.__version__, "N": N}
strips = {}
CLS = torch.arange(10).repeat_interleave(N // 10).to(dev)          # 100 of each class
STRIP_Y = torch.arange(10).to(dev)


def noise(n, seed):
    return torch.randn((n, 1, 32, 32), generator=torch.Generator().manual_seed(seed)).to(dev)


def score(x, y):
    imgs = from_model(x)
    d, acc = fid.fd_fmnist(imgs, clf, dev, labels=y.cpu().numpy())
    return round(float(d), 2), round(float(acc), 4)


def diversity(x, y):
    """Mean pairwise distance between same-class samples in the classifier's feature space."""
    f, _ = fid.classifier_features(from_model(x), clf, dev)
    f = torch.as_tensor(np.asarray(f)); yy = y.cpu()
    ds = []
    for c in range(10):
        fc = f[yy == c]
        ds.append(torch.pdist(fc).mean().item())
    return round(float(np.mean(ds)), 3)


def sat(x):
    """Fraction of pixels pushed to the clip limits (|x| > 0.98 before clamping), excluding the black padding."""
    v = x[:, :, 2:30, 2:30]
    return round(float((v > 0.98).float().mean()), 4), round(float((v.abs() > 1.0).float().mean()), 4)


def run(kind, n, x, y, s=1.0, gen_seed=1234):
    gen = torch.Generator().manual_seed(gen_seed)
    if kind == "ddim":
        return ddim(net, abar, x, y, n, s, a.pred)
    if kind == "ddpm":
        return ddpm(net, abar, x, y, n, s, a.pred, gen=gen)
    common = dict(num_train_timesteps=1000, beta_start=1e-4, beta_end=0.02, beta_schedule="linear",
                  prediction_type="epsilon" if a.pred == "eps" else "v_prediction", timestep_spacing="trailing")
    if kind == "dpm":
        sch = DPMSolverMultistepScheduler(**common)          # DPM-Solver++ (2M): algorithm_type dpmsolver++, order 2
    elif kind == "euler":
        sch = EulerDiscreteScheduler(**common)
    elif kind == "hf_ddim":
        sch = DDIMScheduler(clip_sample=False, set_alpha_to_one=True, **common)
    return with_scheduler(net, sch, x, y, n, s, gen=gen)


# ------------------------------------------------------------- floor and checks
xv, yv = load_split("val")
floor_d, _ = fid.fd_fmnist(xv[:N], clf, dev, labels=yv[:N])
out["floor_fd"] = round(float(floor_d), 2)
z = noise(16, 7); yz = torch.arange(16).remainder(10).to(dev)
mine = ddim(net, abar, z, yz, 10, 1.0, a.pred); ref = run("hf_ddim", 10, z, yz)
out["check_ddim_vs_diffusers_maxabs"] = float((mine - ref).abs().max())
print("floor", out["floor_fd"], "ddim check", out["check_ddim_vs_diffusers_maxabs"], flush=True)

# ------------------------------------------------------------- timing: one network evaluation
tm = {}
with torch.no_grad():
    for b in [1, 16, 256, 1000]:
        xb = noise(b, 3); tb = torch.full((b,), 0.5, device=dev); yb = torch.zeros(b, dtype=torch.long, device=dev)
        for _ in range(3):
            net(xb, tb, yb)
        sync(dev); ts = []
        for _ in range(15):
            t0 = time.perf_counter(); net(xb, tb, yb); sync(dev); ts.append(time.perf_counter() - t0)
        tm[str(b)] = round(float(np.median(ts)) * 1000, 2)
out["ms_per_eval"] = tm
print("ms per eval", tm, flush=True)

# ------------------------------------------------------------- samplers x steps
STEPS = [1, 4, 10, 20, 50, 250]
KINDS = ["ddpm", "ddim", "dpm", "euler"] if a.pred == "eps" else ["ddim", "ddpm"]
res = []
zN = noise(N, 11); zS = noise(10, 5)
for kind in KINDS:
    for n in STEPS + ([1000] if kind == "ddpm" and a.pred == "eps" else []):
        t0 = time.perf_counter()
        x = torch.cat([run(kind, n, zN[i:i + 500], CLS[i:i + 500]) for i in range(0, N, 500)]); sync(dev)
        sec = time.perf_counter() - t0
        d, acc = score(x, CLS)
        st = run(kind, n, zS, STRIP_Y)
        strips[f"{kind}_{n}"] = from_model(st)
        r = {"sampler": kind, "steps": n, "fd": d, "acc": acc, "sec": round(sec, 2), "div": diversity(x, CLS),
             "nan": int(torch.isnan(x).any())}
        res.append(r); print(r, flush=True); touch_bench("df")
out["samplers"] = res

if a.pred == "v":
    # --------------------------------------------------------- a classic bug: a v-prediction model sampled as if it predicted noise
    mm = []
    for n in [10, 50]:
        x = torch.cat([ddim(net, abar, zN[i:i + 500], CLS[i:i + 500], n, 1.0, "eps") for i in range(0, N, 500)])
        d, acc = score(x, CLS)
        strips[f"mismatch_{n}"] = from_model(ddim(net, abar, zS, STRIP_Y, n, 1.0, "eps"))
        mm.append({"steps": n, "fd": d, "acc": acc}); print("mismatch", mm[-1], flush=True)
    out["mismatch"] = mm

if a.pred == "eps":
    # --------------------------------------------------------- guidance sweep (DDIM, 50 steps)
    g = []
    for s in [0, 1, 2, 3, 5, 7.5, 10, 15]:
        x = torch.cat([ddim(net, abar, zN[i:i + 500], CLS[i:i + 500], 50, s, a.pred) for i in range(0, N, 500)])
        raw_sat = sat(x)
        d, acc = score(x.clamp(-1, 1), CLS)
        st = ddim(net, abar, zS, STRIP_Y, 50, s, a.pred)
        strips[f"cfg_{s}"] = from_model(st)
        r = {"scale": s, "fd": d, "acc": acc, "div": diversity(x.clamp(-1, 1), CLS), "white_frac": raw_sat[0],
             "beyond_range_frac": raw_sat[1], "mean": round(float(x.clamp(-1, 1)[:, :, 2:30, 2:30].mean()), 4)}
        g.append(r); print(r, flush=True)
    out["cfg"] = g
    touch_bench("df")
    # --------------------------------------------------------- trajectories for the animation (DDIM, 4 images)
    zA = noise(4, 21); yA = torch.tensor([3, 5, 8, 9], device=dev)       # dress, sandal, bag, ankle boot
    traj = {}
    for n in [1, 4, 20, 50]:
        tr = []
        ddim(net, abar, zA, yA, n, 1.0, a.pred, trace=tr)
        traj[str(n)] = [int(t) for t, _, _ in tr]
        strips[f"traj_{n}_xt"] = np.stack([from_model(xt) for _, xt, _ in tr])
        strips[f"traj_{n}_x0"] = np.stack([from_model(x0) for _, _, x0 in tr])
    strips["traj_noise"] = from_model(zA)
    out["traj_t"] = traj
    # DDPM (stochastic) at 20 steps from the same start, for the deterministic-vs-stochastic contrast
    tr = []
    ddpm(net, abar, zA, yA, 20, 1.0, a.pred, gen=torch.Generator().manual_seed(1234), trace=tr)
    strips["traj_ddpm20_xt"] = np.stack([from_model(xt) for _, xt, _ in tr])
json.dump(out, open(os.path.join(HERE, "out", f"samples_{a.pred}.json" if not a.cpu else f"smoke_samples_{a.pred}.json"), "w"), indent=0)
np.savez_compressed(os.path.join(HERE, "out", f"strips_{a.pred}.npz" if not a.cpu else f"smoke_strips_{a.pred}.npz"), **strips)
print("done", flush=True)
