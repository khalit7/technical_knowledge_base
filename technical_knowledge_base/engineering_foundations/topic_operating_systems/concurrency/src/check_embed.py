"""Check that the built page carries exactly the recorded outputs and that every number written in the prose matches them.
1. window.CD.raw in ../index.html equals runs/out/*.txt byte for byte.
2. Every <b data-k="key">text</b> in the parts has text equal to CD.v[key] (the page also fills it from CD.v at load).
3. The lab counts in CD.labcheck equal inputs/recompute_out.json.
Usage: python3 check_embed.py   (exit 1 on any mismatch)"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
html = (HERE.parent / "index.html").read_text()
m = re.search(r"window\.CD=(\{.*?\});\n", html, re.S)
CD = json.loads(m.group(1))
bad = 0
for f in sorted((HERE / "runs/out").glob("*.txt")):
    if CD["raw"].get(f.stem) != f.read_text():
        print("raw output differs:", f.name); bad += 1
keys = 0
for p in sorted((HERE / "parts").glob("2*_read_*.html")):
    for k, txt in re.findall(r'data-k="([^"]+)">([^<]*)<', p.read_text()):
        keys += 1
        if k not in CD["v"]:
            print(f"{p.name}: unknown key {k}"); bad += 1
        elif CD["v"][k] != txt:
            print(f"{p.name}: {k} written {txt!r}, recorded {CD['v'][k]!r}"); bad += 1
rc = json.loads((HERE / "inputs/recompute_out.json").read_text())["lab"]
if rc != CD["labcheck"]:
    print("lab counts differ from recompute_out.json"); bad += 1
print(f"{len(CD['raw'])} raw outputs, {keys} numbers in prose checked, {bad} problems")
sys.exit(1 if bad else 0)
