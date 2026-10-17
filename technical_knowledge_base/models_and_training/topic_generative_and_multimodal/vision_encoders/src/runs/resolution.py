"""Changing the input resolution of a trained ViT: CLIP B/32 and SigLIP 2 B/16 at 224, 336 and 448 pixels, CPU float32.

For each model and resolution, the 16 colour test images go through the model's own processor at that size and
get_image_features(..., interpolate_pos_encoding=True) (the learned position table is resized bicubically to the
new grid, transformers' interpolate_pos_encoding). Recorded:
  - tokens, seconds for the 16 images
  - images matched to their own caption (of 16; SigLIP text lowercased as in the Vision lab)
  - mean cosine of each image embedding to the same image's 224-pixel embedding
  - the matching-pair cosine mean and the best-other-caption margin
  - the exact error raised when interpolate_pos_encoding is left False at 336 pixels
  - CLIP's interpolated position table at 448 (14 x 14 grid): its 196 x 196 cosine matrix, quantised to 0..255
Writes ../out/resolution.json.
"""
import os, sys, time, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np, torch

cap_threads(4)
R = {"date": time.strftime("%Y-%m-%d"), "machine": MACHINE, "device": "cpu", "dtype": "float32"}
ti = pretrained.test_images()
keys = [k for k, _, _ in ti]; caps = [it["caption"] for _, _, it in ti]; ims = [im for _, im, _ in ti]
for which in ("clip", "siglip"):
    model, proc = vs_env.load(which, "cpu")
    te = vs_env.embed_text(model, proc, which, caps)
    ps = model.config.vision_config.patch_size
    out = {"patch_size": ps, "runs": {}}; base = None
    for res in (224, 336, 448):
        size = {"shortest_edge": res} if which == "clip" else {"height": res, "width": res}
        kw = {"size": size}
        if which == "clip":
            kw["crop_size"] = {"height": res, "width": res}
        pv = proc.image_processor(images=ims, return_tensors="pt", **kw)["pixel_values"]
        t0 = time.time()
        with torch.no_grad():
            e = model.get_image_features(pixel_values=pv, interpolate_pos_encoding=True)
        e = getattr(e, "pooler_output", e)
        sec = time.time() - t0
        e = torch.nn.functional.normalize(e.float(), dim=-1).numpy()
        if base is None:
            base = e
        S = e @ te.T
        diag = np.diag(S); off = S.copy(); np.fill_diagonal(off, -9)
        out["runs"][str(res)] = {"input": list(pv.shape), "tokens": (res // ps) ** 2, "seconds16": round(sec, 2),
                                 "matched": int((S.argmax(1) == np.arange(16)).sum()),
                                 "missed": [keys[i] for i in np.where(S.argmax(1) != np.arange(16))[0]],
                                 "cos_to_224": round(float((e * base).sum(1).mean()), 4),
                                 "cos_to_224_min": round(float((e * base).sum(1).min()), 4),
                                 "pair_cos_mean": round(float(diag.mean()), 4),
                                 "margin_mean": round(float((diag - off.max(1)).mean()), 4)}
        print(which, res, out["runs"][str(res)], flush=True)
    pv = proc.image_processor(images=ims[:1], return_tensors="pt",
                              **({"size": {"shortest_edge": 336}, "crop_size": {"height": 336, "width": 336}} if which == "clip"
                                 else {"size": {"height": 336, "width": 336}}))["pixel_values"]
    try:
        with torch.no_grad():
            model.get_image_features(pixel_values=pv)
        out["error_without_interpolation"] = None
    except Exception as ex:
        out["error_without_interpolation"] = f"{type(ex).__name__}: {str(ex).strip().splitlines()[0][:300]}"
    print(which, "error:", out["error_without_interpolation"], flush=True)
    if which == "clip":
        emb = model.vision_model.embeddings
        with torch.no_grad():
            dummy = torch.zeros(1, 1 + 14 * 14, emb.embed_dim)
            pos = emb.interpolate_pos_encoding(dummy, 448, 448)[0, 1:]
        p = torch.nn.functional.normalize(pos, dim=-1); C = (p @ p.T).numpy()
        out["pos448"] = {"grid": 14, "min": round(float(C.min()), 4),
                         "q": np.clip(np.round((C - C.min()) / (1 - C.min()) * 255), 0, 255).astype(int).tolist()}
    R[which] = out
    del model
dump("resolution.json", R)
