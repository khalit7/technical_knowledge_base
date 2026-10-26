"""Confirm the built page embeds exactly the recorded outputs: window.PB in ../../index.html equals what build_data.py
makes from out/ now, and the orjson lines shown come from out/orjson_ft.txt. Copied from the language page and trimmed."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.PB=(\{.*?\});\n", page)
emb = json.loads(m.group(1).replace("<\\/", "</"))
dpath = os.path.join(HERE, "..", "parts", "22_js_cg_0pb.js")
data = open(dpath, encoding="utf-8").read()
cur = json.loads(re.search(r"window\.PB=(\{.*\});", data, re.S).group(1).replace("<\\/", "</"))
ok = emb == cur
print("embedded PB equals parts/22_js_cg_0pb.js:", ok)
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
fresh = open(dpath, encoding="utf-8").read()
print("data file is up to date with out/:", fresh == data); ok &= fresh == data
orj = open(os.path.join(HERE, "out", "orjson_ft.txt")).read()
hit = len(emb["orjson"]) >= 2 and all(re.sub(r"\(\.\.\.\)", "", l).split("(")[0].strip() in orj for l in emb["orjson"])
print("orjson lines come from out/orjson_ft.txt:", hit); ok &= hit
print("ALL OK" if ok else "MISMATCH")
sys.exit(0 if ok else 1)
