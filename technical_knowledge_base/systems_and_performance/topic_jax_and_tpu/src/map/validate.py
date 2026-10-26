"""Checks for the Tool map tab after build: (1) the page embeds 36_js_tm_0data.js verbatim; (2) facts quoted in the tab's
hand-written HTML appear in the embedded data, so prose cannot drift from the atlas; (3) no em dashes, private paths or
tokens in the tab's files. Run from anywhere: python3 -B <root>/src/map/validate.py"""
import glob, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
data_js = open(os.path.join(ROOT, "src", "parts", "36_js_tm_0data.js"), encoding="utf-8").read()
fails = []
body = data_js.split("\n", 1)[1]
if body not in page: fails.append("page does not embed 36_js_tm_0data.js verbatim")
D = json.loads(body[len("window.TM_DATA="):].rstrip().rstrip(";"))
blob = json.dumps(D, ensure_ascii=False, separators=(",", ":"))
prose = "".join(open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(ROOT, "src", "parts", "36_tab_*.html")))
# (phrase in prose, phrase that must be in the data)
PAIRS = [("15 October 2026", '"asof":"2026-10-15"'), ("0.8.0 (October 2025)", '"0.8.0","2025-10-15"'), ("since 0.10.0", '"0.10.0","2026-04-16"'),
         ("since July 2023", "As of July 2023"), ("announced in April 2026", '"2026-04"'), ("Ten jobs", None)]
for a, b in PAIRS:
    if a not in prose: fails.append(f"phrase not in prose: {a}")
    if b and b not in blob: fails.append(f"prose says '{a}' but data lacks '{b}'")
if "Ten jobs" in prose and len(D["slots"]) != 10: fails.append("prose says ten jobs, data has %d" % len(D["slots"]))
st = {t["id"]: t["status"] for t in D["tools"]}
for tid, s in [("haiku", "maintenance"), ("objax", "archived"), ("trax", "archived"), ("penzai", "archived"), ("jetstream", "deprecated"),
               ("xpk", "deprecated"), ("torchxla", "deprecated"), ("torchtpu", "active"), ("linen", "maintained")]:
    if st.get(tid) != s: fails.append(f"key-points box assumes {tid} is {s}, data says {st.get(tid)}")
for f in glob.glob(os.path.join(ROOT, "src", "parts", "36_*")) + glob.glob(os.path.join(HERE, "**", "*"), recursive=True):
    if os.path.isdir(f) or f.endswith(".png") or os.path.abspath(f) == os.path.abspath(__file__): continue
    t = open(f, encoding="utf-8", errors="replace").read()
    if "—" in t: fails.append("em dash in " + f)
    for bad in ("/Us" + "ers/", "Us" + "ers-", "kha" + "lid", "gl" + "pat", "sk" + "-ant", "/priv" + "ate/tmp", "@av" + "eni"):
        if bad in t: fails.append(f"'{bad}' in {os.path.relpath(f, ROOT)}")
for x in fails: print("FAIL", x)
print("validate:", "fail" if fails else "ok", len(PAIRS), "pairs checked")
sys.exit(1 if fails else 0)
