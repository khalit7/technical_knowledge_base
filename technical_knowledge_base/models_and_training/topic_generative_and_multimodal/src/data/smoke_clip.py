"""Smoke test of the two contrastive image-text models (CLIP ViT-B/32 and SigLIP 2 base) on MPS.

Run under the bench lock, one model per process: GM_SCRATCH=... nice -n 15 python -I smoke_clip.py clip|siglip
Writes smoke/clip.json or smoke/siglip.json: load time, time to embed 16 images and 16 captions,
peak memory, and the 16x16 image-caption similarity (the diagonal should win).
"""
import json, os, sys, time

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import cap_threads, device, PeakMem, sync, MACHINE
from pretrained import load_clip, load_siglip, test_images, CLIP, SIGLIP

cap_threads(4)
which = sys.argv[1]
dev = device("mps")
imgs = test_images()
keys = [k for k, _, _ in imgs]
texts = [it["caption"] for _, _, it in imgs]
res = {"which": which, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "dtype": "float16"}
with PeakMem() as pm:
    t = time.time()
    model, proc = (load_clip if which == "clip" else load_siglip)(dev)
    sync(dev); res["load_seconds"] = round(time.time() - t, 1)
    res["model"], res["revision"] = (CLIP if which == "clip" else SIGLIP)
    res["params"] = sum(p.numel() for p in model.parameters())
    kw = {"padding": "max_length", "max_length": 64} if which == "siglip" else {"padding": True}
    with torch.no_grad():
        for rep in range(2):                      # first pass includes MPS kernel warm-up
            sync(dev); t = time.time()
            ii = proc(images=[im for _, im, _ in imgs], return_tensors="pt").to(dev)
            ti = proc(text=texts, return_tensors="pt", **kw).to(dev)
            ie = model.get_image_features(pixel_values=ii["pixel_values"].half())
            te = model.get_text_features(**{k: v for k, v in ti.items()})
            ie = getattr(ie, "pooler_output", ie); te = getattr(te, "pooler_output", te)
            ie = torch.nn.functional.normalize(ie.float(), dim=-1); te = torch.nn.functional.normalize(te.float(), dim=-1)
            sync(dev); res[f"embed16_seconds_pass{rep + 1}"] = round(time.time() - t, 3)
    sim = (ie @ te.T).cpu().numpy()
    res["embed_dim"] = int(ie.shape[1])
    res["pixel_values_shape"] = list(ii["pixel_values"].shape)
    res["text_tokens_shape"] = list(ti["input_ids"].shape)
    res["logit_scale"] = round(float(model.logit_scale.exp()), 3)
    if hasattr(model, "logit_bias"):
        res["logit_bias"] = round(float(model.logit_bias), 3)
    res["top1_image_to_caption"] = round(float((sim.argmax(1) == np.arange(len(keys))).mean()), 4)
    res["diag_mean_cos"] = round(float(np.diag(sim).mean()), 4)
    res["offdiag_mean_cos"] = round(float((sim.sum() - np.trace(sim)) / (sim.size - len(keys))), 4)
    # the typographic-attack image: is it closer to "a photo of a cat" or "a photo of a dog"?
    with torch.no_grad():
        tt = proc(text=["a photo of a cat", "a photo of a dog"], return_tensors="pt", **kw).to(dev)
        tf = model.get_text_features(**tt); tf = getattr(tf, "pooler_output", tf)
        tf = torch.nn.functional.normalize(tf.float(), dim=-1).cpu().numpy()
    simcd = ie.cpu().numpy() @ tf.T
    res["cat_vs_dog_cos"] = {k: [round(float(a), 4) for a in simcd[keys.index(k)]] for k in ("p01_cat", "s04_typographic")}
res["peak_mps_mb"], res["max_rss_mb"] = pm.peak_mb, pm.rss_mb
res["keys"] = keys
res["sim"] = [[round(float(v), 4) for v in row] for row in sim]
json.dump(res, open(os.path.join(HERE, "smoke", f"{which}.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("sim", "keys")}), flush=True)
