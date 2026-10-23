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
res = subprocess.run(["node", "-e", node], capture_output=True, text=True)
if res.returncode:
    raise SystemExit("node failed: " + res.stderr[-800:])
out = json.loads(res.stdout)
py = {x["key"]: x["total"] for x in acc["real"]}; py["tiny"] = acc["params"]["baseline"]["total"]
for k, v in out:
    ok(py[k] == v, f"drill count {k}: JS {v} vs Python {py[k]}")
print("checked", len(out), "drill models,", len(D["abl"]), "runs,", len(D["snaps"]), "snapshots")
print("FAIL" if fails else "OK", *fails, sep="\n")
