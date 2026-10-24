"""Checks for the Tool map tab after build: (1) the page embeds 36_js_tm_0data.js verbatim; (2) numbers quoted in the
tab's hand-written prose and scripts appear in the embedded data (so prose cannot drift from the atlas); (3) no em
dashes, private paths or tokens in the tab's files. Run from the repo root: python3 <root>/src/map/validate.py"""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
data_js = open(os.path.join(ROOT, "src", "parts", "36_js_tm_0data.js"), encoding="utf-8").read()
fails = []
body = data_js.split("\n", 1)[1]
if body not in page: fails.append("page does not embed 36_js_tm_0data.js verbatim")
D = json.loads(body[len("window.TM_DATA="):].rstrip().rstrip(";"))
blob = json.dumps(D, ensure_ascii=False)
prose = "".join(open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(ROOT, "src", "parts", "36_*")) if not f.endswith("0data.js"))
# (phrase in prose, phrase that must be in the data)
PAIRS = [("8 times", "about 8 times the speed"), ("2.5 Core points", "2.5 Core points"), ("2,102 labels", "2,102 labels"),
         ("at least 0.65", "at least 0.65"), ("65,536", "65,536"), ("16 times", "about 16 times faster"),
         ("104-crawl", "104 crawls"), ("CC-BY-SA 3.0", "CC-BY-SA 3.0"), ("CC-BY-NC 4.0", "CC-BY-NC 4.0"),
         ("NVIDIA Open Model License", "NVIDIA Open Model License"), ("NVIDIA Data Agreement for Model Training", "NVIDIA Data Agreement for Model Training"),
         ("HTTP 401", "HTTP 401"), ("26.02", "26.02")]
for a, b in PAIRS:
    if a in prose and b not in blob: fails.append(f"prose says '{a}' but data lacks '{b}'")
    if a not in prose: print("note: phrase not used in prose:", a)
if "toy_check" in D:
    T = D["toy_check"]
    for k in ("datatrove", "dolma"):
        if len(T[k]["docs"]) != len(T["docs"]): fails.append("toy: doc count mismatch " + k)
for f in glob.glob(os.path.join(ROOT, "src", "parts", "36_*")) + glob.glob(os.path.join(HERE, "**", "*"), recursive=True):
    if os.path.isdir(f) or f.endswith(".png") or os.path.abspath(f) == os.path.abspath(__file__): continue
    t = open(f, encoding="utf-8", errors="replace").read()
    if "—" in t: fails.append("em dash in " + f)
    for bad in ("/Users/", "Users-", "glpat", "sk-ant", "/private/tmp"):
        if bad in t: fails.append(f"'{bad}' in {f}")
for x in fails: print("FAIL", x)
print("validate:", "fail" if fails else "ok", len(PAIRS), "pairs checked")
sys.exit(1 if fails else 0)
