"""check_data.py: the built page embeds exactly the recorded data, its prose numbers are the recorded numbers, and
the Shape drill's JavaScript parameter formula equals accounting.py on every model.
Run from this folder after build.sh: python3 check_data.py
"""
import glob, html, json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "index.html")).read()
D = json.loads(re.search(r"window\.TZD=(\{.*?\});\n", page, re.S).group(1))
J = lambda *p: json.load(open(os.path.join(HERE, *p)))
fails = []
def ok(c, msg):
    if not c:
        fails.append(msg)

# 1. data equals the recorded outputs
steps = J("zero", "out", "steps.json")["steps"]
_t = re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", page, flags=re.S))
for s_ in steps:  # every step's test output and every recorded shape is on the page (static text since 2026-10-23)
    for line in s_["out"]:
        ok(line in html.unescape(_t), f"step {s_['key']} output line missing: {line[:60]}")
    for x in s_["shapes"]:
        ok("(" + ", ".join(f"{n:,}" for n in x["shape"]) + ")" in _t, f"step {s_['key']} shape {x['name']} missing")
curve = J("train", "out", "curve.json")
ok([(s["step"], s["val"], s["tok"]) for s in D["snaps"]] == [(s["step"], s["val"], s["tok_loss"]) for s in curve["snaps"]], "snapshots differ")
smp = J("train", "out", "sampling.json")
ok([p["logits"] for p in D["smp"]["points"]] == [p["logits"] for p in smp["points"]], "sampling logits differ")
for a in D["abl"]:
    r = J("train", "out", "runs", a["name"] + ".json")
    ok(a["val"] == r["final_val"] and a["eval"] == r["eval"], f"run {a['name']} differs")
    if a["tok"]:
        ok(a["tok"] == r["tok_loss"] and a["samples"] == r["samples"], f"run {a['name']} samples or token losses differ")
acc = J("zero", "out", "accounting.json")
ok([x["total"] for x in D["acc"]["real"]] == [x["total"] for x in acc["real"]], "accounting differs")

# 2. prose: no unresolved placeholder, and spot numbers equal the data
_vis = re.sub(r"<script.*?</script>", " ", page, flags=re.S)
ok("PENDING" not in page and "[[" not in _vis, "unresolved placeholder in the page")
F = J("page_text.json")["facts"]
text = re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", page, flags=re.S))
for k, fmt in [("p_total", "{:,}"), ("n_state_dict", "{:,}"), ("abl_base_val", "{:.3f}"), ("ref_val", "{:.4f}"), ("fl_counter", "{:,}"),
               ("loss0", "{:.3f}"), ("bigram", "{:.3f}"), ("unigram", "{:.3f}"), ("abl_noresid_val", "{:.2f}"), ("us_val", "{:.2f}")]:
    if k in F:
        ok(fmt.format(F[k]) in text, f"prose lacks {k} = {fmt.format(F[k])}")
# hand-typed numbers in prose that come from runs here: must equal the recorded values
for s, v in [("13.4", J("zero", "out", "mistakes.json")["unshifted"]["held_out_shifted"]), ("0.067", J("zero", "out", "mistakes.json")["unshifted"]["train_curve"][-1][1])]:
    ok(s in text and abs(float(s) - v) < 0.051, f"hand-typed {s} vs recorded {v}")

# 3. the drill's JavaScript count equals accounting.py
js = re.search(r"/\* 33_js_tzd_drill.js \*/(.*?)</script>", page, re.S).group(1)
data = re.search(r"/\* 22_js_tz_0data.js \*/(.*?)</script>", page, re.S).group(1)
node = ("const document={getElementById:(id)=>({innerHTML:'',addEventListener(){},querySelectorAll:()=>[],value:id==='tzd-kind'?'all':'any',set textContent(v){}})};"
        "const RD={esc:s=>s,stat:()=>''};const window={RD};" + data.replace("window.TZD", "window.TZD") + js +
        ";console.log(JSON.stringify(window.TZDR.models.map(m=>[m.key,window.TZDR.count(m.s).total])))")
res = subprocess.run(["node", "-"], input=node, capture_output=True, text=True)  # on stdin: the script is over the 128 KB argument limit
if res.returncode:
    raise SystemExit("node failed: " + res.stderr[-800:])
out = json.loads(res.stdout)
py = {x["key"]: x["total"] for x in acc["real"]}; py["tiny"] = acc["params"]["baseline"]["total"]
for k, v in out:
    ok(py[k] == v, f"drill count {k}: JS {v} vs Python {py[k]}")
# 4. the 3D stages (2026-11-10): the scene data equals a fresh run of make_scene_data.py, and the numbers the step lists quote are the trace's
import sys; sys.path.insert(0, HERE); import make_scene_data as MS
ok(open(os.path.join(HERE, "parts", "26_js_tz_scene.js")).read() == MS.text(), "parts/26_js_tz_scene.js differs from make_scene_data.py")
TS = json.loads(re.search(r"window\.TZS=(\{.*?\});\n", page, re.S).group(1))
ok(TS == MS.build(), "the page's TZS differs from make_scene_data.py")
lists = {m.group(1): re.sub(r"<[^>]+>", " ", m.group(2)) for m in re.finditer(r'<ol class="sx" id="(sx-[\w-]+)"[^>]*>(.*?)</ol>', page, re.S)}
need = {"sx-hero": [f"{F['p_next'] * 100:.1f}%", f"{F['loss_here']:.3f}", f"{F['abl_noattn_val']:.3f}", "786,944", "65.5"],
        "sx-emb": ["id 79", f"{TS['emb_norm']['tok']:.2f}", f"{TS['emb_norm']['pos']:.2f}", f"{TS['emb_norm']['x']:.2f}", f"{F['o_count']}", "0.433"],
        "sx-att": [f"{F['h4_top_score']:.2f}", f"{F['h4_x_share'] * 100:.0f}%", f"{F['h4_top']:.2f}", "2.4e-07", "4.1e-04", "98 tokens"],
        "sx-heads": [f"{F['h0_prev'] * 100:.0f}%", f"{F['h5_prev'] * 100:.0f}%", f"{F['ent_lo']:.1f}", f"{F['ent_hi']:.1f}", f"{TS['l1_norm']['attn_out']:.2f}"],
        "sx-blk": [f"{TS['l1_norm'][k]:.{d}f}" for k, d in (("x_in", 2), ("norm1", 1), ("attn_out", 2), ("x_mid", 2), ("norm2", 1), ("ffn_out", 1), ("x_out", 1))] + [f"{F['gelu_neg'] * 100:.0f}%"],
        "sx-out": [f"{TS['l6_out_norm']:.1f}", f"{TS['norm_f_norm']:.1f}", f"{TS['logit_min']:.2f}", f"{TS['logit_max']:.2f}", f"{F['top_rest'] * 100:.1f}%", f"{F['top_other'] * 100:.1f}%"],
        "sx-trn": [f"{s['val']:.3f}" for s in curve["snaps"] if s["step"] in (0, 50, 100, 300, 500, 1000, 1500)]}
for lid, xs in need.items():
    ok(lid in lists, f"step list {lid} missing")
    for x in xs:
        ok(x in lists.get(lid, ""), f"step list {lid} lacks {x}")
ok(sum(1 for p in curve["pieces"] if p == "o") == F["o_count"], "count of o")
print("checked", len(out), "drill models,", len(D["abl"]), "runs,", len(D["snaps"]), "snapshots")
print("FAIL" if fails else "OK", *fails, sep="\n")
