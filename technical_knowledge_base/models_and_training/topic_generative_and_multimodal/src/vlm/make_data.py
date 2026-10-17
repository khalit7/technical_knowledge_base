"""Assemble the VLM lab's page data: ../parts/35_js_vl_0data.js (window.VL_DATA) from out/*.json, qa_set.json,
captions_marks.json and the test images.
    GM_SCRATCH=... $GM_SCRATCH/venv/bin/python -I make_data.py      (Pillow; needs the full-size test images)
check_data.py confirms the page embeds exactly these numbers.
"""
import base64, io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vl_env import *
import numpy as np
from PIL import Image

L = lambda n: json.load(open(os.path.join(OUT, n)))
tok, tr, tm, qa, pope, cap, sc = (L(n) for n in ("tokens.json", "trace.json", "timing.json", "qa_raw.json", "pope_raw.json", "captions_raw.json", "scores.json"))
QS = json.load(open(os.path.join(HERE, "qa_set.json")))
MARKS = json.load(open(os.path.join(HERE, "captions_marks.json")))
meta = {it["key"]: it for it in json.load(open(os.path.join(HERE, "..", "data", "test_images.json")))["items"]}
ti = {k: im for k, im, _ in pretrained.test_images()}


def webp(im, size, q=70):
    b = io.BytesIO(); im.resize((size, size), Image.BICUBIC).save(b, "WEBP", quality=q)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


NAMES = {"p01_cat": "cat", "p02_coffee": "coffee", "p03_rocket": "rocket", "p04_hubble": "Hubble deep field", "s01_shapes": "shapes",
         "s02_left_right": "left and right", "s03_text": "text card", "s04_typographic": "cat with DOG sticker", "s05_chart": "bar chart",
         "s06_clock": "clock", "g01_bicycle": "bicycle (generated)", "g02_oranges": "oranges (generated)", "g03_lighthouse": "lighthouse (generated)",
         "g04_puppy": "puppy (generated)", "g05_stopsign": "stop sign (generated)", "g06_astronaut": "astronaut (generated)"}
SHORT = {"1 tile (64)": "1 view, 64 tokens", "2x2+1 (320)": "2x2 + 1, 320 tokens", "4x4+1 (1088, default)": "4x4 + 1, 1,088 tokens (default)"}
D = {"date": tr["date"], "machine": tr["machine"], "names": NAMES, "thumbs": {k: webp(ti[k], 64) for k in NAMES}, "cat": webp(ti["p01_cat"], 256, 75)}
# LLaVA illustration: patch mean colours of the cat at 336 px in 14 px patches (no model)
a = np.asarray(ti["p01_cat"].resize((336, 336), Image.BICUBIC)).astype(float).reshape(24, 14, 24, 14, 3).mean((1, 3))
D["llava_patch"] = a.round().astype(int).reshape(-1, 3).tolist()
D["trace"] = {k: tr[k] for k in ("params", "params_total", "proj_weight_shape", "shapes", "merge_exact", "shuffle_token1_same_set", "norms",
                                  "nearest_cos_median", "pca_vision_global", "pca_proj_global", "pca_vision_global_var", "pca_proj_global_var")}
D["trace"]["nearest_examples"] = [x["tokens"][0] for x in tr["nearest_vocab_global"][:12]]
# the token sequence, merged runs by kind (for the animation)
runs = []
for k, t, n in tok["sequence_runs"]:
    if runs and runs[-1][0] == k: runs[-1][2] += n
    else: runs.append([k, "", n])
D["seq"] = runs
D["prompt"] = {"template": tok["template_text"], "expanded": tok["expanded_compressed"], "kinds": tok["kind_counts"], "total": tok["total_tokens"]}
D["tokens"] = {k: tok[k] for k in ("square_default", "aspect_default", "knob")}
B = list(dict.fromkeys(r["budget"] for r in qa["answers"]))
kinds = list(dict.fromkeys(i["kind"] for i in QS["qa"]))
D["qa"] = {"budgets": B, "short": SHORT, "kinds": kinds,
           "items": [{k: i[k] for k in ("id", "image", "kind", "q", "truth")} for i in QS["qa"]],
           "ans": {b: {r["id"]: [r["answer"], sc["qa"][b]["per_id"][r["id"]], r["seconds"]] for r in qa["answers"] if r["budget"] == b} for b in B},
           "summary": {b: {"right": sc["qa"][b]["right"], "median_seconds": sc["qa"][b]["median_seconds"]} for b in B}}
PB = list(dict.fromkeys(r["budget"] for r in pope["answers"]))
items = [r for r in pope["answers"] if r["budget"] == PB[0]]
D["pope"] = {"budgets": PB, "template": pope["template"], "items": [{"image": r["image"], "obj": r["obj"], "kind": r["kind"]} for r in items],
             "ans": {}, "summary": {b: {k: sc["pope"][b][k] for k in ("acc", "yes_absent", "n_absent", "yes_present", "n_present", "yes_rate")} for b in PB}}
for b in PB:
    rs = [r for r in pope["answers"] if r["budget"] == b]
    assert [(r["image"], r["obj"]) for r in rs] == [(r["image"], r["obj"]) for r in items]
    D["pope"]["ans"][b] = [[r["answer"], bool(__import__("re").match(r"^\W*yes\b", r["answer"], 2))] for r in rs]
D["captions"] = []
for r in cap["answers"]:
    marks = []
    for m in MARKS.get(r["image"], []):
        i = r["answer"].find(m[0]); assert i >= 0, (r["image"], m[0])
        marks.append([i, i + len(m[0]), m[1]])
    D["captions"].append({"image": r["image"], "text": r["answer"], "marks": sorted(marks), "seconds": r["seconds"], "new_tokens": r["new_tokens"]})
# prefill_seconds timed model(**inputs), which runs the vision encoder too: the language-model part is the difference
for r in tm["runs"]:
    r["lm_prefill_seconds"] = round(r["prefill_seconds"] - r["vision_seconds"], 4)
D["timing"] = {"runs": tm["runs"]}
D["load_seconds"] = tr.get("load_seconds")
js = "// generated by src/vlm/make_data.py from src/vlm/out/*.json; do not edit\nwindow.VL_DATA=" + json.dumps(D, separators=(",", ":"), ensure_ascii=False) + ";\n"
p = os.path.join(HERE, "..", "parts", "35_js_vl_0data.js"); open(p, "w").write(js)
print("wrote", p, len(js.encode()), "bytes")
