"""Shared setup for this page's runs (prefix ev): the root's shared code (src/data), the Diffusion and Flow labs'
samplers (src/diff, src/flow). Run every script with the shared venv's Python, low priority, 4 threads:
    GM_SCRATCH=<shared setup folder> nice -n 15 $GM_SCRATCH/venv/bin/python -I <script>.py ...
GPU (MPS) scripts run only under the bench lock with PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 (see run_gpu.sh).
Small results go to ../out/ (committed); sample and feature arrays go to GM_SCRATCH/ev/ (not committed).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
for sub in ("data", "diff", "flow"):
    sys.path.insert(0, os.path.join(ROOT_SRC, sub))
sys.path.insert(0, HERE)
OUT = os.path.join(HERE, "..", "out")
os.makedirs(OUT, exist_ok=True)

# Every generated or real set compared on the page: key -> description (the order is the page's order)
SETS = {
    "real": "10,000 real training images (the first 10,000 of the train split: the setup's real-vs-real floor set)",
    "ddpm": "DDPM, 8,000 training steps (Diffusion from zero), ancestral DDPM sampler, 250 steps, no guidance",
    "ddim": "the same 8,000-step model, DDIM, 10 steps, no guidance",
    "flow": "flow matching, 4,000 steps (Flow lab), Euler 50 steps, no guidance (s = 1)",
    "flow_g15": "the same flow model, Euler 50 steps, guidance s = 1.5 (the Flow lab's best FD)",
    "flow_g4": "the same flow model, Euler 50 steps, strong guidance s = 4",
    "vae": "16-d VAE (beta 1, Latent lab), 10,000 codes from N(0, I) decoded",
    "half": "constructed: 10,000 real training images from 5 of the 10 classes only (perfect images, half the variety)",
}


def ev_scratch(*p):
    from common import scratch
    d = scratch("ev")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, *p)


def dump(name, obj):
    p = os.path.join(OUT, name)
    json.dump(obj, open(p, "w"), indent=1)
    print("wrote", name, os.path.getsize(p), "bytes", flush=True)
