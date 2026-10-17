"""Diffusion from zero: the sampler, guidance and bug studies on the tiny models (MPS, under the bench lock).

    python -I dz_sample.py samplers   # reproduce two of the lab's numbers, then every sampler x steps (workbench tab)
    python -I dz_sample.py extra      # EMA vs raw weights, three real bugs, the 8,000-step model
    python -I dz_sample.py guide      # CFG rescale, guidance interval, autoguidance (guidance tab)
Same noise, labels and scoring as the root's sample_tiny.py (src/diff): 1,000 samples (100 per class) from
noise seed 11 in two chunks of 500, ancestral noise from a CPU generator seeded 1234 per chunk, fd_fmnist in the shared
classifier's feature space against the 10,000 test images, plus the 10-image strip from noise seed 5.
Writes out/<stage>.json and GM_SCRATCH/dz/strips_<stage>.npz (uint8 28x28 strips).
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dz_env import OUT, dz_scratch
import numpy as np
import torch
from common import cap_threads, device, scratch, sync, from_model, MACHINE, touch_bench, load_split
from nets import TinyUNet
from objectives import Schedule, betas_linear, betas_cosine
import fid
from samplers import ddim as lab_ddim, ddpm as lab_ddpm, with_scheduler
from dz_samplers import ddim_eta, cfg, autoguide, Count
from diffusers import (DDIMScheduler, DPMSolverMultistepScheduler, EulerDiscreteScheduler, EulerAncestralDiscreteScheduler,
                       HeunDiscreteScheduler, UniPCMultistepScheduler)

stage = sys.argv[1]
cap_threads(4)
SMOKE = os.environ.get("DZ_SMOKE") == "1"          # CPU smoke test: 100 samples, few steps, nothing written to out/
dev = device("cpu" if SMOKE else "mps")
abar = Schedule(betas_linear()).to(dev).abar
clf = fid.load_classifier(dev)
N = 100 if SMOKE else 1000
CH = N // 2
CLS = torch.arange(10).repeat_interleave(N // 10).to(dev)
STRIP_Y = torch.arange(10).to(dev)


def load(path, base=32, key="ema"):
    ck = torch.load(path, map_location="cpu")
    m = TinyUNet(base=base); m.load_state_dict(ck[key]); return m.to(dev).eval()


def noise(n, seed):
    return torch.randn((n, 1, 32, 32), generator=torch.Generator().manual_seed(seed)).to(dev)


zN = noise(N, 11); zS = noise(10, 5)


def score(x, y=CLS):
    x = x.clamp(-1, 1)
    imgs = from_model(x)
    d, acc = fid.fd_fmnist(imgs, clf, dev, labels=y.cpu().numpy())
    f, _ = fid.classifier_features(imgs, clf, dev)
    f = torch.as_tensor(np.asarray(f)); yy = y.cpu()
    div = float(np.mean([torch.pdist(f[yy == c]).mean().item() for c in range(10)]))
    v = x[:, :, 2:30, 2:30]
    return {"fd": round(float(d), 2), "acc": round(float(acc), 4), "div": round(div, 3),
            "white": round(float((v > 0.98).float().mean()), 4), "nan": int(torch.isnan(x).any())}


strips, res = {}, []


def run(name, fn, **meta):
    """fn(x, y, gen) -> samples. Runs 1,000 samples in two chunks (fresh generator per chunk, as the lab) and the strip."""
    t0 = time.perf_counter()
    torch.set_grad_enabled(False)          # no autograd graph anywhere (a 50-step loop with grad enabled filled 20 GB)
    x = torch.cat([fn(zN[i:i + CH], CLS[i:i + CH], torch.Generator().manual_seed(1234)) for i in range(0, N, CH)])
    sync(dev); sec = time.perf_counter() - t0
    r = {"name": name, **meta, **score(x), "sec": round(sec, 2)}
    strips[name] = from_model(fn(zS, STRIP_Y, torch.Generator().manual_seed(1234)).clamp(-1, 1))
    res.append(r); print(r, flush=True); touch_bench("dz")
    return x


def eps_plain(net):
    return lambda y: (lambda x, t: net(x, torch.full((x.shape[0],), float(t) / 1000, device=x.device), y))


COMMON = dict(num_train_timesteps=1000, beta_start=1e-4, beta_end=0.02, beta_schedule="linear",
              prediction_type="epsilon", timestep_spacing="trailing")


def hf(kind):
    if kind == "dpm2m_karras":
        return DPMSolverMultistepScheduler(use_karras_sigmas=True, **COMMON)
    if kind == "dpm2m_sde":
        return DPMSolverMultistepScheduler(algorithm_type="sde-dpmsolver++", **COMMON)
    if kind == "dpm2m":
        return DPMSolverMultistepScheduler(**COMMON)
    if kind == "unipc":
        return UniPCMultistepScheduler(**COMMON)
    if kind == "heun":
        return HeunDiscreteScheduler(**COMMON)
    if kind == "euler":
        return EulerDiscreteScheduler(**COMMON)
    if kind == "euler_a":
        return EulerAncestralDiscreteScheduler(**COMMON)
    raise ValueError(kind)


meta = {"machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"), "torch": torch.__version__, "N": N}

if stage == "samplers":
    net = load(scratch("ckpt", "df_ddpm_eps_4000.pt")); E = eps_plain(net)
    # 1. reproduce the lab: its DDIM and DDPM at 10 steps must give its numbers (181.34, 130.5)
    run("lab_ddim", lambda x, y, g: lab_ddim(net, abar, x, y, 10), sampler="lab_ddim", steps=10)
    run("lab_ddpm", lambda x, y, g: lab_ddpm(net, abar, x, y, 10, gen=g), sampler="lab_ddpm", steps=10)
    # 2. our generalised DDIM: eta 0 must equal lab DDIM, eta 1 must equal lab DDPM (same noise draws)
    z = zN[:16]; yz = CLS[:16]
    a = lab_ddim(net, abar, z, yz, 10); b = ddim_eta(E(yz), abar, z, 10, 0.0)
    c = lab_ddpm(net, abar, z, yz, 10, gen=torch.Generator().manual_seed(9)); d = ddim_eta(E(yz), abar, z, 10, 1.0, gen=torch.Generator().manual_seed(9))
    meta["check_eta0_vs_lab_ddim"] = float((a - b).abs().max()); meta["check_eta1_vs_lab_ddpm"] = float((c - d).abs().max())
    print("checks", meta["check_eta0_vs_lab_ddim"], meta["check_eta1_vs_lab_ddpm"], flush=True)
    # 3. samplers x steps
    STEPS = [1, 2] if SMOKE else [1, 2, 4, 10, 20, 50]
    for eta in [0.0, 0.5, 1.0]:
        for n in STEPS + ([] if SMOKE else [250]):
            if eta == 0.0 and n not in (1, 2):      # the lab already has DDIM at the other step counts; DDIM 1 re-checks
                continue
            run(f"eta{eta}_{n}", lambda x, y, g, n=n, eta=eta: ddim_eta(E(y), abar, x, n, eta, gen=g),
                sampler=f"eta{eta}", steps=n, nfe=n)
    for n in STEPS + ([] if SMOKE else [250]):
        run(f"clip_{n}", lambda x, y, g, n=n: ddim_eta(E(y), abar, x, n, 1.0, gen=g, clip=True), sampler="ddpm_clip", steps=n, nfe=n)
    for kind in ["dpm2m_karras", "unipc", "heun", "euler_a", "dpm2m_sde", "dpm2m", "euler"]:
        for n in STEPS + ([250] if kind in ("euler_a", "dpm2m_sde") else []):
            if kind in ("dpm2m", "euler") and n != 2:   # the lab has the rest
                continue
            cnt = Count(net)
            def fn(x, y, g, n=n, kind=kind, cnt=cnt):
                return with_scheduler(cnt, hf(kind), x, y, n, 1.0, gen=g)
            cnt.n = 0
            run(f"{kind}_{n}", fn, sampler=kind, steps=n)
            res[-1]["nfe"] = cnt.n // 3          # three calls per run (two chunks and the strip)
    # timesteps / sigmas each scheduler walks at 10 steps (for the page)
    walks = {}
    for kind in ["dpm2m", "dpm2m_karras", "euler", "heun", "unipc"]:
        s = hf(kind); s.set_timesteps(10)
        walks[kind] = {"t": [round(float(v), 1) for v in s.timesteps], "sigma": [round(float(v), 4) for v in getattr(s, "sigmas", [])][:21]}
    meta["walks"] = walks

elif stage == "extra":
    raw = load(scratch("ckpt", "df_ddpm_eps_4000.pt"), key="model"); Er = eps_plain(raw)
    for n in [10, 50]:
        run(f"raw_ddim_{n}", lambda x, y, g, n=n: ddim_eta(Er(y), abar, x, n, 0.0), sampler="raw_ddim", steps=n)
        run(f"raw_ddpm_{n}", lambda x, y, g, n=n: ddim_eta(Er(y), abar, x, n, 1.0, gen=g), sampler="raw_ddpm", steps=n)
    del raw
    net = load(scratch("ckpt", "df_ddpm_eps_4000.pt")); E = eps_plain(net)
    # bug 1: sampling a linear-schedule model with the cosine schedule's alphas
    ab_cos = Schedule(betas_cosine()).to(dev).abar
    run("bug_cosine_50", lambda x, y, g: ddim_eta(E(y), ab_cos, x, 50, 0.0), sampler="bug_cosine", steps=50)
    # bug 2: the integer timestep fed where the network expects t / T
    Eint = lambda y: (lambda x, t: net(x, torch.full((x.shape[0],), float(t), device=x.device), y))
    run("bug_int_t_50", lambda x, y, g: ddim_eta(Eint(y), abar, x, 50, 0.0), sampler="bug_int_t", steps=50)
    # bug 3: an Euler (sigma-space) scheduler started from unit noise, forgetting init_noise_sigma
    def euler_noinit(x, y, g):
        sch = hf("euler"); sch.set_timesteps(50)
        for t in sch.timesteps:
            out = net(sch.scale_model_input(x, t), torch.full((x.shape[0],), float(t) / 1000, device=x.device), y)
            x = sch.step(out, t, x).prev_sample
        return x
    s = hf("euler"); meta["euler_init_noise_sigma"] = round(float(s.init_noise_sigma), 3)
    run("bug_noinit_50", euler_noinit, sampler="bug_noinit", steps=50)
    del net
    # the 8,000-step model (dz_train.py more)
    net8 = load(dz_scratch("ckpt", "dz_ddpm_eps_8000.pt")); E8 = eps_plain(net8)
    for n in [10, 50, 250]:
        run(f"m8_ddim_{n}", lambda x, y, g, n=n: ddim_eta(E8(y), abar, x, n, 0.0), sampler="m8_ddim", steps=n)
        run(f"m8_ddpm_{n}", lambda x, y, g, n=n: ddim_eta(E8(y), abar, x, n, 1.0, gen=g), sampler="m8_ddpm", steps=n)
    run("m8_ddpm_1000", lambda x, y, g: ddim_eta(E8(y), abar, x, 1000, 1.0, gen=g), sampler="m8_ddpm", steps=1000)

elif stage == "guide":
    net = load(scratch("ckpt", "df_ddpm_eps_4000.pt"))
    sig = ((1 - abar) / abar).sqrt().cpu()
    # Kynkaanniemi et al. 2024 guided SD-XL only for sigma in (0.28, 5.42]; map that interval to our timesteps
    lo = int((sig > 0.28).nonzero()[0]); hi = int((sig <= 5.42).nonzero()[-1])
    meta["interval_t"] = [lo, hi]; meta["interval_sigma"] = [0.28, 5.42]
    for s in ([3] if SMOKE else [2, 3, 5, 7.5, 10]):
        run(f"rescale_{s}", lambda x, y, g, s=s: ddim_eta(cfg(net, y, s, phi=0.7), abar, x, 50, 0.0), kind="rescale", scale=s, phi=0.7)
        run(f"interval_{s}", lambda x, y, g, s=s: ddim_eta(cfg(net, y, s, interval=(lo, hi)), abar, x, 50, 0.0), kind="interval", scale=s)
    # the same three on DDPM 50 (stochastic) at two scales, to see whether the sampler changes the picture
    for s in ([2] if SMOKE else [1, 2, 3]):
        run(f"ddpm_cfg_{s}", lambda x, y, g, s=s: ddim_eta(cfg(net, y, s), abar, x, 50, 1.0, gen=g), kind="ddpm_cfg", scale=s)
    bad = load(dz_scratch("ckpt", "dz_bad_b16_1000.pt"), base=16)
    tmp = []
    for w in ([2] if SMOKE else [1.5, 2, 3, 4]):
        run(f"auto_{w}", lambda x, y, g, w=w: ddim_eta(autoguide(net, bad, y, w), abar, x, 50, 0.0), kind="auto", scale=w)
    # the bad model alone (what is being extrapolated away from)
    run("bad_alone", lambda x, y, g: ddim_eta(eps_plain(bad)(y), abar, x, 50, 0.0), kind="bad_alone", scale=1)

if not SMOKE:
    json.dump({**meta, "runs": res}, open(os.path.join(OUT, f"{stage}.json"), "w"), indent=0)
    np.savez_compressed(dz_scratch(f"strips_{stage}.npz"), **strips)
print("done", stage, flush=True)
