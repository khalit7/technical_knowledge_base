"""Reference values for the page's JavaScript (checked by check_calc.mjs):
  - transformers' own resizing functions (SigLIP 2 NaFlex, Qwen2-VL smart_resize) on a grid of image sizes
  - the MACs formula (section 1) on every calculator preset and on the shapes the prose quotes
Writes ../out/recompute.json. Run with the shared venv's Python.
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import OUT
from transformers.models.siglip2.image_processing_siglip2 import get_image_size_for_max_num_patches
from transformers.models.qwen2_vl.image_processing_qwen2_vl import smart_resize


def macs(R, P, D, L, F, extra=1, glu=False):
    N = (R // P) ** 2; T = N + extra; m = 3 if glu else 2
    patch = N * 3 * P * P * D; proj = 4 * T * D * D * L; scores = 2 * T * T * D * L; mlp = m * T * D * F * L
    return {"total": patch + proj + scores + mlp, "scores": scores}


sizes = [(1080, 1920), (1920, 1080), (224, 224), (512, 512), (3000, 4000), (100, 2000), (37, 53), (4000, 300), (768, 1366), (28, 28)]
R = {"naflex": [], "smart": [], "macs": []}
for h, w in sizes:
    for mp in (256, 576, 1024, 4096):
        R["naflex"].append([h, w, mp, list(get_image_size_for_max_num_patches(h, w, 16, mp))])
    try:
        R["smart"].append([h, w, list(smart_resize(h, w, factor=28, min_pixels=3136, max_pixels=12845056))])
    except ValueError as e:
        R["smart"].append([h, w, None])
for args in [(224, 16, 768, 12, 3072, 1), (448, 16, 768, 12, 3072, 1), (518, 14, 768, 12, 3072, 1), (224, 32, 768, 12, 3072, 1),
             (448, 32, 768, 12, 3072, 1), (336, 14, 1024, 24, 4096, 1), (384, 14, 1152, 27, 4304, 0), (518, 14, 1536, 40, 4096, 1, True),
             (256, 16, 4096, 40, 8192, 5, True)]:
    R["macs"].append([list(args), macs(*args)])
r16 = macs(224, 16, 768, 12, 3072, 1); r448 = macs(448, 16, 768, 12, 3072, 1)
R["prose"] = {"vitb16_224": round(r16["total"] / 1e9, 2), "vitb16_448": round(r448["total"] / 1e9, 2),
              "ratio_448_224": round(r448["total"] / r16["total"], 2), "share_scores_224": round(r16["scores"] / r16["total"], 3)}
json.dump(R, open(os.path.join(OUT, "recompute.json"), "w"), separators=(",", ":"))
print(R["prose"], R["smart"][:3], R["naflex"][:2])
