"""Write ../parts/20_js_ve_0data.js: everything the page draws, from ../out/*.json, the dense-feature arrays in
GM_SCRATCH/ve, the Vision lab's recorded outputs (root src/vision/out) and the root's thumbnails.

window.VE = {probes, nb, textq, res, flops, layer, dense, lab, thumbs, sprite, presets, maeShuffle}
Images are WebP data URIs; byte arrays are base64. Run with the shared venv's Python (numpy, Pillow).
"""
import os, sys, json, base64, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np
from PIL import Image

O = lambda n: json.load(open(os.path.join(OUT, n)))
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
VE = {}
VE["probes"] = O("probes.json")
nb = O("neighbours.json")
VE["nb"] = {"gallery_test_idx": nb["gallery_test_idx"], "labels": nb["labels"], "k": nb["k"], "gallery_p8": nb["gallery_p8"],
            "idx": {w: b64(np.array(v["idx"], np.uint16)) for w, v in nb["nn"].items()},          # [1000, 8] uint16
            "cos": {w: b64(np.clip(np.round(np.array(v["cos"]) * 250), 0, 255).astype(np.uint8)) for w, v in nb["nn"].items()}}  # cos x 250
VE["textq"] = O("textq.json")
VE["flops"] = O("flops.json")
VE["maeShuffle"] = O("mae_shuffle.json")
VE["layer"] = {w: O(f"layerwise_{w}.json") for w in ("clip", "siglip", "dino", "mae") if os.path.exists(os.path.join(OUT, f"layerwise_{w}.json"))}
VE["embed"] = {w: O(f"embed_{w}.json") for w in ("dino", "mae")}
res = O("resolution.json")
q = np.array(res["clip"]["pos448"]["q"]); mn = res["clip"]["pos448"]["min"]
C448 = np.round((mn + q / 255 * (1 - mn)) * 100).astype(int)          # back to cosine x 100, as the lab stores pos_cos
labc = json.load(open(os.path.join(ROOT_SRC, "vision", "out", "analyse_clip.json")))
labs = json.load(open(os.path.join(ROOT_SRC, "vision", "out", "analyse_siglip.json")))
zs = json.load(open(os.path.join(ROOT_SRC, "vision", "out", "zeroshot.json")))
VE["res"] = {w: {"runs": res[w]["runs"], "err": res[w]["error_without_interpolation"], "ps": res[w]["patch_size"]} for w in ("clip", "siglip")}
# only the rows the page's slot buttons use: 224 slots 0, 24, 34 -> 448 slots (2r, 2c)
SL = {s: (2 * (s // 7)) * 14 + 2 * (s % 7) for s in (0, 24, 34)}
VE["res"]["clip"]["pos448"] = {str(s): C448[j].tolist() for s, j in SL.items()}   # cos x 100 (this page)
VE["res"]["clip"]["pos224"] = {str(s): labc["pos_cos"][s] for s in SL}
VE["lab"] = {"keys": labc["keys"], "captions": labc["captions"], "clip_sim16": labc["sim16"],
             "zs_best": {w: [zs[w]["best"], zs[w]["acc"][zs[w]["best"]]] for w in ("clip", "siglip")},
             "lp": {w: zs[w]["linear_probe"] for w in ("clip", "siglip")},
             "params_vision": {"clip": labc["params_vision"], "siglip": labs["params_vision"]}}

# dense features: frames for 8 images x 7 layers (0, 2, ..., 12) for four encoders; last layer for dinoreg;
# norms for all 16 images and five encoders; CLS attention; 16 PCs per patch for the 8 images
PICK = ["p01_cat", "p02_coffee", "p03_rocket", "s01_shapes", "s04_typographic", "g01_bicycle", "g03_lighthouse", "g04_puppy"]
LAY = [0, 2, 4, 6, 8, 10, 12]
FIRST = {"clip": 1, "siglip": 0, "dino": 1, "dinoreg": 5, "mae": 1}
dense = {"pick": PICK, "layers": LAY, "enc": {}}
for w in ("clip", "siglip", "dino", "dinoreg", "mae"):
    d = np.load(big(f"dense_{w}.npz")); keys = [str(k) for k in d["keys"]]; idx = [keys.index(k) for k in PICK]
    s = O(f"dense_{w}.json"); g = s["grid"]
    e = {"grid": g, "var3": np.round(d["var3"][idx][:, LAY], 3).tolist(), "summary": s}
    if w != "dinoreg":
        e["frames"] = b64(d["pca"][idx][:, LAY])                     # [8, 7, P, 3] uint8
    e["last"] = b64(d["pca"][idx][:, -1])                            # [8, P, 3]
    n = d["norms"]; first = FIRST[w]
    n = n.astype(np.float64); pat = n[:, first:]; med = np.median(pat, axis=1, keepdims=True)
    e["normRatio"] = b64(np.clip(np.round(pat / med * 10), 0, 255).astype(np.uint8))   # [16, P], ratio x 10
    e["normMed"] = np.round(med[:, 0], 1).tolist()
    e["clsNorm"] = np.round(n[:, 0], 1).tolist() if s["has_cls"] else None
    e["regNorm"] = np.round(n[:, 1:first], 1).tolist() if first > 1 else None
    if d["att"].ndim == 3 or d["att"].size > 1:
        a = d["att"][idx]; a = a / a.max(1, keepdims=True)
        e["att"] = b64(np.round(a * 255).astype(np.uint8))
    e["pc8"] = b64(d["pc16"][idx][:, :, :8])                          # first 8 of the 16 stored components, int8
    # how well 8 components reproduce the full patch-to-patch cosines (correlation, mean over the 8 images)
    X = d["last_patch"].astype(np.float64)[idx]; cs = []
    for A in X:
        A = A / np.linalg.norm(A, axis=1, keepdims=True); _, _, Vt = np.linalg.svd(A - A.mean(0), full_matrices=False)
        Z = A @ Vt[:8].T; Z = Z / np.linalg.norm(Z, axis=1, keepdims=True); cs.append(np.corrcoef((A @ A.T).ravel(), (Z @ Z.T).ravel())[0, 1])
    e["pc8corr"] = round(float(np.mean(cs)), 3)
    dense["enc"][w] = e
dense["allkeys"] = keys
VE["dense"] = dense


def webp(path_or_im, size, q=80):
    im = path_or_im if isinstance(path_or_im, Image.Image) else Image.open(path_or_im)
    im = im.convert("RGB").resize((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


TI = os.path.join(ROOT_SRC, "data", "test_images")
VE["thumbs"] = {k: webp(os.path.join(TI, k + ".webp"), 128, 66) for k in keys}

# gallery sprite: 1,000 test images, 40 per row, 28 px
xt, yt = load_split("test"); gal = VE["nb"]["gallery_test_idx"]
assert gal == VE["textq"]["gallery_test_idx"]
sp = np.zeros((25 * 28, 40 * 28), np.uint8)
for i, j in enumerate(gal):
    r, c = divmod(i, 40); sp[r * 28:(r + 1) * 28, c * 28:(c + 1) * 28] = xt[j]
b = io.BytesIO(); Image.fromarray(sp).save(b, "WEBP", quality=62, method=6)
VE["sprite"] = "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()

# calculator presets, from the configs in ../inputs/configs (shapes) and the papers (DINOv3)
CF = os.path.join(HERE, "..", "inputs", "configs")
def vc(name):
    d = json.load(open(os.path.join(CF, name))); return d.get("vision_config", d)
P = []
for label, f, R, extra in [("CLIP ViT-B/32 (224)", "openai_clip-vit-base-patch32.json", None, 1),
                           ("CLIP ViT-B/16 (224)", "openai_clip-vit-base-patch16.json", None, 1),
                           ("CLIP ViT-L/14 (224)", "openai_clip-vit-large-patch14.json", None, 1),
                           ("CLIP ViT-L/14-336 (LLaVA-1.5's encoder)", "openai_clip-vit-large-patch14-336.json", None, 1),
                           ("ViT-B/16 (google/vit-base-patch16-224)", "google_vit-base-patch16-224.json", None, 1),
                           ("MAE ViT-B/16 (224)", "facebook_vit-mae-base.json", None, 1),
                           ("SigLIP So400m/14 (384)", "google_siglip-so400m-patch14-384.json", None, 0),
                           ("SigLIP 2 So400m/16 (512)", "google_siglip2-so400m-patch16-512.json", None, 0),
                           ("SmolVLM-500M vision tower (one 512 tile)", "HuggingFaceTB_SmolVLM-500M-Instruct.json", None, 0)]:
    v = vc(f)
    P.append({"label": label, "R": R or v.get("image_size", 224), "P": v.get("patch_size", 16), "D": v.get("hidden_size", 768),
              "L": v.get("num_hidden_layers", 12), "F": v.get("intermediate_size", 3072), "glu": False, "extra": extra, "src": f})
P.insert(1, {"label": "SigLIP 2 B/16 (224, this page)", "R": 224, "P": 16, "D": 768, "L": 12, "F": 3072, "glu": False, "extra": 0,
             "src": "google_siglip2-base-patch16-224.json (SiglipVisionConfig defaults)"})
for label, f, R, extra in [("DINOv2 ViT-S/14 (518)", "facebook_dinov2-small.json", 518, 1), ("DINOv2 ViT-B/14 (518)", "facebook_dinov2-base.json", 518, 1),
                           ("DINOv2 ViT-B/14 (224, processor crop)", "facebook_dinov2-base.json", 224, 1),
                           ("DINOv2 ViT-B/14 + 4 registers (224)", "facebook_dinov2-with-registers-base.json", 224, 5),
                           ("DINOv2 ViT-L/14 (518)", "facebook_dinov2-large.json", 518, 1), ("DINOv2 ViT-g/14 (518)", "facebook_dinov2-giant.json", 518, 1)]:
    v = vc(f); D = v["hidden_size"]
    glu = bool(v.get("use_swiglu_ffn"))
    F = int(D * v["mlp_ratio"])
    if glu:   # transformers Dinov2SwiGLUFFN: two thirds of the hidden size, rounded up to a multiple of 8, three matrices
        F = (int(F * 2 / 3) + 7) // 8 * 8
    P.append({"label": label, "R": R, "P": v["patch_size"], "D": D, "L": v["num_hidden_layers"], "F": F, "glu": glu, "extra": extra, "src": f})
P.append({"label": "DINOv3 ViT-7B/16 (256)", "R": 256, "P": 16, "D": 4096, "L": 40, "F": 8192, "glu": True, "extra": 5,
          "src": "DINOv3 paper Table 2 (the config is gated): 40 blocks, width 4096, SwiGLU hidden 8192, patch 16, 4 registers, RoPE"})
VE["presets"] = P
js = "window.VE=" + json.dumps(VE, separators=(",", ":")) + ";\n"
p = os.path.join(HERE, "..", "parts", "20_js_ve_0data.js")
open(p, "w").write(js)
print("wrote", p, len(js), "bytes; sprite", len(VE["sprite"]), "thumbs", sum(len(v) for v in VE["thumbs"].values()),
      "dense", len(json.dumps(VE["dense"])))
