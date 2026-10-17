"""Control for the SmolVLM norm measurement (CPU float32, no GPU lock): the root's SigLIP 2 B/16 vision tower at its
trained 224 pixels and at 512 pixels (position table interpolated, as a VLM tile would need), same 16 test images,
same statistic (last block before the final LayerNorm, ratio to the view's median patch norm). -> out/siglip_norms.json
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vm_env import *  # noqa
import numpy as np
import torch

cap_threads(4)
model, proc = pretrained.load_siglip("cpu", torch.float32)
vis = model.vision_model.eval(); del model.text_model
R = {"model": pretrained.SIGLIP[0], "revision": pretrained.SIGLIP[1], "dtype": "float32 on CPU", "runs": {}}
for side in (224, 512):
    rows = []; pos = {}
    for key, img, _ in pretrained.test_images():
        px = proc.image_processor(images=[img.resize((side, side))], return_tensors="pt", size={"height": side, "width": side})["pixel_values"]
        with torch.no_grad():
            o = vis(pixel_values=px, output_hidden_states=True, interpolate_pos_encoding=side != 224)
        pre = o.hidden_states[-1][0].norm(dim=-1).numpy(); g = side // 16
        ratio = pre / np.median(pre); hi = np.where(ratio > 5)[0]
        for h in hi: pos[f"{h // g},{h % g}"] = pos.get(f"{h // g},{h % g}", 0) + 1
        rows.append({"key": key, "max_ratio": round(float(ratio.max()), 2), "n_hi": int(len(hi))})
    R["runs"][str(side)] = {"grid": side // 16, "images": rows, "positions_over_5x": dict(sorted(pos.items(), key=lambda kv: -kv[1]))}
    log(side, [r["max_ratio"] for r in rows], list(pos.items())[:6])
dump("siglip_norms.json", R)
