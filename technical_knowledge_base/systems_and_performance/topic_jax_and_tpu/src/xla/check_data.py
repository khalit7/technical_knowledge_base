"""Check that index.html embeds exactly the data make_data.py writes from src/xla/out/*.json, that every
data-xc path in the tab resolves, and that numbers written into the tab's prose match the data.
Plain python3:  python3 src/xla/check_data.py   (exit 1 on any failure)"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..")
fails = []

# 1. regenerate into memory and compare with the part and with the built page
part = open(os.path.join(SRC, "parts", "32_js_xc_0data.js")).read()
before = part
subprocess.run([sys.executable, os.path.join(HERE, "make_data.py")], check=True, capture_output=True)
after = open(os.path.join(SRC, "parts", "32_js_xc_0data.js")).read()
if before != after:
    fails.append("parts/32_js_xc_0data.js was stale (regenerated now; rebuild the page)")
page = open(os.path.join(SRC, "..", "index.html")).read()
blob = after[after.index("window.XCD="):].strip()
if blob not in page:
    fails.append("index.html does not embed the current window.XCD (run src/build.sh)")
D = json.loads(blob[len("window.XCD="):-1])

# 2. every data-xc path in the tab resolves
tab = "".join(open(os.path.join(SRC, "parts", f)).read() for f in sorted(os.listdir(os.path.join(SRC, "parts"))) if f.startswith("32_tab_xla"))
for path in set(re.findall(r'data-xc="([^"|]+)', tab)):
    v = D
    for k in path.split("."):
        v = v.get(k) if isinstance(v, dict) else None
    if v is None:
        fails.append("data-xc path does not resolve: " + path)

# 3. numbers hard-written in prose, checked against data
P = json.load(open(os.path.join(HERE, "out", "pipeline.json")))
F = json.load(open(os.path.join(HERE, "out", "fusion_demo.json")))["demo"]
R = json.load(open(os.path.join(HERE, "out", "remat.json")))
checks = [
    ("29 equations", F["n_eqns"] == 29),
    ("4 kernels", F["n_kernels"] == 4),
    ("69 parameter arrays", len([r for r in P["jaxpr"]["flat_by_prim"]]) > 0 and P["donated_alias_count"] == 3 * 69 + 2),
    ("826,368 parameters", P["bytes"]["params"] == 826368 * 4),
    ("7B x 12 bytes = 84 GB", 7e9 * 12 / 1e9 == 84),
    ("remat k3 ~ k4 (no further saving)", abs(R["rows"][3]["temp_bytes"] - R["rows"][4]["temp_bytes"]) / R["rows"][4]["temp_bytes"] < 0.02),
    ("8.4 MB GELU activations", round(32 * 128 * 512 * 4 / 1e6, 1) == 8.4),
    ("about 90 ops in erfc kernel", 85 <= next(k for k in F["kernels"] if "erfc" in k["jax_prims"])["n_members"] <= 100),
    ("loss identical under remat", R["check"]["loss_none"] == R["check"]["loss_full_remat"]),
]
for name, ok in checks:
    if not ok:
        fails.append("prose number does not match data: " + name)
print("checks:", len(checks) + 3, "failures:", len(fails))
for f in fails:
    print("FAIL", f)
sys.exit(1 if fails else 0)
