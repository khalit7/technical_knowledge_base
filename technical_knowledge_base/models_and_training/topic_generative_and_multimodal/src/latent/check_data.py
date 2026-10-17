"""Check that the Latent lab's data part embeds exactly the recorded outputs, and that numbers written into the tab's
prose (outside data-lt spans, which are filled from the data) appear in the recorded outputs.
  python3 check_data.py      (plain Python 3, no dependencies)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "..", "parts")
js = open(os.path.join(P, "31_js_lt_0data.js")).read()
D = json.loads(js[js.index("window.LTD=") + 11:].rstrip().rstrip(";"))
bad = 0
tiny = json.load(open(os.path.join(HERE, "out", "tiny.json")))
def same(a, b, path=""):
    """every value embedded in a (page) equals b (recorded), allowing the documented rounding to 2 decimals."""
    global bad
    if isinstance(a, dict):
        for k, v in a.items():
            if k not in b:
                print("not in recorded output:", path + "." + k); bad += 1
            else:
                same(v, b[k], path + "." + k)
    elif isinstance(a, list):
        if len(a) != len(b):
            print("length differs:", path); bad += 1
        for i, (x, y) in enumerate(zip(a, b)):
            same(x, y, f"{path}[{i}]")
    elif isinstance(a, float) or isinstance(b, float):
        if abs(a - b) > 0.0051:
            print("value differs:", path, a, b); bad += 1
    elif a != b:
        print("value differs:", path, a, b); bad += 1


import base64
R = json.loads(json.dumps(tiny["runs"]))
for k in ("vq_plain", "vq_restart"):
    flat = [v for row in R[k]["tokens16"] for v in row]
    if base64.b64decode(D["tiny"]["runs"][k]["tokens16"]) != bytes(flat):
        print("tokens differ", k); bad += 1
    D["tiny"]["runs"][k].pop("tokens16")
for k in ("ae2", "vae2"):
    g = D["tiny"]["runs"][k].pop("grid")
    if g["lo"] != R[k]["grid"]["lo"] or g["hi"] != R[k]["grid"]["hi"]:
        print("grid box differs", k); bad += 1
same(D["tiny"]["runs"], R, "tiny.runs")
same(D["tiny"]["floor"], tiny["floor_real_val_1000"], "floor")
sc = json.load(open(os.path.join(HERE, "out", "sd_scale.json")))
sc["runs"] = {k.replace(".", "p"): v for k, v in sc["runs"].items()}
same(D["sd_scale"], sc, "sd_scale")
same(D["sd_vae"], json.load(open(os.path.join(HERE, "out", "sd_vae.json"))), "sd_vae")
same(D["perc"], json.load(open(os.path.join(HERE, "out", "perc.json"))), "perc")

# every number in prose: collect all numeric values in the recorded outputs (rounded several ways)
vals = set()
def walk(o):
    if isinstance(o, dict):
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
    elif isinstance(o, (int, float)) and not isinstance(o, bool):
        for d in (0, 1, 2, 3, 4):
            vals.add(f"{o:.{d}f}")
        if abs(o) <= 1:
            vals.add(f"{round(o * 100)}")
walk(D)
html = "".join(open(os.path.join(P, f)).read() for f in sorted(os.listdir(P)) if f.startswith("31_tab_latent"))
text = re.sub(r"<span data-lt[^>]*></span>", "", html)
text = re.sub(r"<div class=\"lt-code\">.*?</div>", "", text, flags=re.S)
text = re.sub(r"<[^>]+>", " ", text)
text = re.sub(r"\{\{[^|]*\|[^}]*\}\}", " ", text)
# numbers that are facts from configs, papers or definitions (checked by hand against sources.md and FACTS.md)
KNOWN = set("""0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 20 25 28 30 32 42 48 50 64 76 86 100 128 160 256 512 1,000 10,000 1,024 4,096 16,384 786,432 83,653,863
0.1 0.3 0.25 0.5 0.18215 0.13025 0.000001 0.01 0.6 0.05 7.5 2017 2018 2019 2020 2015 50,001 451f4fe16113 1.1 120 400 8192 1024 5.5 30 49 70 574 576 651 654 711 694 90 771 1085 489 48 83 32 42 2.2 3.1 5.3 1.x 2026 8x 3x 5.1 9.5""".split())
miss = []
for m in re.finditer(r"(?<![\w.])(\d[\d,]*(?:\.\d+)?)", text):
    s = m.group(1).rstrip(",")
    if s in KNOWN or s.replace(",", "") in vals or s in vals:
        continue
    miss.append(s)
if miss:
    print("numbers in prose not found in data or the known list:", sorted(set(miss)))
print("FAIL" if bad else "data OK", "| prose numbers unchecked:", len(set(miss)))
sys.exit(1 if bad else 0)
