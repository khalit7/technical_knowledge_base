"""Embed Fashion-MNIST val (5,000) and test (10,000) with CLIP B/32 or SigLIP 2 base, on CPU (float32, 4 threads).

The grey 28x28 images are converted to RGB and given to each model's own processor (CLIP: bicubic resize of the
short side to 224 and centre crop; SigLIP 2: bilinear resize to 224x224), exactly as any other image.
Writes GM_SCRATCH/vision/fmnist_<which>.npz (unit-norm float16 embeddings) and out/embed_fmnist_<which>.json (timing).
Usage: python -I embed_fmnist.py clip|siglip
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vs_env import *
import numpy as np
from PIL import Image

cap_threads(4)
which = sys.argv[1]
res = {"which": which, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "device": "cpu", "dtype": "float32", "threads": 4}
t = time.time(); model, proc = load(which, "cpu"); res["load_seconds"] = round(time.time() - t, 1)
arr = {}
for split in ("val", "test"):
    x, y = load_split(split)
    ims = [Image.fromarray(a).convert("RGB") for a in x]
    t = time.time()
    e = embed_images(model, proc, ims, bs=64, log=f"{which} {split}")
    res[f"{split}_seconds"] = round(time.time() - t, 1); res[f"{split}_n"] = len(ims)
    arr[f"e_{split}"] = e.astype(np.float16); arr[f"y_{split}"] = y
np.savez(big(f"fmnist_{which}.npz"), **arr)
res["images_per_second"] = round((res["val_n"] + res["test_n"]) / (res["val_seconds"] + res["test_seconds"]), 1)
dump(f"embed_fmnist_{which}.json", res)
