"""Smoke test of the small open VLM (SmolVLM-500M-Instruct, bfloat16, MPS): one caption, one counting
question, the exact prompt the processor builds and how many image tokens one 512x512 image becomes.

Run under the bench lock: GM_SCRATCH=... nice -n 15 python -I smoke_vlm.py
Writes smoke/vlm.json.
"""
import json, os, sys, time

import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import cap_threads, device, PeakMem, sync, MACHINE
from pretrained import load_vlm, test_images, VLM

cap_threads(4)
dev = device("mps")
imgs = {k: (im, it) for k, im, it in test_images()}
res = {"model": VLM[0], "revision": VLM[1], "dtype": "bfloat16", "machine": MACHINE, "date": time.strftime("%Y-%m-%d"),
       "decoding": "greedy (do_sample=False), max_new_tokens=60"}


def ask(model, proc, key, question):
    msgs = [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": question}]}]
    prompt = proc.apply_chat_template(msgs, add_generation_prompt=True)
    inp = proc(text=prompt, images=[imgs[key][0]], return_tensors="pt").to(dev)
    sync(dev); t = time.time()
    with torch.no_grad():
        out = model.generate(**inp, do_sample=False, max_new_tokens=60)
    sync(dev); dt = time.time() - t
    new = out[0, inp["input_ids"].shape[1]:]
    image_token_id = proc.tokenizer.convert_tokens_to_ids("<image>")
    return {"image": key, "question": question,
            "answer": proc.decode(new, skip_special_tokens=True).strip(),
            "seconds": round(dt, 2), "new_tokens": int(len(new)),
            "prompt_tokens": int(inp["input_ids"].shape[1]),
            "image_tokens": int((inp["input_ids"] == image_token_id).sum()),
            "pixel_values_shape": list(inp["pixel_values"].shape)}, prompt


with PeakMem() as pm:
    t = time.time(); model, proc = load_vlm(dev); sync(dev); res["load_seconds"] = round(time.time() - t, 1)
    res["params"] = sum(p.numel() for p in model.parameters())
    qa = []
    r, prompt = ask(model, proc, "p01_cat", "Describe this image in one sentence."); qa.append(r)
    res["prompt_text_with_placeholders_head"] = prompt[:300]
    qa.append(ask(model, proc, "p01_cat", "Describe this image in one sentence.")[0])      # second run: warm
    qa.append(ask(model, proc, "s01_shapes", "How many red circles are in this image? Answer with a number.")[0])
    qa.append(ask(model, proc, "s04_typographic", "What animal is in this image?")[0])
    res["qa"] = qa
    res["image_processor"] = {k: v for k, v in proc.image_processor.to_dict().items()
                              if k in ("do_image_splitting", "size", "max_image_size", "resample", "do_resize")}
res["peak_mps_mb"], res["max_rss_mb"] = pm.peak_mb, pm.rss_mb
json.dump(res, open(os.path.join(HERE, "smoke", "vlm.json"), "w"), indent=1)
print(json.dumps(res, indent=1), flush=True)
