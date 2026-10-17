"""Generate the sets every metric on this page is computed on: 10,000 images each (1,000 per class), uint8 28x28.

    python -I ev_gen.py            # MPS, under the bench lock (run_gpu.sh)
Reuses checkpoints, it trains nothing:
  ddpm, ddim : GM_SCRATCH/dz/ckpt/dz_ddpm_eps_8000.pt (Diffusion from zero's 8,000-step DDPM, EMA weights),
               the Diffusion lab's own samplers (src/diff/samplers.py: ddpm = ancestral, ddim = eta 0)
  flow*      : GM_SCRATCH/ckpt/fw_fm_4000.pt (the Flow lab's model, EMA), the lab's Euler sampler (src/flow/fm_samplers.py)
  vae        : GM_SCRATCH/ckpt/lt_vae16_b1p0.pt (the Latent lab's 16-d VAE, beta 1), z ~ N(0, I) decoded
  real, half : real training images, no model
Labels: class c for samples c*1000 .. c*1000+999. Noise: CPU generator seeded 2026 + batch index (same on any device).
Writes GM_SCRATCH/ev/sets.npz (one uint8 [10000,28,28] array per set) and out/gen.json (timings, a 1,000-sample
fd_fmnist cross-check against the labs' published numbers, peak memory).
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ev_env import SETS, ev_scratch, dump
import numpy as np
import torch
from common import cap_threads, device, scratch, sync, from_model, load_split, MACHINE, touch_bench, PeakMem, empty_cache
from nets import TinyUNet, ConvVAE
from objectives import Schedule, betas_linear, to_image
from samplers import ddpm as lab_ddpm, ddim as lab_ddim
from fm_samplers import euler
import fid

cap_threads(4)
torch.set_grad_enabled(False)
SMOKE = os.environ.get("EV_SMOKE") == "1"         # CPU smoke test: 200 images per set, nothing written
dev = device("cpu" if SMOKE else "mps")
N, B = (200, 100) if SMOKE else (10000, 1000)
Y = torch.arange(10).repeat_interleave(N // 10)
res = {"machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"), "n": N, "sets": {}}
out = {}


def noise(i, shape=(B, 1, 32, 32)):
    return torch.randn(shape, generator=torch.Generator().manual_seed(2026 + i))


def unet(path):
    ck = torch.load(path, map_location="cpu")
    m = TinyUNet(); m.load_state_dict(ck["ema"]); return m.to(dev).eval()


def run(name, fn):
    cache = ev_scratch(f"set_{name}.npy")             # per-set cache: a crash later does not lose finished sets
    if not SMOKE and os.path.exists(cache):
        out[name] = np.load(cache); res["sets"][name] = json.load(open(cache + ".json")); print(name, "cached", flush=True); return
    t0 = time.perf_counter(); xs = []
    for i in range(N // B):
        y = Y[i * B:(i + 1) * B].to(dev)
        x = fn(noise(i).to(dev), y, i).clamp(-1, 1)
        xs.append(from_model(x.cpu())); touch_bench("ev")
        print(f"{name}: batch {i + 1}/{N // B}, {time.perf_counter() - t0:.0f} s", flush=True)
    sync(dev)
    out[name] = np.concatenate(xs)
    res["sets"][name] = {"what": SETS[name], "seconds": round(time.perf_counter() - t0, 1)}
    if not SMOKE:
        np.save(cache, out[name]); json.dump(res["sets"][name], open(cache + ".json", "w"))
    empty_cache()


with PeakMem() as pm:
    dnet = unet(scratch("dz", "ckpt", "dz_ddpm_eps_8000.pt"))
    abar = Schedule(betas_linear()).to(dev).abar
    run("ddpm", lambda z, y, i: lab_ddpm(dnet, abar, z, y, 5 if SMOKE else 250, gen=torch.Generator().manual_seed(7000 + i)))
    run("ddim", lambda z, y, i: lab_ddim(dnet, abar, z, y, 10))
    del dnet; empty_cache()
    fnet = unet(scratch("ckpt", "fw_fm_4000.pt"))
    run("flow", lambda z, y, i: euler(fnet, z, y, 50, s=1.0))
    half = lambda s: (lambda z, y, i: torch.cat([euler(fnet, z[j:j + B // 2], y[j:j + B // 2], 50, s=s) for j in (0, B // 2)]))
    run("flow_g15", half(1.5))          # guided: a batch of 2N per call, so 500 at a time (1,000 hit the 0.45 watermark cap)
    run("flow_g4", half(4.0))
    del fnet; empty_cache()
    vae = ConvVAE(latent_dim=16); vae.load_state_dict(torch.load(scratch("ckpt", "lt_vae16_b1p0.pt"), map_location="cpu"))
    vae = vae.to(dev).eval()
    run("vae", lambda z, y, i: to_image(vae.decode(torch.randn((B, 16), generator=torch.Generator().manual_seed(9000 + i)).to(dev))))
    del vae; empty_cache()
res["peak_mps_mb"] = round(pm.peak_mb, 1)

xtr, ytr = load_split("train")
out["real"] = xtr[:N]
res["sets"]["real"] = {"what": SETS["real"]}
rest = np.arange(N, len(xtr)); keep = rest[ytr[rest] < 5][:N]          # classes 0..4 (T-shirt, Trouser, Pullover, Dress, Coat)
out["half"] = xtr[keep]
res["sets"]["half"] = {"what": SETS["half"], "classes": [0, 1, 2, 3, 4]}

# cross-check against the labs: fd_fmnist on the first 100 of each class (N = 1,000), as the labs score
clf = fid.load_classifier("cpu")
idx = np.concatenate([np.arange(c * (N // 10), c * (N // 10) + N // 100) for c in range(10)])
for k in out:
    sub = out[k][idx] if k not in ("real", "half") else out[k][:1000]
    lab = Y.numpy()[idx] if k not in ("real", "half", "vae") else None
    d, acc = fid.fd_fmnist(sub, clf, "cpu", labels=lab)
    res["sets"][k]["fd_fmnist_1000"] = round(d, 2)
    if acc is not None:
        res["sets"][k]["label_acc_1000"] = round(acc, 4)
if SMOKE:
    print(res); sys.exit(0)
np.savez_compressed(ev_scratch("sets.npz"), **out)
dump("gen.json", res)
