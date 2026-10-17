"""Shared setup for the Vision encoders child page scripts (prefix ve).

Reuses the root's shared code (src/data) and the Vision lab helpers (src/vision/vs_env.py), so CLIP and SigLIP 2
are loaded, preprocessed and embedded exactly as in the Vision lab.
Run every script with the shared venv's Python, low priority, 4 threads, on CPU:
    GM_SCRATCH=<shared setup folder> nice -n 15 $GM_SCRATCH/venv/bin/python -I <script>.py ...
Outputs: small JSON in ../out/ (committed); embedding arrays in GM_SCRATCH/ve/ (not committed).
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
sys.path.insert(0, os.path.join(ROOT_SRC, "vision"))
from common import cap_threads, scratch, load_split, MACHINE, CLASSES  # noqa: E402,F401
import pretrained  # noqa: E402
import vs_env  # noqa: E402  (load, embed_text, embed_images, big: the Vision lab's own helpers)

OUT = os.path.join(HERE, "..", "out")
os.makedirs(OUT, exist_ok=True)

# Self-supervised encoders added on this page, pinned to Hub revisions (checked 2026-10-17 via the Hub API)
DINO = ("facebook/dinov2-base", "f9e44c814b77203eaa57a6bdbbd535f21ede1415")              # Apache 2.0
DINOREG = ("facebook/dinov2-with-registers-base", "a1d738ccfa7ae170945f210395d99dde8adb1805")  # Apache 2.0
MAE = ("facebook/vit-mae-base", "25b184bea5538bf5c4c852c79d221195fdd2778d")              # Apache 2.0


def big(*p):
    d = scratch("ve"); os.makedirs(d, exist_ok=True)
    return os.path.join(d, *p)


def lab(*p):
    """the Vision lab's arrays (CLIP and SigLIP 2 embeddings of Fashion-MNIST)"""
    return vs_env.big(*p)


def load_ssl(which):
    """which in dino|dinoreg|mae; float32 on CPU. Returns (model, image_processor)."""
    import torch
    from transformers import AutoImageProcessor, AutoModel
    repo, rev = {"dino": DINO, "dinoreg": DINOREG, "mae": MAE}[which]
    proc = AutoImageProcessor.from_pretrained(repo, revision=rev)
    kw = {"mask_ratio": 0.0} if which == "mae" else {}
    model = AutoModel.from_pretrained(repo, revision=rev, dtype=torch.float32, **kw).eval()
    return model, proc


def dump(name, obj):
    p = os.path.join(OUT, name)
    json.dump(obj, open(p, "w"), separators=(",", ":"))
    print("wrote", os.path.basename(p), os.path.getsize(p), "bytes", flush=True)
