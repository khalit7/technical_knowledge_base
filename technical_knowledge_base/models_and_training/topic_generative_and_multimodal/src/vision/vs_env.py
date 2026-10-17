"""Shared setup for the Vision lab scripts (prefix vs).

Run every script with the shared venv's Python, low priority, 4 threads:
    GM_SCRATCH=<shared setup folder> nice -n 15 $GM_SCRATCH/venv/bin/python -I <script>.py ...
CPU runs load the models in float32 (fp16 matmuls are slow on CPU); MPS runs (only under the bench lock)
use float16. Outputs go to out/ here (small JSON) or GM_SCRATCH/vision/ (embedding arrays).
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from common import cap_threads, scratch, device, sync, PeakMem, MACHINE, CLASSES, load_split  # noqa: E402,F401
import pretrained  # noqa: E402

OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def big(*p):
    d = scratch("vision"); os.makedirs(d, exist_ok=True)
    return os.path.join(d, *p)


def load(which, dev="cpu"):
    """which in clip|siglip; float32 on CPU, float16 on MPS."""
    import torch
    dt = torch.float32 if str(dev) == "cpu" else torch.float16
    f = pretrained.load_clip if which == "clip" else pretrained.load_siglip
    return f(dev, dt)


def text_kw(which):
    # SigLIP was trained with text padded to 64 tokens; CLIP pads to the longest in the batch (causal mask, EOS pooling)
    return {"padding": "max_length", "max_length": 64} if which == "siglip" else {"padding": True}


def unit(x):
    import torch
    x = getattr(x, "pooler_output", x)
    return torch.nn.functional.normalize(x.float(), dim=-1)


def embed_text(model, proc, which, texts, dev="cpu", bs=64, lower=None):
    """lower=None lowercases for SigLIP only: big_vision's SigLIP 2 demo preprocesses text with
    lower(key="text") before the Gemma tokenizer, while the transformers processor keeps case.
    CLIP's tokenizer lowercases by itself."""
    import torch
    if lower is None:
        lower = which == "siglip"
    if lower:
        texts = [t.lower() for t in texts]
    outs = []
    with torch.no_grad():
        for i in range(0, len(texts), bs):
            t = proc(text=texts[i:i + bs], return_tensors="pt", **text_kw(which)).to(dev)
            outs.append(unit(model.get_text_features(**t)).cpu())
    return torch.cat(outs).numpy()


def embed_images(model, proc, images, dev="cpu", bs=32, log=None):
    import torch
    outs = []; t0 = time.time()
    with torch.no_grad():
        for i in range(0, len(images), bs):
            pv = proc(images=images[i:i + bs], return_tensors="pt")["pixel_values"].to(dev, model.dtype)
            outs.append(unit(model.get_image_features(pixel_values=pv)).cpu())
            if log and (i // bs) % 20 == 0:
                print(f"{log}: {i + len(images[i:i + bs])}/{len(images)} images, {time.time() - t0:.0f} s", flush=True)
    return torch.cat(outs).numpy()


def dump(name, obj):
    p = os.path.join(OUT, name)
    json.dump(obj, open(p, "w"), separators=(",", ":"))
    print("wrote", p, os.path.getsize(p), "bytes", flush=True)
