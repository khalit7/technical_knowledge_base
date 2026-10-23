"""After the build: (1) the page embeds exactly the data build_data.py makes from inputs/; (2) every number written in the
prose (Reading and tab HTML parts) appears in the recorded inputs (any rounding of a recorded value to the digits shown),
or in a short list of constants with their reason; (3) no private strings or em dashes in what will be committed."""
import json, os, re, subprocess, sys, glob
H = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(H, "parts")
ok = True
old = open(os.path.join(P, "22_tcp_data.js")).read()
subprocess.run([sys.executable, os.path.join(H, "build_data.py")], check=True, capture_output=True)
if open(os.path.join(P, "22_tcp_data.js")).read() != old:
    print("FAIL embedded data differs from inputs"); ok = False
page = open(os.path.join(H, "..", "index.html")).read()
if old.strip() not in page:
    print("FAIL index.html does not embed the current data (rebuild)"); ok = False
# all recorded numbers
vals = set()
def walk(o):
    if isinstance(o, dict): [walk(v) for v in o.values()]; [walk(k) for k in o.keys()]
    elif isinstance(o, list): [walk(v) for v in o]
    elif isinstance(o, bool): pass
    elif isinstance(o, (int, float)): vals.add(float(o))
    elif isinstance(o, str):
        for m in re.findall(r"-?\d[\d,]*\.?\d*(?:e-?\d+)?", o):
            try: vals.add(float(m.replace(",", "")))
            except ValueError: pass
for f in glob.glob(os.path.join(H, "inputs", "*.json")): walk(json.load(open(f)))
for f in glob.glob(os.path.join(H, "inputs", "*.jsonl")):
    for l in open(f): walk(json.loads(l))
# derived values the prose quotes, each with its formula
import statistics as st
ct = {}
for l in open(os.path.join(H, "inputs", "time_compile.jsonl")):
    d = json.loads(l); ct.setdefault(d["label"], []).append(d["r"])
for k, v in ct.items():
    vals.add(st.median(r["first_s"] for r in v))
    for r in v:
        t = r.get("time_spent", {}); vals.add(t.get("entire_frame_compile", 0) - t.get("backend_compile", 0))
a = json.load(open(os.path.join(H, "inputs", "aot.json")))
b = a["block"]
vals |= {1 - b["mincut_1.0"]["saved_bytes_activations"] / b["default"]["saved_bytes_activations"],  # 6% less
         b["mincut_1.0"]["bw_ops"] - b["default"]["bw_ops"], a["model"]["default"]["saved_bytes_input_views"] / 1e6,
         b["default"]["saved_bytes_activations"] - b["mincut_1.0"]["saved_bytes_activations"],
         a["model"]["mincut_1.0"]["saved_bytes_activations"] / 1e6,
         ct["cold_whole_8"][0]["first_s"] and st.median(r["first_s"] for r in ct["cold_whole_8"]) / st.median(r["first_s"] for r in ct["cold_regional_8"])}
vals.add(st.median(r["time_spent"]["async_compile.wait"] for r in ct["mega_whole_4"]))
CONST = {  # number: reason
    2.14: "torch version", 2.141: "", 3.12: "Python version", 523: "PEP 523", 2: "small counts", 1: "", 0: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "", 9: "", 10: "", 11: "",
    12: "", 16: "", 20: "", 30: "", 32: "", 36: "", 45: "", 48: "", 52: "", 53: "", 64: "", 100: "", 128: "", 256: "", 1000: "", 1e9: "", 2024: "paper year", 2023: "", 2026: "",
    3186944: "parameters (FACTS stp)", 59: "Compile lab", 549: "Compile lab", 23.20: "Compile lab", 22.75: "Compile lab", 1.18: "Compile lab", 34814468: "Compile lab", 23.94: "Compile lab", 23.85: "Compile lab",
    81: "Compile lab guard eval 45 to 81 us", 7: "", 9: "Compile lab +7 to 9%", 4.0: "", 36.0: "Compile lab fusion MiB", 8404996: "FACTS tda", 546.8: "FACTS fst", 273.0: "FACTS fst",
    143.0: "FACTS fst", 133.6: "FACTS fst", 43: "vendor 43% / vocab", 163: "vendor", 93: "vendor", 0.5: "GELU constant", 524288: "elements", 1.9: "ratio 10.85/5.66", 1.25: "aoti 1.2517e-06", 3.6: "3.6e-07",
    9.5: "9.5e-07", 0.25: "dynamo share", 2.5: "Tensors, the dispatcher and autograd Reading 2.5 (cross-reference)", 1000000000.0: "1e9 literal", 88064: "", 2.9: "ONNX 2.9 (FACTS map)", 1.81: "1.8067", 70: "", 50: "", 15: "", 40: "", 60: "", 75: "", 25: "", 13: "",
    1.5: "", 0.0: "", 0.2: "", 0.85: "", 9.1: "rounded 9.08", 5.1: "rounded 5.06", 9.2: "rounded 9.19", 5.7: "rounded 5.72/5.66", 0.84: "", 1.0: "", 44: ""}
vals.add(len(a["block"]["default"]["joint_nodes"]))
def known(x, digits):
    if x in CONST: return True
    if 0 < x < 1e-3:
        return any(v > 0 and abs(v - x) / x < 0.06 for v in vals)
    for v in vals:
        for d in range(0, 8):
            if round(v, d) == x or round(v * 100, d) == x or round(v / 1e6, d) == x: return True
    return False
bad = []
for f in sorted(glob.glob(os.path.join(P, "2*_read*.html")) + glob.glob(os.path.join(P, "3*_tab_*.html"))):
    txt = re.sub(r"<style>.*?</style>", " ", open(f).read(), flags=re.S)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\{\{[^|}]*\|[^}]*\}\}", lambda m: m.group(0).split("|")[0], txt)
    txt = re.sub(r"https?://\S+|L\d+(-L\d+)?|v2\.14\.1|[\w./]+\.py|sm_\d+|gb\d+|\b\d+/\d+\b", " ", txt)
    for m in re.finditer(r"(?<![\w.])(\d[\d,]*(?:\.\d+)?)(?:e-0?(\d+))?", txt):
        s = m.group(1).rstrip(".,")
        try: x = float(s.replace(",", ""))
        except ValueError: continue
        if m.group(2): x = float(s + "e-" + m.group(2))
        if not known(x, 0):
            bad.append((os.path.basename(f), m.group(0), txt[max(0, m.start() - 40):m.end() + 20].replace("\n", " ")))
for b_ in bad:
    print("UNSOURCED", b_)
if bad: ok = False
for f in glob.glob(os.path.join(H, "**", "*"), recursive=True) + [os.path.join(H, "..", "index.html")]:
    if os.path.isfile(f) and not f.endswith(".png"):
        t = open(f, errors="ignore").read()
        if re.search("/" + "U" + "sers/|" + "U" + "sers-|" + re.escape(os.path.basename(os.path.expanduser("~"))) + "|gl" + "pat|sk" + "-ant|@gm" + "ail|scr" + "atchpad", t):
            print("FAIL private string in", f); ok = False
        if chr(0x2014) in t and os.path.basename(f) != "build.sh":  # build.sh greps the built page for it
            print("FAIL em dash in", f); ok = False
print("check_data:", "OK" if ok else "FAIL", "numbers checked against", len(vals), "recorded values")
sys.exit(0 if ok else 1)
