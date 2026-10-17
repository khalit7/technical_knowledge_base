"""Which layer holds the most linearly readable class information? CPU float32, Fashion-MNIST.

For one encoder, every layer's mean patch token (layer 0 = patch embedding plus positions; [CLS] and registers
excluded; no final LayerNorm) is fed to the Vision lab's linear probe (zeroshot.py settings), trained on 2,000 val
images (the first 200 of each class) and tested on 5,000 test images (the first 500 of each class).
The pooled output the model normally returns (CLIP/SigLIP image embedding; DINOv2 and MAE final [CLS] after the
LayerNorm) is probed on the same split for reference.
Writes ../out/layerwise_<which>.json.
Usage: python -I layerwise.py clip|siglip|dino|mae
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
from probes_core import probe
import numpy as np, torch
from PIL import Image

cap_threads(4)
which = sys.argv[1]
t0 = time.time()
if which in ("clip", "siglip"):
    model, proc = vs_env.load(which, "cpu"); improc = proc.image_processor; vm = model.vision_model; first = 1 if which == "clip" else 0
else:
    model, improc = load_ssl(which); vm = model; first = 1 + (getattr(model.config, "num_register_tokens", 0) or 0)
xv, yv = load_split("val"); xt, yt = load_split("test")
iv = np.concatenate([np.where(yv == c)[0][:200] for c in range(10)])
it = np.concatenate([np.where(yt == c)[0][:500] for c in range(10)])


def run(x):
    L, P = [], []
    for i in range(0, len(x), 64):
        pv = improc(images=[Image.fromarray(a).convert("RGB") for a in x[i:i + 64]], return_tensors="pt")["pixel_values"]
        kw = {}
        if which == "mae":
            n = (pv.shape[-1] // model.config.patch_size) ** 2
            kw["noise"] = torch.arange(n, dtype=torch.float32).expand(pv.shape[0], n).clone()
        with torch.no_grad():
            if which in ("clip", "siglip"):
                o = vm(pixel_values=pv, output_hidden_states=True)
                pooled = model.get_image_features(pixel_values=pv)
                pooled = getattr(pooled, "pooler_output", pooled)
            else:
                o = vm(pixel_values=pv, output_hidden_states=True, **kw)
                pooled = o.last_hidden_state[:, 0]
        L.append(torch.stack([h[:, first:].mean(1) for h in o.hidden_states], 1).numpy()); P.append(pooled.numpy())
    return np.concatenate(L), np.concatenate(P)


Lv, Pv = run(xv[iv]); Lt, Pt = run(xt[it])
print(which, "features", Lv.shape, round(time.time() - t0), "s", flush=True)
u = lambda a: a / np.linalg.norm(a, axis=-1, keepdims=True)
acc = [round(probe(u(Lv[:, l]), yv[iv], u(Lt[:, l]), yt[it]), 4) for l in range(Lv.shape[1])]
pooled = round(probe(u(Pv), yv[iv], u(Pt), yt[it]), 4)
r = {"which": which, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "device": "cpu", "train": "val, 200 per class",
     "test": "test, first 500 per class", "per_layer_mean_patch": acc, "pooled_output": pooled, "seconds": round(time.time() - t0, 1)}
print(r, flush=True)
dump(f"layerwise_{which}.json", r)
