"""CLIPScore of the 64 Stable Diffusion images, CPU float32 (no GPU, no lock needed).

    python -I ev_clipscore.py
For each image and its prompt:
  cs      CLIP-S = 2.5 * max(cos, 0) with openai/clip-vit-base-patch32 (Hessel et al. 2021, Eq. 1), prompt as written
  cs_pre  the same with Hessel's caption prefix "A photo depicts " (their reference implementation prefixes captions)
  cl      cosine with openai/clip-vit-large-patch14-336 (the CMMD model); 100 * cl is the "CLIP score" scale many
          text-to-image papers report
Also the cosine of every image with every prompt (8 x 64), to show how far the right prompt stands out.
Images are fed at 512 x 512 through each model's own processor. Writes out/clipscore.json.
"""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ev_env import ev_scratch, dump, OUT
import json
import numpy as np
import torch
from PIL import Image
from common import cap_threads, MACHINE
import pretrained

cap_threads(4)
torch.set_grad_enabled(False)
gen = json.load(open(os.path.join(OUT, "sd_gen.json")))
names = [r["name"] for r in gen["images"]]
keys = list(gen["prompts"])
ims = [Image.open(ev_scratch("sd", n + ".png")).convert("RGB") for n in names]
CLIPL = ("openai/clip-vit-large-patch14-336", "ce19dc912ca5cd21c8a653c79e251e808ccabcd1")


def embed(model, proc, texts):
    ie = []
    for i in range(0, len(ims), 16):
        o = model.get_image_features(**proc(images=ims[i:i + 16], return_tensors="pt"))
        ie.append(getattr(o, "pooler_output", o))              # transformers 5: an output object whose pooler_output is the projection
    ie = torch.cat(ie); te = model.get_text_features(**proc(text=texts, return_tensors="pt", padding=True))
    ie = getattr(ie, "pooler_output", ie); te = getattr(te, "pooler_output", te)
    return torch.nn.functional.normalize(ie.float(), dim=-1), torch.nn.functional.normalize(te.float(), dim=-1)


res = {"machine": MACHINE, "date": time.strftime("%Y-%m-%d"), "device": "cpu", "dtype": "float32", "prompt_keys": keys, "images": {}}
t0 = time.time()
from transformers import CLIPModel, CLIPProcessor
m, p = CLIPModel.from_pretrained(pretrained.CLIP[0], revision=pretrained.CLIP[1], dtype=torch.float32).eval(), \
    CLIPProcessor.from_pretrained(pretrained.CLIP[0], revision=pretrained.CLIP[1])
iB, tB = embed(m, p, [gen["prompts"][k] for k in keys])
_, tBp = embed(m, p, ["A photo depicts " + gen["prompts"][k] for k in keys])
del m
m, p = CLIPModel.from_pretrained(CLIPL[0], revision=CLIPL[1], dtype=torch.float32).eval(), CLIPProcessor.from_pretrained(CLIPL[0], revision=CLIPL[1])
iL, tL = embed(m, p, [gen["prompts"][k] for k in keys])
res["models"] = {"B32": list(pretrained.CLIP), "L14_336": list(CLIPL)}
cosB = (iB @ tB.T).numpy(); cosBp = (iB @ tBp.T).numpy(); cosL = (iL @ tL.T).numpy()
for i, (n, r) in enumerate(zip(names, gen["images"])):
    j = keys.index(r["key"])
    res["images"][n] = {"cs": round(2.5 * max(float(cosB[i, j]), 0), 4), "cs_pre": round(2.5 * max(float(cosBp[i, j]), 0), 4),
                        "cl": round(float(cosL[i, j]), 4),
                        "cosB_all": [round(float(v), 4) for v in cosB[i]], "cosL_all": [round(float(v), 4) for v in cosL[i]]}
res["seconds"] = round(time.time() - t0, 1)
dump("clipscore.json", res)
