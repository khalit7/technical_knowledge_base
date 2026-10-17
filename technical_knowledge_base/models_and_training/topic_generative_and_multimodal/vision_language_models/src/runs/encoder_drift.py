"""Was SmolVLM's vision encoder trained inside the VLM? (CPU, no GPU lock) -> out/encoder_drift.json

Compares SmolVLM-500M's vision tower, tensor by tensor, with google/siglip-base-patch16-512 (the public SigLIP
base checkpoint at 512 pixels, the same shape: 12 blocks, width 768, 1,024 positions): relative change
||W_smol - W_siglip|| / ||W_siglip|| per tensor, summarised per block. Then runs the public checkpoint's vision
tower on the 16 test images with the same norm statistic as smol_cpu.py (last block, before the final LayerNorm).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vm_env import *  # noqa
import numpy as np
import torch

cap_threads(4)
SIG = ("google/siglip-base-patch16-512", "753a949581523b60257d93e18391e8c27f72eb22")
from huggingface_hub import hf_hub_download
from safetensors import safe_open
from transformers import AutoModelForImageTextToText, SiglipVisionModel, AutoImageProcessor

sm = AutoModelForImageTextToText.from_pretrained(pretrained.VLM[0], revision=pretrained.VLM[1], dtype=torch.bfloat16)
smv = {k: v.float() for k, v in sm.model.vision_model.state_dict().items()}
del sm; empty_cache()
f = hf_hub_download(SIG[0], "model.safetensors", revision=SIG[1])
R = {"smol": pretrained.VLM, "siglip": SIG, "tensors": [], "missing": []}
with safe_open(f, "pt") as fh:
    keys = {k[len("vision_model."):]: k for k in fh.keys() if k.startswith("vision_model.")}
    for k, v in smv.items():
        if k not in keys:
            R["missing"].append(k); continue
        w = fh.get_tensor(keys[k]).float()
        if w.shape != v.shape:
            R["missing"].append(k + " (shape " + str(list(w.shape)) + " vs " + str(list(v.shape)) + ")"); continue
        rel = float((v - w).norm() / (w.norm() + 1e-12))
        R["tensors"].append({"name": k, "rel": round(rel, 5), "numel": int(v.numel())})
    R["siglip_only"] = sorted(set(keys) - set(smv))[:20]
blocks = {}
for t in R["tensors"]:
    m = t["name"].split(".")
    b = "block " + m[2] if m[0] == "encoder" and m[1] == "layers" else m[0]
    blocks.setdefault(b, []).append(t)
R["by_block"] = {b: {"rel_weighted": round(sum(x["rel"] * x["numel"] for x in ts) / sum(x["numel"] for x in ts), 5),
                     "rel_max": max(x["rel"] for x in ts), "params": sum(x["numel"] for x in ts)} for b, ts in blocks.items()}
log("drift", {b: v["rel_weighted"] for b, v in R["by_block"].items()})

vm = SiglipVisionModel.from_pretrained(SIG[0], revision=SIG[1], dtype=torch.float32).eval()
ip = AutoImageProcessor.from_pretrained(SIG[0], revision=SIG[1])
rows = []; pos = {}
for key, img, _ in pretrained.test_images():
    px = ip(images=[img], return_tensors="pt")["pixel_values"]
    with torch.no_grad():
        o = vm(pixel_values=px, output_hidden_states=True)
    pre = o.hidden_states[-1][0].norm(dim=-1).numpy(); ratio = pre / np.median(pre); hi = np.where(ratio > 5)[0]
    for h in hi: pos[f"{h // 32},{h % 32}"] = pos.get(f"{h // 32},{h % 32}", 0) + 1
    rows.append({"key": key, "max_ratio": round(float(ratio.max()), 2), "n_hi": int(len(hi))})
R["siglip512_norms"] = {"images": rows, "positions_over_5x": dict(sorted(pos.items(), key=lambda kv: -kv[1]))}
log("siglip512 norms", [r["max_ratio"] for r in rows], list(pos.items())[:6])
dump("encoder_drift.json", R)
