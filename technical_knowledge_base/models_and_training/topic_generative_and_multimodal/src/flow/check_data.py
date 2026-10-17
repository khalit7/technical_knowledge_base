"""Check that the built page embeds exactly the Flow lab's recorded data, that every fact the HTML uses exists, that the
code shown equals the source files, and that key numbers equal the raw outputs.

    python3 check_data.py          (no GPU, no venv needed)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
O = os.path.join(HERE, "out")
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.FWD=(\{.*?\});\n", html)
assert m, "FWD not found in index.html"
page = json.loads(m.group(1))
rec = json.load(open(os.path.join(O, "page_data.json")))
bad = []
if page != rec:
    bad.append("embedded FWD differs from out/page_data.json")
J = lambda n: json.load(open(os.path.join(O, n)))
fm, rf, ex, toy = J("samples_fm_4000.json"), J("samples_reflow_2000.json"), J("samples_extra.json"), J("toy2d.json")
df = json.load(open(os.path.join(HERE, "..", "diff", "out", "samples_eps.json")))
# tables on the page equal the raw outputs
key = lambda r: (r["solver"], r["steps"], r["fd"], r["acc"])
if sorted(map(key, page["fm"])) != sorted(map(key, fm["samplers"])):
    bad.append("fm table")
if sorted(map(key, page["rf"])) != sorted(map(key, rf["samplers"])):
    bad.append("rf table")
if sorted((r["solver"], r["steps"], r["fd"]) for r in page["df"]) != sorted((r["sampler"], r["steps"], r["fd"]) for r in df["samplers"] if r["sampler"] != "euler"):
    bad.append("diffusion table")
if page["err"] != ex["ode_err"] or page["cfg"] != fm["cfg"]:
    bad.append("err or cfg")
if page["toy"]["nets"] != toy["nets"]:
    bad.append("toy nets")
# facts used in the prose
f = page["f"]
parts = "".join(open(os.path.join(HERE, "..", "parts", p), encoding="utf-8").read()
                for p in sorted(os.listdir(os.path.join(HERE, "..", "parts"))) if p.startswith("33_") and p != "33_js_fw_0data.js")
keys = set(re.findall(r'data-fw="([\w.]+)"', parts))
missing = sorted(k for k in keys if k not in f)
if missing:
    bad.append("missing facts: " + ", ".join(missing))
fd = {(r["solver"], r["steps"]): r for r in fm["samplers"]}
checks = {"fm_e1_fd": f"{fd[('euler', 1)]['fd']:.1f}", "floor_fd": f"{fm['floor_fd']:.2f}", "steps": "4,000",
          "train_sec": f"{J('train_fm_4000.json')['seconds']:.1f}"}
for k, v in checks.items():
    if f.get(k) != v:
        bad.append(f"{k}: page {f.get(k)} raw {v}")
# numbers inside generated sentences come from the same rows: spot-check two
if f"{fd[('euler', 4)]['fd']:.1f}" not in f["cmp_text"] or f"{fd[('midpoint', 2)]['fd']:.1f}" not in f["cmp_text"]:
    bad.append("cmp_text numbers")
# code shown equals the source
src = open(os.path.join(HERE, "fm_samplers.py")).read()
if page["code"]["samp"] not in src:
    bad.append("sampler code differs from fm_samplers.py")
obj = open(os.path.join(HERE, "..", "data", "objectives.py")).read()
if page["code"]["cfm"] not in obj:
    bad.append("cfm code differs from objectives.py")
print("facts", len(f), "keys used", len(keys), "tiles", sum(1 for _ in page["tiles"]), "->", "OK" if not bad else bad)
sys.exit(1 if bad else 0)
