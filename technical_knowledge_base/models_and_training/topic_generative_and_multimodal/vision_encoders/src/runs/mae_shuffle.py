"""A trap when using MAE as a plain encoder: ViTMAEModel shuffles the patch order even with mask_ratio 0.

Runs the released MAE ViT-B/16 on one test image (p01_cat) twice with mask_ratio 0: with the default random noise
and with an increasing noise (argsort = identity). Prints the first restore indices, whether the mean-pooled
vector changes (it should not), and how far the per-patch outputs move. Writes ../out/mae_shuffle.json.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np, torch

cap_threads(4)
model, proc = load_ssl("mae")
im = pretrained.test_images()[0][1]
pv = proc(images=[im], return_tensors="pt")["pixel_values"]
L = (pv.shape[-1] // model.config.patch_size) ** 2
torch.manual_seed(0)
with torch.no_grad():
    a = model(pixel_values=pv)
    b = model(pixel_values=pv, noise=torch.arange(L, dtype=torch.float32)[None])
pa, pb = a.last_hidden_state[0, 1:], b.last_hidden_state[0, 1:]
r = {"date": time.strftime("%Y-%m-%d"), "mask_ratio": model.config.mask_ratio, "tokens": int(pa.shape[0]),
     "ids_restore_default_first8": a.ids_restore[0, :8].tolist(), "ids_restore_fixed_first8": b.ids_restore[0, :8].tolist(),
     "patch0_cos_default_vs_fixed": round(float(torch.nn.functional.cosine_similarity(pa[0], pb[0], dim=0)), 4),
     "mean_cos_default_vs_fixed": round(float(torch.nn.functional.cosine_similarity(pa.mean(0), pb.mean(0), dim=0)), 6),
     "patches_in_place_default": int((a.ids_restore[0] == torch.arange(L)).sum())}
print(r)
dump("mae_shuffle.json", r)
