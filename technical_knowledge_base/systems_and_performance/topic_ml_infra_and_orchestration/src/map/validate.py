"""Checks for the Tool map tab after build: (1) the page embeds 36_js_tm_0data.js verbatim; (2) facts quoted in the tab's
hand-written HTML appear in the embedded data, so prose cannot drift from the atlas; (3) no em dashes, private paths or
tokens in the tab's files. Run from anywhere: python3 -B <root>/src/map/validate.py   (adapted from the JAX topic)"""
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
PAIRS = [("16 October 2026", '"asof":"2026-10-16"'), ("Twelve jobs", None), ("since March 2025", '"ver":"0.38.1","verDate":"2025-03-19"'),
         ("release-1.9 branch", "release-1.9 branch"), ("v1beta1", "v1beta1"), ("three months after its acquisition", '"neptune","2025-12"')]
for a, b in PAIRS:
    if a not in prose: fails.append(f"phrase not in prose: {a}")
    if b and b not in blob: fails.append(f"prose says '{a}' but data lacks '{b}'")
if len(D["slots"]) != 12: fails.append("prose says twelve jobs, data has %d" % len(D["slots"]))
st = {t["id"]: t["status"] for t in D["tools"]}
for tid, s in [("neptune", "archived"), ("minio", "archived"), ("determined", "quiet"), ("trainerv1", "maintenance"), ("trainer", "active"),
               ("kueue", "active"), ("kai", "active"), ("slurm", "active"), ("runai", "commercial")]:
    if st.get(tid) != s: fails.append(f"prose assumes {tid} is {s}, data says {st.get(tid)}")
own = {(o[0], o[1][:4], o[2]) for o in D["own"]}
for o in [("runai", "2024", "NVIDIA"), ("slurm", "2025", "NVIDIA"), ("wandb", "2025", "CoreWeave"), ("neptune", "2025", "OpenAI")]:
    if o not in own: fails.append(f"key box assumes owner change {o}")
for f in glob.glob(os.path.join(ROOT, "src", "parts", "36_*")) + glob.glob(os.path.join(HERE, "**", "*"), recursive=True):
    if os.path.isdir(f) or f.endswith(".png") or os.path.abspath(f) == os.path.abspath(__file__): continue
    t = open(f, encoding="utf-8", errors="replace").read()
    if "—" in t: fails.append("em dash in " + f)
    for bad in ("/Us" + "ers/", "Us" + "ers-", "kha" + "lid", "gl" + "pat", "sk" + "-ant", "/priv" + "ate/tmp", "@av" + "eni"):
        if bad in t: fails.append(f"'{bad}' in {os.path.relpath(f, ROOT)}")
for x in fails: print("FAIL", x)
print("validate:", "fail" if fails else "ok", len(PAIRS), "pairs checked")
sys.exit(1 if fails else 0)
