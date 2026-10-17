"""Latent lab: the 16 fixed colour test images through the Stable Diffusion 1.5 VAE, and what the scaling factor does.

MPS, under the bench lock, VAE only (83.7M parameters):
  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I sd_vae.py
1. fp32 and fp16 VAE: encode (posterior mean) and decode each 512x512 image; PSNR and SSIM against the original;
   per-channel latent mean and std; the posterior's own std (how "variational" the VAE is).
2. Decode-side mistakes on the cat's latent: decode(z) (correct), decode(z * s) (forgot to divide by s at the end of
   a pipeline that worked in scaled units), decode(z / s) (divided a raw latent).
3. Forward noising at the same t and the same noise, in scaled units (correct) and raw units (factor forgotten):
   x_t = sqrt(abar_t) z + sqrt(1 - abar_t) eps, SD 1.5's scaled_linear betas 0.00085 to 0.012 over 1000 steps.
Writes GM_SCRATCH/lt/sdvae/*.png (full size, for crops) and src/latent/out/sd_vae.json.
"""
import json, math, os, sys, time

import numpy as np
import torch
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from common import cap_threads, scratch, PeakMem, MACHINE, empty_cache
import pretrained
from skimage.metrics import structural_similarity

cap_threads(4)
dev = torch.device("mps")
OUT = scratch("lt", "sdvae"); os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
S = 0.18215
items = pretrained.test_images()


def to_t(im):
    a = np.asarray(im, dtype=np.float32) / 127.5 - 1
    return torch.from_numpy(a).permute(2, 0, 1)[None]


def to_u8(x):
    return ((x[0].float().clamp(-1, 1).permute(1, 2, 0).cpu().numpy() + 1) * 127.5).round().astype(np.uint8)


def psnr(a, b):
    mse = np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2)
    return 10 * math.log10(255 ** 2 / mse)


res = {"machine": MACHINE, "torch": torch.__version__, "date": time.strftime("%Y-%m-%d"),
       "model": f"{pretrained.SD[0]}@{pretrained.SD[1][:12]} vae", "scaling_factor": S, "images": {}}
latents = {}
for dtype, tag in ((torch.float32, "fp32"), (torch.float16, "fp16")):
    with PeakMem() as pm:
        vae = pretrained.load_sd_vae(dev, dtype=dtype)
        t0 = time.time(); n = 0
        for key, im, it in items:
            x = to_t(im).to(dev, dtype)
            with torch.no_grad():
                post = vae.encode(x).latent_dist
                z = post.mean
                rec = vae.decode(z).sample
            torch.mps.synchronize(); n += 1
            o, r = np.asarray(im), to_u8(rec)
            d = res["images"].setdefault(key, {})
            d[tag] = {"psnr": round(psnr(o, r), 2),
                      "ssim": round(float(structural_similarity(o, r, channel_axis=2, data_range=255)), 4),
                      "nan": bool(torch.isnan(rec).any())}
            if tag == "fp32":
                zc = z[0].float().cpu()
                d["latent_mean_ch"] = [round(float(v), 3) for v in zc.mean((1, 2))]
                d["latent_std_ch"] = [round(float(v), 3) for v in zc.std((1, 2))]
                d["latent_std"] = round(float(zc.std()), 3)
                d["posterior_std_mean"] = round(float(post.std.float().mean()), 5)
                latents[key] = zc
                Image.fromarray(r).save(os.path.join(OUT, key + "_rec.png"))
                np.save(os.path.join(OUT, key + "_z.npy"), zc.numpy())
        sec = (time.time() - t0) / n
    res[tag] = {"sec_per_image_round_trip": round(sec, 3), "peak_mps_mb": pm.peak_mb}
    print(tag, res[tag], flush=True)
    if tag == "fp32":
        keep = vae
    else:
        del vae
    empty_cache()

vae = keep
allz = torch.stack(list(latents.values()))
res["all16"] = {"latent_std": round(float(allz.std()), 4), "latent_mean": round(float(allz.mean()), 4),
                "std_ch": [round(float(v), 4) for v in allz.transpose(0, 1).reshape(4, -1).std(1)],
                "mean_ch": [round(float(v), 4) for v in allz.transpose(0, 1).reshape(4, -1).mean(1)],
                "implied_factor_1_over_std": round(1 / float(allz.std()), 5),
                "scaled_std": round(float(allz.std()) * S, 4)}
print(res["all16"], flush=True)

# 2. decode-side mistakes on the cat latent
cat = latents["p01_cat"][None].to(dev)
orig = np.asarray(items[0][1])
dec = {}
for name, zz in (("right", cat), ("forgot_divide", cat * S), ("divided_raw", cat / S)):
    with torch.no_grad():
        r = to_u8(vae.decode(zz).sample)
    Image.fromarray(r).save(os.path.join(OUT, f"dec_{name}.png"))
    dec[name] = {"psnr": round(psnr(orig, r), 2), "mean_rgb": [round(float(v), 1) for v in r.reshape(-1, 3).mean(0)],
                 "std_rgb": [round(float(v), 1) for v in r.reshape(-1, 3).std(0)]}
res["decode_mistakes"] = dec
print(dec, flush=True)

# 3. forward noising, scaled vs raw units
betas = torch.linspace(0.00085 ** 0.5, 0.012 ** 0.5, 1000, dtype=torch.float64) ** 2
abar = torch.cumprod(1 - betas, 0)
g = torch.Generator("cpu").manual_seed(0)
eps = torch.randn(cat.shape, generator=g).to(dev)
noise = {}
for t in (0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 999):
    a = float(abar[t])
    row = {"abar": round(a, 6), "snr_scaled": None, "snr_raw": None}
    for name, z0, unit in (("scaled", cat * S, S), ("raw", cat, 1.0)):
        xt = math.sqrt(a) * z0 + math.sqrt(1 - a) * eps
        with torch.no_grad():
            r = to_u8(vae.decode(xt / unit).sample)
        Image.fromarray(r).save(os.path.join(OUT, f"noise_{name}_{t:03d}.png"))
        row["psnr_" + name] = round(psnr(orig, r), 2)
        sig = float(z0.pow(2).mean())
        row["snr_" + name] = round(a * sig / (1 - a), 4)
    noise[t] = row
    print(t, row, flush=True)
res["noising"] = noise

# latent channels of the cat (min-max per channel), for the page
for c in range(4):
    zc = latents["p01_cat"][c].numpy()
    u = ((zc - zc.min()) / (zc.max() - zc.min()) * 255).round().astype(np.uint8)
    Image.fromarray(u).save(os.path.join(OUT, f"cat_latent_c{c}.png"))
json.dump(res, open(os.path.join(HERE, "out", "sd_vae.json"), "w"), indent=1)
print("done", flush=True)
