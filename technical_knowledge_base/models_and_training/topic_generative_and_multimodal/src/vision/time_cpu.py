"""Time CPU embedding of 128 Fashion-MNIST images per model, to choose CPU or MPS for the full run."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vs_env import *
from PIL import Image
cap_threads(4)
which = sys.argv[1]
x, y = load_split("test")
ims = [Image.fromarray(a).convert("RGB") for a in x[:128]]
t = time.time(); model, proc = load(which, "cpu"); print(which, "load", round(time.time() - t, 1), "s", type(model).__name__, flush=True)
embed_images(model, proc, ims[:32])
t = time.time(); e = embed_images(model, proc, ims); dt = time.time() - t
print(which, "128 images CPU fp32", round(dt, 2), "s ->", round(dt / 128 * 15000 / 60, 1), "min for 15k", e.shape, flush=True)
