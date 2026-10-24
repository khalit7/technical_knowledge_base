"""The page embeds exactly the recorded data, and the numbers in its prose match the data.
    python3 runs/check_data.py        (from src/; runs node runs/dump_txt.mjs to read the rendered prose)
"""
import json, os, re, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE); OUT = os.path.join(SRC, "out")
J = lambda n: json.load(open(os.path.join(OUT, n)))
js = open(os.path.join(SRC, "parts", "20_js_vm_0data.js")).read()
D = json.loads(js[js.index("=") + 1:js.rstrip().rindex(";")])
bad = []; ok = 0


def check(cond, what):
    global ok
    if cond: ok += 1
    else: bad.append(what)


# 1. embedded runs equal the recorded files
for who, phs in D["runs"].items():
    for ph, v in phs.items():
        rec = J(f"{who}_{ph}.json")
        if ph == "reduce": rec["attn_keep_cat"].pop("att", None)
        if ph == "ground": rec["question"] = rec["question"].replace("{{", "{").replace("}}", "}")
        check(v == rec, f"runs.{who}.{ph} differs from out/{who}_{ph}.json")
ss, qs = J("smol_saw.json"), J("qwen_saw.json")
for im in D["saw"]["images"]:
    a = next(x for x in ss["images"] if x["key"] == im["key"]); b = next(x for x in qs["images"] if x["key"] == im["key"])
    for e, s in zip(im["smol"], a["settings"]):
        check(e["imgTok"] == s["image_tokens"] and e["promptTok"] == s["prompt_tokens"] and e["thumbs"] == s["thumbs"], f"saw smol {im['key']} {s['name']}")
    for e, s in zip(im["qwen"], b["settings"]):
        check(e["pos"] == s["image_pos_thw"] and e["imgTok"] == s["image_tokens"] and e["picture"] == s["picture"] and e["lastPos"] == s["last_position"], f"saw qwen {im['key']} {s['budget']}")
tr = J("token_rules.json")
check(D["rules"]["qwen"] == [[r["default_tokens"], r["cap1024_tokens"], r["default_thw"]] for r in tr["qwen"]["rows"]], "rules.qwen")
check(D["rules"]["internvl"] == [[r["tiles_shipped_default"], r["tiles_crop"]] for r in tr["internvl"]["rows"]], "rules.internvl")
qa = J("qa_scored.json")
for w in qa:
    for b, v in qa[w].items():
        check(D["qaScored"][w][b]["strict"] == v["strict"] and D["qaScored"][w][b]["content"] == v["content"], f"qaScored {w} {b}")

# 2. prose numbers recomputed from out/ and looked up in the rendered text
tmp = os.path.join(tempfile.gettempdir() if not os.environ.get("VM_TMP") else os.environ["VM_TMP"], "vm_txt.json")
subprocess.run(["node", os.path.join(HERE, "dump_txt.mjs"), tmp], check=True)
T = json.load(open(tmp)); os.remove(tmp)
c = lambda n: f"{round(n):,}"


def has(key, s):
    # since 2026-10-24 the measured numbers are written in the HTML (so the ledger check sees them); key names the old paragraph
    check(s in T["__read"], f"{key}: expected '{s}' in the Reading tab")


ks, kq = J("smol_kv.json")["runs"], J("qwen_kv.json")["runs"]
fit = lambda r: (lambda a, b: ((b["total_bytes"] - a["total_bytes"]) / (b["prompt_tokens"] - a["prompt_tokens"]), a))(*sorted(r, key=lambda x: x["prompt_tokens"])[::len(r) - 1])
s_sl, _ = fit(ks); q_sl, qa0 = fit(kq); q_fx = qa0["total_bytes"] - q_sl * qa0["prompt_tokens"]
has("kv_text", f"grows by {c(s_sl)} bytes per token"); has("kv_text", f"grows by {c(q_sl)} bytes per token"); has("kv_text", f"fixed {q_fx / 1e6:.1f} MB")
check(round(s_sl) == 40960 and round(q_sl) == 12288, "cache slopes equal the config arithmetic (40,960 and 12,288)")
for who, buds in (("smol", ["64", "320", "1088"]), ("qwen", ["64", "256", "1024"])):
    rows = J(f"{who}_ocr.json")["rows"]
    has("ocr_text", ", ".join(f"{sum(r['exact'] for r in rows if r['budget'] == b)} at {c(int(b))}" for b in buds))
g = J("ground_scored.json")["models"]["qwen"]
has("ground_text", f"{g['mean_iou']['resized']:.2f} read as resized-image pixels"); has("ground_text", f"{g['iou_ge_05'][g['best']]} of 24 boxes")
v = [r for r in J("qwen_video.json")["rows"] if r["mode"] == "video"]
has("video_text", f"right in {sum(r['truth'] in r['answer'].lower() for r in v)} of 8")
for who, nm in (("smol", "SmolVLM says yes"), ("qwen", "Qwen3.5 to")):
    rows = J(f"{who}_pope.json")["rows"]
    yp = sum(r["img"]["yes_share"] >= .5 for r in rows if r["kind"] == "present"); ya = sum(r["img"]["yes_share"] >= .5 for r in rows if r["kind"] != "present")
    has("hal_text", f"{yp} of 25 present objects and {ya} of 47" if who == "smol" else f"Qwen3.5 to {yp} and {ya}")
red = J("smol_reduce.json")["right"]
has("red_text", f"all 1,088 tokens {red['full']}"); has("red_text", f"random half {red['random 50%']}"); has("red_text", f"keeping all 1,024 tile tokens: {red['tiles only']}")
has("qa_text", ", ".join(f"{v['strict']} at {c(v['image_tokens'])}" for v in qa["smol"].values()))
has("qa_text", ", ".join(f"{v['content']} at {c(v['image_tokens'])}" for v in qa["qwen"].values()))
cat = next(s for s in qs["images"][0]["settings"] if s["budget"] == "256")
has("pos_answer", "(" + ", ".join(map(str, cat["pos_text_after"])) + ")")
# hero and the tiles animation caption (static numbers)
cs = next(x for x in ss["images"] if x["key"] == "p01_cat")["settings"][0]
has("hero", f"{c(cs['image_tokens'])} image tokens in SmolVLM"); check(cs["prompt_tokens"] == 1142, "hero: SmolVLM cat prompt 1,142")
check(cat["image_tokens"] == 256 and cat["prompt_tokens"] == 277 and "277-token prompt" in open(os.path.join(SRC, "parts", "27_js_vm_hero.js")).read(), "hero: Qwen3.5 cat 256 tokens, prompt 277")
rk = next(x for x in D["saw"]["images"] if x["key"] == "rocket_native")
rq = next(x for x in rk["qwen"] if x["budget"] == "native")
has("tiles", f"= {c(rk['smol'][0]['imgTok'])} tokens; Qwen3.5: {rq['resized'][0]} &#215; {rq['resized'][1]}".replace("&#215;", "\u00d7")); has("tiles", f"shape kept, {rq['imgTok']} tokens")

# 3. numbers typed into the HTML prose, recomputed
read = T["__read"]; rule = {(r["h"], r["w"]): r for r in tr["qwen"]["rows"]}; iv = {(r["h"], r["w"]): r for r in tr["internvl"]["rows"]}
check(iv[(1080, 1920)]["tiles_crop"] * 256 == 2304 and "2,304 tokens" in read, "InternVL 1920x1080 = 2,304")
check(rule[(1080, 1920)]["default_tokens"] == 2040 and "2,040 tokens" in read, "Qwen3.5 1920x1080 = 2,040")
check(rule[(2048, 2048)]["default_tokens"] == 4096 and "4,096 for 2,048" in read, "Qwen3.5 2048 = 4,096")
check(rule[(512, 512)]["default_tokens"] == 256 and rule[(64, 64)]["default_tokens"] == 64, "Qwen3.5 512 = 256, 64 = 64")
vv = {(r["h"], r["w"], r["seconds"], r["fps"]): r for r in tr["qwen_video"]}
check(vv[(240, 320, 600.0, 2)]["tokens"] == 9216 and "9,216 tokens" in read, "10-minute video = 9,216")
check(vv[(720, 1280, 10.0, 2)]["tokens"] / 10 == 720 and "clip costs 720" in read, "720p = 720 tokens per second")
check(vv[(240, 320, 4.0, 2)]["tokens"] / 4 == 80, "320x240 = 80 tokens per second")
check(2 * 32 * 32 * 128 * 2 == 524288 and round(524288 * 576 / 1e6) == 302 and "302 MB" in read, "LLaVA-1.5 576 tokens = 302 MB")
check(round(69.5 - 60.3, 1) == 9.2 and round(66.7 - 60.3, 1) == 6.4 and round(60.3 - 51.8, 1) == 8.5, "Idefics2 Table 3 differences")
check(1024 * 4096 + 4096 + 4096 * 4096 + 4096 == 20979712, "LLaVA-1.5 MLP = 21.0M")
check(f"{red['tiles only']})" in D["accNote"] and f"(24 right)" in D["accNote"] and f"136 random tokens ({red['random 12.5%']})" in D["accNote"], "accNote numbers")
check(next(v for v in qa["smol"].values() if v["image_tokens"] == 64)["strict"] == 24, "SmolVLM 64 tokens = 24 right")
print("checks passed:", ok, "failed:", len(bad))
for b in bad: print("  FAIL", b)
sys.exit(1 if bad else 0)
