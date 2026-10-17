"""Everything the Vision lab shows about one model, computed on CPU (float32, 4 threads).

Usage: python -I analyse.py clip|siglip
Writes out/analyse_<which>.json:
  - the 16 colour test images against their 16 captions (cosines), logit scale and bias
  - the probe images (probes.json) against their competing captions
  - patch view: the processor's input size, patch grid, the check that "cut into patches, flatten, multiply by one
    matrix" equals the model's Conv2d patch embedding, the learned position-embedding cosine matrix, the first 24
    numbers of each patch token for five images, and where the pooled output looks (last-layer attention from
    CLIP's [CLS] token; SigLIP's attention-pooling probe), averaged over heads
and GM_SCRATCH/vision/text_<which>.npz: unit text embeddings of every Fashion-MNIST prompt set, exactly as written
(no lowercasing, so the official capitalised names show what the transformers processor alone does to SigLIP 2).
Captions and probe texts are lowercased for SigLIP 2 (vs_env.embed_text), as big_vision does.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vs_env import *
import numpy as np, torch
from PIL import Image

cap_threads(4)
which = sys.argv[1]
r = {"which": which, "model": list(pretrained.CLIP if which == "clip" else pretrained.SIGLIP), "machine": MACHINE,
     "date": time.strftime("%Y-%m-%d"), "device": "cpu", "dtype": "float32"}
model, proc = load(which, "cpu")
r["params"] = sum(p.numel() for p in model.parameters())
r["params_vision"] = sum(p.numel() for p in model.vision_model.parameters())
r["params_text"] = sum(p.numel() for p in model.text_model.parameters())
r["logit_scale"] = round(float(model.logit_scale.exp()), 3)
if hasattr(model, "logit_bias"):
    r["logit_bias"] = round(float(model.logit_bias), 3)

# ---------------- 16 test images x 16 captions
ti = pretrained.test_images()
keys = [k for k, _, _ in ti]; caps = [it["caption"] for _, _, it in ti]
t0 = time.time(); ie = embed_images(model, proc, [im for _, im, _ in ti], bs=16); r["embed16_img_seconds"] = round(time.time() - t0, 2)
t0 = time.time(); te = embed_text(model, proc, which, caps); r["embed16_txt_seconds"] = round(time.time() - t0, 2)
r["keys"] = keys; r["captions"] = caps
r["sim16"] = np.round(ie @ te.T, 4).tolist()
if which == "siglip":   # the same captions with their capitals kept, as the transformers processor alone would give
    r["sim16_cased"] = np.round(ie @ embed_text(model, proc, which, caps, lower=False).T, 4).tolist()

# ---------------- probes
import json
P = json.load(open(os.path.join(HERE, "probes.json")))
pr = {}
for name, p in P.items():
    ims = [Image.open(big("probes", k + ".png")).convert("RGB") for k in p["images"]]
    a = embed_images(model, proc, ims, bs=16); b = embed_text(model, proc, which, p["texts"])
    pr[name] = np.round(a @ b.T, 4).tolist()
# the typographic texts against the plain cat (p01) and s04, from the test set embeddings, for cross-checking smoke/clip.json
b = embed_text(model, proc, which, P["typo"]["texts"])
r["typo_check_p01_s04"] = np.round(ie[[keys.index("p01_cat"), keys.index("s04_typographic")]] @ b.T, 4).tolist()
r["probes"] = pr

# ---------------- Fashion-MNIST prompt sets
NAMES = {"official": CLASSES, "official_lower": [c.lower() for c in CLASSES],
         "plain": ["t-shirt", "trousers", "pullover", "dress", "coat", "sandal", "shirt", "sneaker", "bag", "ankle boot"]}
TEMPL = {"bare": "{}", "photo": "a photo of a {}.", "bw": "a black and white photo of a {}.",
         "lowres": "a low resolution photo of a {}.", "clothing": "a photo of a {}, a type of clothing."}
arr = {}
for nk, names in NAMES.items():
    for tk, tpl in TEMPL.items():
        arr[f"{nk}|{tk}"] = embed_text(model, proc, which, [tpl.format(n) for n in names], lower=False)   # as written
    m = np.mean([arr[f"{nk}|{tk}"] for tk in TEMPL], 0); arr[f"{nk}|ensemble"] = m / np.linalg.norm(m, axis=1, keepdims=True)
np.savez(big(f"text_{which}.npz"), **arr)
r["prompt_sets"] = {"names": NAMES, "templates": TEMPL}

# ---------------- patch view
vm = model.vision_model; emb = vm.embeddings
ps = emb.patch_size if hasattr(emb, "patch_size") else model.config.vision_config.patch_size
pick = ["p01_cat", "s04_typographic", "s02_left_right", "g05_stopsign"]
x, y = load_split("test")
ims = [ti[keys.index(k)][1] for k in pick] + [Image.fromarray(x[0]).convert("RGB")]   # test image 0: class y[0]
r["patch_images"] = pick + [f"fmnist_test0_{CLASSES[y[0]]}"]
pv = proc(images=ims, return_tensors="pt")["pixel_values"]
r["input_shape"] = list(pv.shape); r["patch_size"] = ps
g = pv.shape[-1] // ps; r["grid"] = g
with torch.no_grad():
    conv = emb.patch_embedding(pv).flatten(2).transpose(1, 2)                  # [B, g*g, D] the model's own way
    cols = torch.nn.functional.unfold(pv, kernel_size=ps, stride=ps).transpose(1, 2)   # [B, g*g, 3*ps*ps]
    W = emb.patch_embedding.weight.reshape(emb.patch_embedding.weight.shape[0], -1)
    mm = cols @ W.T + (emb.patch_embedding.bias if emb.patch_embedding.bias is not None else 0)
    r["patch_check"] = {"numbers_per_patch": int(cols.shape[-1]), "width": int(W.shape[0]),
                        "max_abs_diff_unfold_matmul_vs_conv": float((mm - conv).abs().max()),
                        "conv_has_bias": emb.patch_embedding.bias is not None,
                        "patch_embedding_params": int(sum(p.numel() for p in emb.patch_embedding.parameters()))}
    pos = emb.position_embedding.weight                                          # CLIP: [1 + g*g, D] incl. [CLS]
    pp = pos[1:] if which == "clip" else pos
    pn = torch.nn.functional.normalize(pp, dim=-1)
    r["pos_cos"] = np.round((pn @ pn.T).numpy() * 100).astype(int).tolist()
    r["pos_shape"] = list(pos.shape)
    r["tokens24"] = np.round(conv[:, :, :24].numpy(), 3).tolist()
    r["token_norm"] = np.round(conv.norm(dim=-1).numpy(), 2).tolist()
    # where the pooled output looks
    att = []
    pv16 = proc(images=[im for _, im, _ in ti] + ims[-1:], return_tensors="pt")["pixel_values"]
    if which == "clip":
        model.set_attn_implementation("eager")
        o = vm(pixel_values=pv16, output_attentions=True)
        a = o.attentions[-1][:, :, 0, 1:].mean(1)                              # [B, 49] from [CLS], mean over heads
        r["pool"] = "last-layer attention from the [CLS] token, mean over 12 heads"
    else:
        o = vm(pixel_values=pv16)
        h = o.last_hidden_state; head = vm.head
        q = head.probe.repeat(h.shape[0], 1, 1)
        a = head.attention(q, h, h, need_weights=True, average_attn_weights=True)[1][:, 0]   # [B, 196]
        r["pool"] = "attention-pooling (MAP) head: weights of its learned probe over the patch tokens, mean over heads"
    r["pool_keys"] = keys + ["fmnist_test0"]
    r["pool_att"] = np.round(a.numpy(), 4).tolist()
dump(f"analyse_{which}.json", r)
