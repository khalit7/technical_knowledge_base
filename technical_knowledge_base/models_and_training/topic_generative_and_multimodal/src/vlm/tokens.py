"""How many tokens is an image for SmolVLM-500M-Instruct? Processor only (CPU, no model weights).

Writes out/tokens.json: the exact prompt the processor builds (compressed and token by token), and the
image-token count for many input sizes, aspect ratios and processor settings.
    GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I tokens.py
"""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vl_env import *
from PIL import Image

cap_threads(4)
proc = processor()
tok = proc.tokenizer
IMG_ID = tok.convert_tokens_to_ids("<image>")
cat = {k: im for k, im, _ in pretrained.test_images()}["p01_cat"]
Q = "Describe this image in one sentence."
res = {"model": pretrained.VLM[0], "revision": pretrained.VLM[1], "date": time.strftime("%Y-%m-%d"), "machine": MACHINE,
       "image_processor_class": type(proc.image_processor).__name__, "processor_class": type(proc).__name__,
       "image_seq_len": proc.image_seq_len,
       "image_processor": {k: v for k, v in proc.image_processor.to_dict().items()
                           if k in ("do_image_splitting", "size", "max_image_size", "resample", "do_resize", "image_mean", "image_std")}}

# 1. the prompt, before and after the processor expands <image>
templ = chat(proc, Q)
res["template_text"] = templ
inp = proc(text=templ, images=[cat], return_tensors="pt")
ids = inp["input_ids"][0].tolist()
expanded = tok.decode(ids, skip_special_tokens=False)
res["expanded_chars"] = len(expanded)
res["expanded_compressed"] = re.sub(r"(?:<image>){2,}", lambda m: "<image>x%d" % (len(m.group(0)) // 7), expanded)
pieces = tok.convert_ids_to_tokens(ids)
kinds = []
for t, i in zip(pieces, ids):
    if i == IMG_ID: kinds.append("image")
    elif t == "<fake_token_around_image>": kinds.append("wrap")
    elif re.fullmatch(r"<row_\d+_col_\d+>|<global-img>", t): kinds.append("pos")
    elif t in tok.all_special_tokens or t.startswith("<|") or t in ("<end_of_utterance>",): kinds.append("special")
    else: kinds.append("text")
# run-length encode the sequence of (kind, token) for the page
runs = []
for t, k in zip(pieces, kinds):
    if runs and k == "image" and runs[-1][0] == "image": runs[-1][2] += 1
    else: runs.append([k, t, 1])
res["sequence_runs"] = runs
res["kind_counts"] = {k: kinds.count(k) for k in ("text", "special", "wrap", "pos", "image")}
res["total_tokens"] = len(ids)
res["pixel_values_shape"] = list(inp["pixel_values"].shape)
# the text part alone (no image) for comparison
t_only = proc.apply_chat_template([{"role": "user", "content": [{"type": "text", "text": Q}]}], add_generation_prompt=True)
res["text_only_tokens"] = len(tok(t_only)["input_ids"])
res["text_only_template"] = t_only
print(res["expanded_compressed"][:600]); print(res["kind_counts"], res["total_tokens"], res["pixel_values_shape"], flush=True)


def count(im, **kw):
    p = proc(text=templ, images=[im], return_tensors="pt", **kw)
    pv = p["pixel_values"].shape
    rows = p.get("rows"); cols = p.get("cols")
    n_img = int((p["input_ids"][0] == IMG_ID).sum())
    return {"tiles": int(pv[1]), "image_tokens": n_img, "total_tokens": int(p["input_ids"].shape[1]),
            "rows": int(rows[0][0]) if rows is not None else None, "cols": int(cols[0][0]) if cols is not None else None}


# 2. square inputs of many sizes, default settings
res["square_default"] = []
for s in (64, 128, 256, 384, 512, 768, 1024, 2048, 3000):
    r = count(cat.resize((s, s), Image.LANCZOS)); r["w"] = r["h"] = s; res["square_default"].append(r)
# 3. aspect ratios, default settings
res["aspect_default"] = []
for w, h in ((512, 256), (256, 512), (1024, 768), (768, 1024), (1920, 1080), (1080, 1920), (2048, 512), (512, 2048), (640, 480)):
    r = count(cat.resize((w, h), Image.LANCZOS)); r["w"], r["h"] = w, h; res["aspect_default"].append(r)
# 4. the processor knob: size longest_edge = N x 512, and splitting off (square 512 input and a 16:9 1920x1080 input)
res["knob"] = []
for name, im in (("512x512", cat), ("1920x1080", cat.resize((1920, 1080), Image.LANCZOS))):
    for n in (1, 2, 3, 4, 5, 6, 7, 8):
        r = count(im, size={"longest_edge": 512 * n}); r.update(input=name, N=n, splitting=True); res["knob"].append(r)
    r = count(im, do_image_splitting=False); r.update(input=name, N=None, splitting=False); res["knob"].append(r)
for r in res["knob"]:
    print(r, flush=True)
dump("tokens.json", res)
