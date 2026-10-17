"""Check that the built page embeds exactly the Diffusion lab's recorded data, and that its facts match the raw outputs.

    python3 check_data.py          (no GPU, no venv needed)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
O = os.path.join(HERE, "out")
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.DFD=(\{.*?\});\n", html)
assert m, "DFD not found in index.html"
page = json.loads(m.group(1))
rec = json.load(open(os.path.join(O, "page_data.json")))
bad = []
if page != rec:
    bad.append("embedded DFD differs from out/page_data.json")
se, sv, sd = (json.load(open(os.path.join(O, n))) for n in ("samples_eps.json", "samples_v.json", "sd_lab.json"))
f = page["f"]
for r in se["samplers"]:
    k = f"fd_{r['sampler']}_{r['steps']}"
    if f[k].replace(",", "") != f"{r['fd']:.1f}":
        bad.append(k)
    if f"acc_{r['sampler']}_{r['steps']}" in f and f[f"acc_{r['sampler']}_{r['steps']}"] != f"{100 * r['acc']:.1f}%":
        bad.append("acc " + k)
for r in se["cfg"]:
    s = r["scale"]; k = str(int(s)) if s == int(s) else str(s)
    if f[f"acc_cfg_{k}"] != f"{100 * r['acc']:.1f}%":
        bad.append(f"acc_cfg_{k}")
for r in sv["samplers"]:
    if f[f"v_fd_{r['sampler']}_{r['steps']}"].replace(",", "") != f"{r['fd']:.1f}":
        bad.append("v " + r["sampler"])
if f["sd_pass"] != f"{sd['timing']['unet_pass_batch1_s']:.3f}":
    bad.append("sd_pass")
# every data-df key used in the parts exists
parts = "".join(open(os.path.join(HERE, "..", "parts", p), encoding="utf-8").read()
                for p in sorted(os.listdir(os.path.join(HERE, "..", "parts"))) if p.startswith("32_"))
js = "".join(open(os.path.join(HERE, "..", "parts", p), encoding="utf-8").read()
             for p in sorted(os.listdir(os.path.join(HERE, "..", "parts"))) if p.startswith("32_js_df_") and p != "32_js_df_0data.js")
keys = set(re.findall(r'data-df="([\w.]+)"', parts)) | set(re.findall(r"\bF\.(\w+)", js))
missing = sorted(k for k in keys if k not in f)
if missing:
    bad.append("missing facts: " + ", ".join(missing))
# the images on the page are the recorded thumbnails, byte for byte
import base64
for k, uri in page["sd"]["img"].items():
    if base64.b64decode(uri.split(",", 1)[1]) != open(os.path.join(O, "sd", k + ".webp"), "rb").read():
        bad.append("image " + k)
print("facts", len(f), "keys used", len(keys), "images", len(page["sd"]["img"]), "->", "OK" if not bad else bad)
sys.exit(1 if bad else 0)
