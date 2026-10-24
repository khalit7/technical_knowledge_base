"""Check that the built page embeds exactly the recorded outputs: python3 check_embed.py
Reads ../../index.html, extracts window.FL_DATA, and compares every case's runs with out/<id>.json
(command, output, exit code, note), checks no case is missing and no secret-looking text is present."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.FL_DATA=(\{.*?\});\n", html, re.S)
if not m:
    sys.exit("FAIL: window.FL_DATA not found in index.html")
data = json.loads(m.group(1))
bad = 0; n = 0
files = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, "out")) if f.endswith(".json") and not f.startswith("_"))
ids = [c["id"] for c in data["cases"]]
for f in files:
    if f not in ids:
        print("FAIL: recorded but not on the page:", f); bad += 1
for c in data["cases"]:
    rec = json.load(open(os.path.join(HERE, "out", c["id"] + ".json")))["runs"]
    if len(rec) != len(c["runs"]):
        print("FAIL: run count differs:", c["id"]); bad += 1; continue
    for a, b in zip(c["runs"], rec):
        n += 1
        for k in ("cmd", "out", "rc", "note"):
            if a.get(k) != b.get(k):
                print(f"FAIL: {c['id']} {k} differs"); bad += 1
if re.search(r"glpat-|sk-ant-|Bearer\s+eyJ|PRIVATE KEY-----", m.group(1)):
    print("FAIL: secret-looking text embedded"); bad += 1
print(f"{len(data['cases'])} cases, {n} runs compared with out/*.json, failures={bad}")
sys.exit(1 if bad else 0)
