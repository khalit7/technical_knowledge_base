"""Measure one real full fine-tune: SmolLM2-135M (base) against SmolLM2-135M-Instruct (SFT then DPO, per its model card).

Reads the two model.safetensors files (bf16, 269 MB each; downloaded to a scratch folder, never committed):
  https://huggingface.co/HuggingFaceTB/SmolLM2-135M/resolve/main/model.safetensors
  https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/resolve/main/model.safetensors
and writes inputs/delta_probe.json (small): for every layer and every linear matrix, the relative size of the
update ||dW||_F / ||W0||_F, the singular values of dW (energy captured by its best rank-r approximation, r = 1..),
and DoRA's magnitude/direction measures; plus, for the matrix drawn on the page, a crop of W0 and dW.

Usage: uv run --no-project --with numpy python delta_probe.py <base.safetensors> <instruct.safetensors>
"""
import json, struct, sys
import numpy as np

def load(path):
    f = open(path, "rb")
    n = struct.unpack("<Q", f.read(8))[0]
    hdr = json.loads(f.read(n))
    base = 8 + n
    def get(name):
        h = hdr[name]
        assert h["dtype"] == "BF16", h["dtype"]
        a, b = h["data_offsets"]
        f.seek(base + a)
        u = np.frombuffer(f.read(b - a), dtype="<u2").astype(np.uint32) << 16
        return u.view(np.float32).reshape(h["shape"]).astype(np.float64)
    return hdr, get

hb, gb = load(sys.argv[1])
hi, gi = load(sys.argv[2])
MODS = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
L = 30
out = {"source": {
    "base": "https://huggingface.co/HuggingFaceTB/SmolLM2-135M",
    "instruct": "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct",
    "note": "Instruct = SFT then DPO on the base (model card). Weights are out x in (PyTorch Linear)."},
    "mods": MODS, "layers": L, "cells": []}
rs = [1, 2, 4, 8, 16, 32, 64, 128, 256]
for l in range(L):
    for m in MODS:
        sec = "self_attn" if m in MODS[:4] else "mlp"
        name = "model.layers.%d.%s.%s.weight" % (l, sec, m)
        W0 = gb(name); W1 = gi(name); D = W1 - W0
        s = np.linalg.svd(D, compute_uv=False)
        e = np.cumsum(s ** 2) / np.sum(s ** 2)
        def rank_for(p): return int(np.searchsorted(e, p) + 1)
        # DoRA (Liu et al. 2024, Section 3): magnitude per output unit (row of the out x in weight = column of the paper's W)
        m0 = np.linalg.norm(W0, axis=1); m1 = np.linalg.norm(W1, axis=1)
        cos = np.sum(W0 * W1, axis=1) / (m0 * m1)
        out["cells"].append({
            "l": l, "m": m, "shape": list(W0.shape),
            "rel": float(np.linalg.norm(D) / np.linalg.norm(W0)),
            "r50": rank_for(.5), "r90": rank_for(.9), "r99": rank_for(.99),
            "energy_at": {str(r): float(e[min(r, len(e)) - 1]) for r in rs},
            "dM": float(np.mean(np.abs(m1 - m0))), "dD": float(np.mean(1 - cos)),
        })
    print("layer", l, file=sys.stderr)

# the matrix drawn on the page: layer 14 (middle), q_proj
l, m = 14, "q_proj"
name = "model.layers.%d.self_attn.%s.weight" % (l, m)
W0 = gb(name); W1 = gi(name); D = W1 - W0
U, s, Vt = np.linalg.svd(D)
s0 = np.linalg.svd(W0, compute_uv=False)
C = 48  # crop of the top-left 48 x 48 block, for the heatmaps
out["show"] = {"l": l, "m": m, "shape": list(W0.shape), "crop": C,
    "sv_dW": [float(x) for x in s], "sv_W0": [float(x) for x in s0],
    "W0": np.round(W0[:C, :C], 5).tolist(), "dW": np.round(D[:C, :C], 6).tolist(),
    # best rank-r approximation of dW on the crop, for r in R (truncated SVD of the whole matrix, then cropped)
    "approx": {str(r): np.round((U[:, :r] * s[:r]) @ Vt[:r], 6)[:C, :C].tolist() for r in [1, 4, 16, 64]},
    "normW0": float(np.linalg.norm(W0)), "normdW": float(np.linalg.norm(D)),
    "absmax_W0": float(np.abs(W0).max()), "absmax_dW": float(np.abs(D).max())}
json.dump(out, open("inputs/delta_probe.json", "w"), separators=(",", ":"))
print("written", file=sys.stderr)
