"""Prove the built page carries exactly the recorded outputs and the numbers derived from them.

1. window.SDATA in ../index.html equals what make_data.py builds from raw/ now.
2. Every <span data-k="key" data-f="fmt">value</span> in the prose equals K[key] in that format.
3. No secret-looking text and none of the machine's private patterns appear in the page, src/ or the README.
"""
import json, os, re, sys, glob

H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
sys.path.insert(0, os.path.join(H, "..", "..", "src"))
import make_data  # noqa: E402
from private_patterns import alternation  # noqa: E402

page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
fails = 0

# 1. the data blob
before = open(os.path.join(H, "parts", "22_js_data.js")).read()
make_data.main.__globals__["print"] = lambda *a, **k: None
make_data.main()
now = open(os.path.join(H, "parts", "22_js_data.js")).read()
if now != before:
    print("22_js_data.js was stale: rebuilt from raw/; rerun build.sh"); fails += 1
blob = re.search(r"window\.SDATA=(\{.*?\});\n", page, re.S)
if not blob or blob.group(1) != now[len("window.SDATA="):-2]:
    print("index.html does not embed the current SDATA"); fails += 1
data = json.loads(now[len("window.SDATA="):-2])
K = data["K"]

# 2. numbers quoted in the prose
FMT = {"ms": lambda v: str(round(v * 1000)), "s1": lambda v: f"{v:.1f}", "s2": lambda v: f"{v:.2f}", "s3": lambda v: f"{v:.3f}", "c": lambda v: f"{int(v):,}",
       None: lambda v: str(int(v)) if float(v).is_integer() else str(v)}
n = 0
for m in re.finditer(r'<span data-k="([^"]+)"(?: data-f="([^"]+)")?>([^<]*)</span>', page):
    k, f, val = m.groups(); n += 1
    if k not in K:
        print("unknown key", k); fails += 1; continue
    want = FMT[f](K[k])
    if val != want:
        print(f"{k}: page says {val}, data says {want}"); fails += 1
print(f"{n} quoted numbers checked")

# 3. secrets and private patterns
files = [os.path.join(H, "..", "index.html"), os.path.join(H, "..", "README.md")] + \
        [f for f in glob.glob(os.path.join(H, "**", "*"), recursive=True) if os.path.isfile(f) and "__pycache__" not in f and not f.endswith("check_embed.py")]
bad = re.compile(r"glpat-|sk-ant-|Bearer [A-Za-z0-9._-]{12,}|/Users/[a-z]+/|" + alternation())
for f in files:
    try:
        t = open(f, encoding="utf-8", errors="ignore").read()
    except Exception:
        continue
    for m in bad.finditer(t):
        print("private or secret-looking text in", os.path.relpath(f, H), ":", m.group(0)[:20]); fails += 1
print("check_embed:", "ok" if not fails else f"{fails} problems")
sys.exit(1 if fails else 0)
