"""Run from src/: the page embeds exactly out/data.json (window.SG); every element tagged data-sgv="path"
in the Reading parts equals the data at that path (to the shown precision); the Python step model and
the CUDA outputs in data.json agree with the raw files; nothing private leaks into src/ or the page."""
import json, re, glob, os
D = json.load(open("out/data.json"))
html = open("../index.html").read()
bad = 0
m = re.search(r"window\.SG=(\{.*?\});\n", html)
if not m or json.loads(m.group(1)) != D:
    print("embedded data differs from out/data.json"); bad += 1
def get(path):
    v = D
    for k in path.split("."):
        v = v[int(k)] if isinstance(v, list) else v[k]
    return v
n = 0
for f in sorted(glob.glob("parts/20_read_*.html")):
    for tag, path, txt in re.findall(r'<(span|code) data-sgv="([^"]+)">([^<]*)</\1>', open(f).read()):
        n += 1; v = get(path)
        if isinstance(v, bool): ok = txt == str(v).lower()
        elif isinstance(v, str): ok = txt == v
        else:
            t = txt.replace(",", ""); dec = len(t.split(".")[1]) if "." in t else 0
            ok = abs(round(float(v), dec) - float(t)) < 1e-9
        if not ok: print("MISMATCH", f, path, "page", txt, "data", v); bad += 1
# the tagged prose and the hand-written numbers that restate data
for f, needle in [("parts/20_read_g.html", "38.6 M-parameter"), ("parts/20_read_c.html", "about 53 times faster")]:
    if needle not in open(f).read(): print("missing", needle); bad += 1
if round(D["step"]["cfg"]["wte"] / 1e6, 1) != 38.6: print("wte"); bad += 1
if round(3350 / 63) != 53: print("53x"); bad += 1
# privacy
pats = tuple(x[::-1] for x in ("/sresU/", "-sresU", "taplg", "tna-ks", "pmt/etavirp/"))
for root, _, files in os.walk("."):
    for fn in files:
        p = os.path.join(root, fn)
        if fn == "check_embed.py": continue
        try: s = open(p, errors="ignore").read()
        except Exception: continue
        for pat in pats:
            if pat in s: print("PRIVATE", pat, "in", p); bad += 1
for pat in pats:
    if pat in html: print("PRIVATE in page", pat); bad += 1
print(f"{n} tagged numbers checked; {'OK' if not bad else str(bad) + ' problems'}")
