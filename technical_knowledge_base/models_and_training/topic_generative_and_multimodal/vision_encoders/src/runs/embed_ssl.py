"""Embed Fashion-MNIST val (5,000) and test (10,000) with a self-supervised encoder, on CPU (float32, 4 threads).

Same images and conversion as the Vision lab's embed_fmnist.py (grey 28x28 -> RGB -> the model's own processor).
which = dino (DINOv2 ViT-B/14) | mae (MAE ViT-B/16, mask_ratio 0 so every patch is seen).
Saves two image vectors per image, both unit length, float16, to GM_SCRATCH/ve/fmnist_<which>.npz:
  cls  = the final-layer [CLS] token after the last LayerNorm (DINOv2's pooler_output; MAE's sequence position 0)
  mean = the mean of the final-layer patch tokens after the last LayerNorm
Writes ../out/embed_<which>.json (timing, shapes, processor settings).
Usage: python -I embed_ssl.py dino|mae
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np, torch
from PIL import Image

cap_threads(4)
which = sys.argv[1]
res = {"which": which, "repo": list({"dino": DINO, "mae": MAE}[which]), "machine": MACHINE,
       "date": time.strftime("%Y-%m-%d"), "device": "cpu", "dtype": "float32", "threads": 4}
t = time.time(); model, proc = load_ssl(which); res["load_seconds"] = round(time.time() - t, 1)
res["params"] = sum(p.numel() for p in model.parameters())
res["processor"] = {k: v for k, v in proc.to_dict().items() if k in ("size", "crop_size", "do_center_crop", "resample", "image_mean", "image_std")}


def vecs(pv):
    with torch.no_grad():
        o = model(pixel_values=pv)
    h = o.last_hidden_state                       # after the final LayerNorm in both models
    nreg = getattr(model.config, "num_register_tokens", 0) or 0
    cls = h[:, 0]; pat = h[:, 1 + nreg:]
    n = torch.nn.functional.normalize
    return n(cls.float(), dim=-1), n(pat.mean(1).float(), dim=-1), pat.shape[1]


arr = {}
for split in ("val", "test"):
    x, y = load_split(split)
    C, M = [], []; t0 = time.time()
    for i in range(0, len(x), 64):
        ims = [Image.fromarray(a).convert("RGB") for a in x[i:i + 64]]
        pv = proc(images=ims, return_tensors="pt")["pixel_values"]
        c, m, npatch = vecs(pv); C.append(c.numpy()); M.append(m.numpy())
        if (i // 64) % 20 == 0:
            print(f"{which} {split}: {i + len(ims)}/{len(x)} images, {time.time() - t0:.0f} s", flush=True)
    res[f"{split}_seconds"] = round(time.time() - t0, 1); res[f"{split}_n"] = len(x)
    arr[f"cls_{split}"] = np.concatenate(C).astype(np.float16); arr[f"mean_{split}"] = np.concatenate(M).astype(np.float16)
    arr[f"y_{split}"] = y
res["input_shape"] = list(pv.shape); res["patch_tokens"] = int(npatch)
np.savez(big(f"fmnist_{which}.npz"), **arr)
res["images_per_second"] = round((res["val_n"] + res["test_n"]) / (res["val_seconds"] + res["test_seconds"]), 1)
dump(f"embed_{which}.json", res)
