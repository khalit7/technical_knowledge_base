"""Patch-level (dense) features of the 16 colour test images through five encoders, every layer, CPU float32.

Encoders: clip (CLIP ViT-B/32), siglip (SigLIP 2 B/16), dino (DINOv2 B/14), dinoreg (DINOv2 B/14 with 4 registers),
mae (MAE ViT-B/16, mask_ratio 0 and a fixed increasing noise so the patch order is not shuffled).
Each image goes through the model's own processor (all test images are 512x512 squares, so centre crops cut nothing).

For every encoder, image and layer (0 = after the patch embedding and positions, L = last block, before any final
LayerNorm), from the patch tokens only ([CLS] and registers removed):
  pca  : the top 3 principal components of that layer's patch tokens (fitted without high-norm outliers), signs aligned to the layer above so colours
         do not flip from one layer to the next, scaled to 0..255 per component (2nd to 98th percentile)
  var3 : share of the variance the 3 components carry
Last layer only: the L2 norm of every token (patches, [CLS], registers) for the high-norm (register) lesson, the
[CLS] attention over patches averaged over heads (eager attention), and 16 principal components per patch (int8)
so the page can recompute patch-to-patch cosine similarity approximately.
Writes GM_SCRATCH/ve/dense_<which>.npz and ../out/dense_<which>.json (small summary).
Usage: python -I dense.py clip|siglip|dino|dinoreg|mae
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ve_env import *
import numpy as np, torch

cap_threads(4)
which = sys.argv[1]
t0 = time.time()
if which in ("clip", "siglip"):
    model, proc = vs_env.load(which, "cpu")
    model.set_attn_implementation("eager")
    vm = model.vision_model
    improc = proc.image_processor
    nreg, has_cls = 0, which == "clip"
else:
    model, improc = load_ssl(which)
    model.set_attn_implementation("eager")
    vm = model
    nreg, has_cls = getattr(model.config, "num_register_tokens", 0) or 0, True
print(which, "loaded", round(time.time() - t0, 1), "s", flush=True)

ti = pretrained.test_images()
keys = [k for k, _, _ in ti]
pv = improc(images=[im for _, im, _ in ti], return_tensors="pt")["pixel_values"]
kw = {}
if which == "mae":
    L = (pv.shape[-1] // model.config.patch_size) ** 2
    kw["noise"] = torch.arange(L, dtype=torch.float32).expand(pv.shape[0], L).clone()   # argsort = identity: no shuffle
with torch.no_grad():
    o = vm(pixel_values=pv, output_hidden_states=True, output_attentions=True, **kw)
if which == "mae":
    assert (o.ids_restore == torch.arange(L)).all(), "MAE patch order was shuffled"
hs = o.hidden_states                     # tuple: embeddings output, then one per block
first = (1 if has_cls else 0) + nreg     # SigLIP has no [CLS]; DINOv2 with registers: [CLS], 4 registers, patches
n_layers = len(hs) - 1
P = hs[0].shape[1] - first; g = int(round(P ** 0.5)); assert g * g == P
print(which, "input", list(pv.shape), "grid", g, "layers", n_layers, flush=True)


def pca3(X, k=3):
    # fit on the ordinary tokens only: a token with more than 3x the median norm (a high-norm outlier, section 1 of
    # the page) would otherwise take a whole component to itself; all tokens are then projected
    nrm = np.linalg.norm(X, axis=1); keep = nrm <= 3 * np.median(nrm)
    mu = X[keep].mean(0)
    U, S, Vt = np.linalg.svd(X[keep] - mu, full_matrices=False)
    var = (S ** 2) / (S ** 2).sum()
    return (X - mu) @ Vt[:k].T, float(var[:k].sum()), Vt


pca = np.zeros((len(keys), n_layers + 1, P, 3), np.uint8); var3 = np.zeros((len(keys), n_layers + 1))
for i in range(len(keys)):
    prev = None
    for l in range(n_layers, -1, -1):                     # last layer first, then align signs downwards
        X = hs[l][i, first:].numpy().astype(np.float64)
        Z, v, _ = pca3(X); var3[i, l] = v
        if prev is not None:
            for c in range(3):
                if np.corrcoef(Z[:, c], prev[:, c])[0, 1] < 0:
                    Z[:, c] *= -1
        prev = Z
        lo = np.percentile(Z, 2, axis=0); hi = np.percentile(Z, 98, axis=0)
        pca[i, l] = np.clip((Z - lo) / (hi - lo + 1e-9) * 255, 0, 255).astype(np.uint8)

last = hs[-1].numpy()
norms = np.linalg.norm(last, axis=-1)                    # [images, tokens] before any final LayerNorm
att = None
if has_cls and o.attentions is not None:
    a = o.attentions[-1].mean(1)                         # [images, tokens, tokens], heads averaged
    att = a[:, 0, first:].numpy()
pc16 = np.zeros((len(keys), P, 16), np.int8); pc16_scale = np.zeros(len(keys))
for i in range(len(keys)):
    X = last[i, first:].astype(np.float64); X = X / np.linalg.norm(X, axis=1, keepdims=True)
    Xc = X - X.mean(0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    Z = X @ Vt[:16].T                                   # projections of the unit vectors (mean kept: cosines stay comparable)
    s = np.abs(Z).max() / 127; pc16[i] = np.round(Z / s).astype(np.int8); pc16_scale[i] = s
np.savez(big(f"dense_{which}.npz"), pca=pca, var3=var3, norms=norms, att=att if att is not None else np.zeros(1),
         pc16=pc16, pc16_scale=pc16_scale, keys=np.array(keys), last_patch=last[:, first:].astype(np.float16))
pat_norm = norms[:, first:]
summ = {"which": which, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "device": "cpu", "dtype": "float32",
        "input_shape": list(pv.shape), "grid": g, "patch_tokens": P, "layers": n_layers, "registers": nreg, "has_cls": has_cls,
        "keys": keys, "var3_last_mean": round(float(var3[:, -1].mean()), 3),
        "patch_norm_median": round(float(np.median(pat_norm)), 2), "patch_norm_max": round(float(pat_norm.max()), 2),
        "share_patches_over_3x_median": round(float((pat_norm > 3 * np.median(pat_norm, axis=1, keepdims=True)).mean()), 4),
        "cls_norm_median": round(float(np.median(norms[:, 0])), 2) if has_cls else None,
        "reg_norm_median": round(float(np.median(norms[:, 1:1 + nreg])), 2) if nreg else None,
        "seconds": round(time.time() - t0, 1)}
print(summ, flush=True)
dump(f"dense_{which}.json", summ)
