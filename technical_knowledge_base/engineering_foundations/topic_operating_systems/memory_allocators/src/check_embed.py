"""Checks the built page (../index.html) against the recorded outputs:
1. the embedded data (window.AD, AK, CACHE_SCEN) equals what gen_data.py makes from raw/ and sim/ now;
2. every number the prose quotes in a <span data-k="..."> equals the value computed from raw/ (sim/prose_numbers.json);
3. the recorded strace and Python outputs appear in the data verbatim (after the stated clean-up);
4. no private pattern (home path, tokens) is in the page or in src/."""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__)); page = open(os.path.join(H, "..", "index.html")).read()
ok = True
def fail(m):
    global ok; ok = False; print("FAIL", m)
data_js = open(os.path.join(H, "parts", "22_js_data.js")).read()
subprocess.run([sys.executable, os.path.join(H, "gen_data.py")], capture_output=True, check=True)
if open(os.path.join(H, "parts", "22_js_data.js")).read() != data_js: fail("22_js_data.js is stale: rebuild")
if data_js.split("\n", 1)[1] not in page: fail("page does not embed the current data file: run build.sh")
K = json.load(open(os.path.join(H, "sim", "prose_numbers.json")))
spans = re.findall(r'<span data-k="([^"]+)">([^<]*)</span>', page)
for k, v in spans:
    if k not in K: fail(f"unknown key {k}")
    elif K[k] != v: fail(f"{k}: prose {v} != measured {K[k]}")
D = json.loads(re.search(r"window.AD=(.*?);\nwindow.AK", data_js, re.S).group(1))
raw = lambda f: open(os.path.join(H, "raw", f)).read()
if D["pym"] != raw("pymalloc.txt").strip(): fail("pymalloc output differs")
if D["torch"] != raw("torch_cpu.txt").strip(): fail("torch strace differs")
for l in D["thr"][0] + D["thr"][1]:
    if not l.startswith("write(") and l not in raw("threshold.txt"): fail("threshold line not in raw: " + l)
for l in D["slab"].splitlines() + D["buddy"].splitlines():
    if l not in raw("kernel.txt"): fail("kernel line not in raw: " + l)
bad = re.compile("/" + "Users/|" + "glp" + "at|" + "sk-" + "ant")
for root, _, files in os.walk(os.path.join(H, "..")):
    if ".shots" in root: continue
    for f in files:
        p = os.path.join(root, f)
        try: t = open(p, errors="ignore").read()
        except Exception: continue
        if bad.search(t): fail("private pattern in " + os.path.relpath(p, H))
print(f"spans checked {len(spans)}, keys {len(K)}; " + ("all checks pass" if ok else "FAILED"))
sys.exit(0 if ok else 1)
