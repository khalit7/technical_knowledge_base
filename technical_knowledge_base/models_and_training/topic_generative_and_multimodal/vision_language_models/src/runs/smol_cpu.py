"""SmolVLM-500M on the CPU only (no GPU lock): what the processor hands the model, and the vision encoder's token norms.

  saw      for 4 images x 3 settings: the views (decoded pixel values as small WebP), the resized size, rows and
           columns, and the prompt as segments (text, tags, image runs) with their 1-D positions -> out/smol_saw.json
  norms    the vision encoder (float32 on CPU) on the 16 colour test images at the default setting (17 views each)
           and on the 4 viewer images: per-patch L2 norm of the last block's output before the final LayerNorm
           (hidden_states[-1]), its ratio to the view's median, where the high-norm patches sit, whether they
           survive the final LayerNorm, pixel shuffle and projector                            -> out/smol_norms.json
"""
import base64, io, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vm_env import *  # noqa
import numpy as np
import torch
from PIL import Image

cap_threads(4)
PH = sys.argv[1:] or ["saw", "norms"]
proc = smol_processor()
IMG_ID = 49190
SETTINGS = {"default (N=4)": {}, "N=2": {"size": {"longest_edge": 1024}}, "no splitting": {"do_image_splitting": False}}
SEE = [("p01_cat", None), ("chelsea_native", "see"), ("rocket_native", "see"), ("receipt_tall", "see")]


def load(key, sub):
    if sub is None:
        return {k: im for k, im, _ in pretrained.test_images()}[key]
    return Image.open(big("inputs", sub, key + ".png")).convert("RGB")


def view_uri(pv, side=96):
    a = ((pv.float().permute(1, 2, 0).numpy() * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)
    im = Image.fromarray(a).resize((side, side), Image.LANCZOS); b = io.BytesIO(); im.save(b, "WEBP", quality=72)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def segments(ids):
    tok = proc.tokenizer; segs = []; i = 0; n = len(ids); view = 0
    while i < n:
        if ids[i] == IMG_ID:
            j = i
            while j < n and ids[j] == IMG_ID: j += 1
            segs.append({"k": "img", "s": i, "n": j - i, "view": view}); view += 1; i = j; continue
        j = i
        while j < n and ids[j] != IMG_ID: j += 1
        text = tok.decode(ids[i:j])
        segs.append({"k": "txt", "s": i, "n": j - i, "t": text}); i = j
    return segs


def inputs(img, kw):
    return proc(text=chat(proc, "Describe this image in one sentence."), images=[img], return_tensors="pt", **kw)


if "saw" in PH:
    R = {"model": pretrained.VLM[0], "revision": pretrained.VLM[1], "question": "Describe this image in one sentence.", "images": []}
    for key, sub in SEE:
        img = load(key, sub); rec = {"key": key, "w": img.width, "h": img.height, "settings": []}
        for name, kw in SETTINGS.items():
            out = inputs(img, kw)
            info = proc.image_processor([img], return_row_col_info=True, return_tensors="pt", **kw)
            rows, cols = int(info["rows"][0][0]), int(info["cols"][0][0])
            pv = out["pixel_values"][0]; ids = out["input_ids"][0].tolist()
            rec["settings"].append({"name": name, "rows": rows, "cols": cols, "views": int(pv.shape[0]),
                                    "resized": [rows * 512, cols * 512] if rows else [512, 512],
                                    "image_tokens": int(sum(1 for t in ids if t == IMG_ID)), "prompt_tokens": len(ids),
                                    "thumbs": [view_uri(pv[v]) for v in range(pv.shape[0])], "segments": segments(ids)})
            log(key, name, rows, cols, pv.shape[0], len(ids))
        R["images"].append(rec)
    dump("smol_saw.json", R)

if "norms" in PH:
    from transformers import AutoModelForImageTextToText
    m = AutoModelForImageTextToText.from_pretrained(pretrained.VLM[0], revision=pretrained.VLM[1], dtype=torch.bfloat16)
    vis = m.model.vision_model.float().eval(); con = m.model.connector.float().eval(); sf = m.config.scale_factor
    del m.model.text_model, m.lm_head; empty_cache()

    def run(img, kw=None):
        pv = inputs(img, kw or {})["pixel_values"][0].float()
        rows = []
        with torch.no_grad():
            for v in range(pv.shape[0]):
                o = vis(pixel_values=pv[v:v + 1], output_hidden_states=True)
                pre = o.hidden_states[-1][0].norm(dim=-1)            # [1024] before post_layernorm
                post = o.last_hidden_state[0].norm(dim=-1)           # what the connector reads
                proj = con(o.last_hidden_state)[0].norm(dim=-1)      # [64] projected image tokens
                rows.append((pre.numpy(), post.numpy(), proj.numpy()))
        return rows

    R = {"model": pretrained.VLM[0], "revision": pretrained.VLM[1], "dtype": "float32 on CPU (weights stored bf16)",
         "what": "L2 norm per patch of the last encoder block's output before the final LayerNorm; ratio = norm / median of that view",
         "threshold": 5.0, "test16": [], "position_counts": {}, "viewer": []}
    pos = {}
    for key, img, _ in pretrained.test_images():
        rows = run(img); rec = {"key": key, "views": []}
        for v, (pre, post, proj) in enumerate(rows):
            med = float(np.median(pre)); ratio = pre / med
            hi = np.where(ratio > R["threshold"])[0]
            kind = "global" if v == len(rows) - 1 else "tile"
            for h in hi:
                k = f"{kind}:{h // 32},{h % 32}"; pos[k] = pos.get(k, 0) + 1
            # do outliers survive? post-LN ratio at the same patches; the projected token holding each patch
            tok = [(int(h // 32) // sf) * (32 // sf) + int(h % 32) // sf for h in hi]
            pmed = float(np.median(proj))
            rec["views"].append({"v": v, "kind": kind, "max_ratio": round(float(ratio.max()), 2),
                                 "hi": [[int(h // 32), int(h % 32), round(float(ratio[h]), 1),
                                         round(float(post[h] / np.median(post)), 2), round(float(proj[t] / pmed), 2)] for h, t in zip(hi, tok)],
                                 "median_pre": round(med, 2), "median_post": round(float(np.median(post)), 2),
                                 "proj_max_ratio": round(float(proj.max() / pmed), 2)})
        R["test16"].append(rec); log("norms", key, max(x["max_ratio"] for x in rec["views"]))
    R["position_counts"] = dict(sorted(pos.items(), key=lambda kv: -kv[1]))
    for key, sub in SEE:
        img = load(key, sub)
        for name, kw in SETTINGS.items():
            rows = run(img, kw)
            # per view, the max patch ratio inside each of the 64 projected tokens (8 x 8), and the token norm ratio
            maps = []
            for pre, post, proj in rows:
                r = (pre / np.median(pre)).reshape(8, sf, 8, sf).max(axis=(1, 3)).reshape(-1)
                maps.append({"patch_ratio": [round(float(x), 1) for x in r], "token_ratio": [round(float(x), 2) for x in proj / np.median(proj)]})
            R["viewer"].append({"key": key, "setting": name, "maps": maps})
        log("viewer norms", key)
    dump("smol_norms.json", R)
