"""Run from src/ after recompute.py: rewrites the text of every element tagged data-sgv="path" in the
Reading parts with the value at that path in out/data.json, keeping the number of decimals (and the
thousands separators) of the text already there. check_embed.py then verifies the result."""
import json, re, glob
D = json.load(open("out/data.json"))
def get(path):
    v = D
    for k in path.split("."):
        v = v[int(k)] if isinstance(v, list) else v[k]
    return v
def fmt(v, old):
    if isinstance(v, bool):
        return str(v).lower()
    if isinstance(v, str):
        return v
    t = old.replace(",", "")
    dec = len(t.split(".")[1]) if "." in t else 0
    s = f"{v:,.{dec}f}" if "," in old else f"{v:.{dec}f}"
    return s
n = 0
for f in sorted(glob.glob("parts/20_read_*.html")):
    s = open(f).read()
    def rep(m):
        global n; n += 1
        return f'<{m.group(1)} data-sgv="{m.group(2)}">{fmt(get(m.group(2)), m.group(3))}</{m.group(1)}>'
    s2 = re.sub(r'<(span|code) data-sgv="([^"]+)">([^<]*)</\1>', rep, s)
    if s2 != s:
        open(f, "w").write(s2)
print("filled", n)
