"""Build parts/20_js_vm_0data.js (window.VM_DATA) from out/*.json, inputs/ and the root's recorded VLM lab outputs.
Never edit the generated file by hand. Plain python3 (no torch); Pillow only to make missing thumbnails.
"""
import base64, glob, io, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
OUT = os.path.join(SRC, "out"); INP = os.path.join(SRC, "inputs"); ROOT = os.path.join(SRC, "..", "..", "src")
J = lambda *p: json.load(open(os.path.join(*p))) if os.path.exists(os.path.join(*p)) else None
os.makedirs(os.path.join(INP, "thumbs"), exist_ok=True)


def uri_file(path):
    return "data:image/webp;base64," + base64.b64encode(open(path, "rb").read()).decode()


def thumb(key, src_path, side, q=72):
    """Small WebP kept in inputs/thumbs (durable); made once from the full image in GM_SCRATCH if missing."""
    p = os.path.join(INP, "thumbs", f"{key}_{side}.webp")
    if not os.path.exists(p):
        from PIL import Image
        im = Image.open(src_path).convert("RGB"); im.thumbnail((side, side), Image.LANCZOS); im.save(p, "WEBP", quality=q)
    return uri_file(p)


SCR = os.environ.get("GM_SCRATCH", "")
src_img = lambda sub, key: os.path.join(SCR, "vm", "inputs", sub, key + ".png")
D = {}
SYN = J(INP, "synthetic.json")
ROOT_TH = os.path.join(ROOT, "data", "test_images")
test_thumb = lambda key: uri_file(os.path.join(ROOT_TH, key + ".webp"))

# ---------------------------------------------------------------- the Saw tab
ss = J(OUT, "smol_saw.json"); sn = J(OUT, "smol_norms.json"); qs = J(OUT, "qwen_saw.json")
if ss:
    view = {(v["key"], v["setting"]): v["maps"] for v in (sn or {}).get("viewer", [])}
    imgs = []
    for im in ss["images"]:
        k = im["key"]
        full = thumb(k, os.path.join(SCR, "test_images", k + ".png") if k == "p01_cat" else src_img("see", k), 320)
        rec = {"key": k, "w": im["w"], "h": im["h"], "thumb": thumb(k, os.path.join(SCR, "test_images", k + ".png") if k == "p01_cat" else src_img("see", k), 64),
               "full": full, "smol": []}
        for s in im["settings"]:
            maps = view.get((k, s["name"]))
            rec["smol"].append({"name": s["name"], "rows": s["rows"], "cols": s["cols"], "views": s["views"], "resized": s["resized"],
                                "imgTok": s["image_tokens"], "promptTok": s["prompt_tokens"], "thumbs": s["thumbs"],
                                "segs": [[g["k"], g["s"], g["n"], g.get("t", "")] for g in s["segments"]],
                                "patch": [m["patch_ratio"] for m in maps] if maps else None, "tok": [m["token_ratio"] for m in maps] if maps else None})
        if qs:
            q = next((x for x in qs["images"] if x["key"] == k), None)
            if q:
                rec["qwen"] = [{"budget": s["budget"], "thw": s["grid_thw"], "resized": s["resized"], "imgTok": s["image_tokens"],
                                "promptTok": s["prompt_tokens"], "lastPos": s["last_position"], "firstIdx": s["first_image_index"],
                                "pos": s["image_pos_thw"], "posAfter": s["pos_text_after"], "picture": s["picture"], "tokRatio": s["token_patch_ratio"],
                                "maxRatio": s["max_patch_ratio"], "prompt": s.get("prompt_compressed", "")} for s in q["settings"]]
        imgs.append(rec)
    D["saw"] = {"images": imgs, "anim": {"key": "rocket_native"}}
D["catThumb"] = test_thumb("p01_cat")

# ---------------------------------------------------------------- norms, drift
sg = J(OUT, "siglip_norms.json"); dr = J(OUT, "encoder_drift.json")
if sn:
    D["smolNorm"] = {"test16": [{"key": r["key"], "max": max(v["max_ratio"] for v in r["views"]), "views": [v["max_ratio"] for v in r["views"]],
                                 "proj": max(v["proj_max_ratio"] for v in r["views"])} for r in sn["test16"]],
                     "positions": sn["position_counts"], "hi": [h for r in sn["test16"] for v in r["views"] for h in v["hi"]], "threshold": sn["threshold"]}
if sg:
    D["sigNorm"] = {k: {"grid": v["grid"], "max": [r["max_ratio"] for r in v["images"]], "positions": v["positions_over_5x"]} for k, v in sg["runs"].items()}
if dr:
    D["drift"] = {"blocks": [[b, v["rel_weighted"], v["rel_max"], v["params"]] for b, v in dr["by_block"].items()],
                  "sig512": {"max": [r["max_ratio"] for r in dr["siglip512_norms"]["images"]], "positions": dr["siglip512_norms"]["positions_over_5x"]}}
if qs:
    D["qwenNorm"] = {"test16": qs["test16"], "positions": qs["positions_over_5x"]}

# ---------------------------------------------------------------- rules for the budget tab
tr = J(OUT, "token_rules.json")
if tr:
    D["rules"] = {"sizes": tr["sizes_hw"], "qwen": [[r["default_tokens"], r["cap1024_tokens"], r["default_thw"]] for r in tr["qwen"]["rows"]],
                  "internvl": [[r["tiles_shipped_default"], r["tiles_crop"]] for r in tr["internvl"]["rows"]]}

# ---------------------------------------------------------------- model runs (filled as they land)
for who in ("smol", "qwen"):
    for ph in ("kv", "pope", "ocr", "ground", "reduce", "qa", "timing", "video", "errors"):
        r = J(OUT, f"{who}_{ph}.json")
        if r is None: continue
        D.setdefault("runs", {}).setdefault(who, {})[ph] = r
for who in ("smol", "qwen"):
    g = D.get("runs", {}).get(who, {}).get("ground")
    if g: g["question"] = g["question"].replace("{{", "{").replace("}}", "}")
# trim heavy fields
for who, ph in (("smol", "reduce"), ):
    r = D.get("runs", {}).get(who, {}).get(ph)
    if r and "attn_keep_cat" in r: r["attn_keep_cat"].pop("att", None)
gs = J(OUT, "ground_scored.json")
if gs:
    D["groundParsed"] = {f"{who}:{r['key']}:{r['obj']}": r["boxes"] for who, m in gs["models"].items() for r in m["rows"] if r["parsed"]}
    D["groundBest"] = {who: m["best"] for who, m in gs["models"].items()}
    D["groundScore"] = {who: {k: m[k] for k in ("n", "parsed", "mean_iou", "iou_ge_05", "best")} for who, m in gs["models"].items()}
# the root's recorded SmolVLM numbers (read only)
rs = J(ROOT, "vlm", "out", "scores.json"); rt = J(ROOT, "vlm", "out", "timing.json")
if rs:
    D["rootSmol"] = {"qa": {b: [v["right"], v["n"], v["per_id"]] for b, v in rs["qa"].items()}}
if rt:
    D.setdefault("rootSmol", {})["timing"] = rt["runs"]
qa = J(ROOT, "vlm", "qa_set.json")
if qa:
    D["qaSet"] = [{"id": i["id"], "image": i["image"], "kind": i["kind"], "q": i["q"], "truth": i["truth"]} for i in qa["qa"]]
D["testThumbs"] = {os.path.basename(p)[:-5]: None for p in glob.glob(os.path.join(ROOT_TH, "*.webp"))}
for k in D["testThumbs"]:
    D["testThumbs"][k] = thumb("t_" + k, os.path.join(ROOT_TH, k + ".webp"), 48, 70)
if SYN:
    D["syn"] = {"ocrCrops": SYN["ocr_crops"], "ocr": [{"key": o["key"], "font": o["font_px"], "code": o["code"], "h": o["text_h"]} for o in SYN["ocr"]],
                "ground": [{"key": g["key"], "w": g["w"], "h": g["h"], "objects": g["objects"], "thumb": g["thumb"]} for g in SYN["ground"]],
                "video": [{"key": v["key"], "colour": v["colour"], "direction": v["direction"], "strip": v["strip"]} for v in SYN["video"]]}

qs2 = J(OUT, "qa_scored.json")
if qs2:
    D["qaScored"] = {w: {b: {k: v[k] for k in ("n", "image_tokens", "strict", "content")} | {"per": {i: x[:2] for i, x in v["per_id"].items()}} for b, v in m.items()} for w, m in qs2.items()}
    pts = [{"g": "smol", "t": v["image_tokens"], "a": v["content"], "lab": "SmolVLM " + str(v["image_tokens"])} for v in qs2["smol"].values()]
    pts += [{"g": "qwen", "t": v["image_tokens"], "a": v["content"], "lab": "Qwen3.5 " + str(v["image_tokens"])} for v in qs2["qwen"].values()]
    rd = D.get("runs", {}).get("smol", {}).get("reduce")
    if rd:
        for st in rd["settings"]:
            if st == "full": continue
            r0 = next(r for r in rd["rows"] if r["setting"] == st)
            pts.append({"g": "cut", "t": r0["image_tokens"], "a": rd["right"][st], "lab": st})
    D["accPts"] = pts
    D["accNote"] = ("Same 30 questions (the root VLM lab&#8217;s set), greedy decoding, Apple M1 Pro. Blue: SmolVLM-500M at its three processor settings (the root lab&#8217;s recorded answers). "
                     "Purple: Qwen3.5-0.8B with its pixels fixed at 64, 256 and 1,024 tokens (content scoring, see Reading section 2). Gold: SmolVLM&#8217;s 1,088 image tokens cut before the language model without retraining (Reading section 8a). "
                     "The processor&#8217;s own settings beat every training-free cut at equal token count: 64 tokens from one 512 view (24 right) against 136 random tokens (15) or 1,024 tile tokens without the global view (15).")
js = "window.VM_DATA=" + json.dumps(D, separators=(",", ":")) + ";\n"
p = os.path.join(SRC, "parts", "20_js_vm_0data.js"); open(p, "w").write(js)
print("wrote parts/20_js_vm_0data.js", len(js), "bytes;", {k: len(json.dumps(v)) for k, v in D.items()})
