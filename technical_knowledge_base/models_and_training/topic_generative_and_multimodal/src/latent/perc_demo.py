"""Latent lab: why pixel error cannot tell sharp from blurry (CPU only; reads the SD VAE reconstructions sd_vae.py saved).

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I perc_demo.py
For each chosen image: the SD 1.5 VAE reconstruction, and a Gaussian blur of the original whose sigma is found by
bisection so that its PSNR equals the reconstruction's. Same pixel error; then SSIM and a deep-feature distance
(cosine distance between 2048-d Inception pool features, torch-fidelity's inception-v3-compat: the idea behind LPIPS,
which compares deep features; LPIPS itself is not installed here). Writes src/latent/out/perc.json and the blurred
images to GM_SCRATCH/lt/sdvae/<key>_blur.png.
"""
import json, math, os, sys

import numpy as np
import torch
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from common import cap_threads, scratch
import fid as F
from skimage.metrics import structural_similarity

cap_threads(4)
torch.set_grad_enabled(False)
D = scratch("lt", "sdvae")


def psnr(a, b):
    return 10 * math.log10(255 ** 2 / np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2))


def feat(imgs):
    return F.inception_features(np.stack(imgs), torch.device("cpu"), bs=8)


res = {"method": "Gaussian blur radius found by bisection so PSNR(blur) = PSNR(SD VAE reconstruction)", "images": {}}
for key in ("p01_cat", "s03_text", "p04_hubble", "g05_stopsign"):
    o = np.asarray(Image.open(scratch("test_images", key + ".png")).convert("RGB"))
    r = np.asarray(Image.open(os.path.join(D, key + "_rec.png")).convert("RGB"))
    target = psnr(o, r)
    lo, hi = 0.05, 8.0
    for _ in range(30):
        mid = (lo + hi) / 2
        b = np.asarray(Image.fromarray(o).filter(ImageFilter.GaussianBlur(mid)))
        if psnr(o, b) > target:
            lo = mid
        else:
            hi = mid
    b = np.asarray(Image.fromarray(o).filter(ImageFilter.GaussianBlur((lo + hi) / 2)))
    Image.fromarray(b).save(os.path.join(D, key + "_blur.png"))
    fo, fr, fb = feat([o, r, b])
    cos = lambda u, v: float(1 - u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))
    res["images"][key] = {
        "blur_sigma": round((lo + hi) / 2, 3),
        "psnr_rec": round(target, 2), "psnr_blur": round(psnr(o, b), 2),
        "ssim_rec": round(float(structural_similarity(o, r, channel_axis=2, data_range=255)), 4),
        "ssim_blur": round(float(structural_similarity(o, b, channel_axis=2, data_range=255)), 4),
        "feat_cos_dist_rec": round(cos(fo, fr), 4), "feat_cos_dist_blur": round(cos(fo, fb), 4)}
    print(key, res["images"][key], flush=True)
json.dump(res, open(os.path.join(HERE, "out", "perc.json"), "w"), indent=1)
