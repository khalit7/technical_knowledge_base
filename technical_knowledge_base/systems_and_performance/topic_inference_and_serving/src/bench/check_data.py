"""Confirm the page embeds exactly data.json, that data.facts equals recompute.facts(data), and that every
data-f placeholder in the tab's HTML names a fact. usage: python3 -I check_data.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from recompute import facts  # noqa: E402
data = json.load(open(os.path.join(HERE, "data.json")))
page = open(os.path.join(HERE, "..", "..", "index.html")).read()
m = re.search(r"window\.BCH_DATA=(\{.*?\});\n", page)
emb = json.loads(m.group(1))
ok = emb == data
print("page embeds data.json unchanged:", ok)
F = facts(data)
same = F == data["facts"]
print("data.facts equals recompute.facts(data):", same)
keys = set()
for f in os.listdir(os.path.join(HERE, "..", "parts")):
    if f.startswith("32_"):
        keys |= set(re.findall(r'data-f="(\w+)"', open(os.path.join(HERE, "..", "parts", f)).read()))
missing = sorted(k for k in keys if k not in F)
print("placeholders", len(keys), "missing facts", missing)
# a few spot checks of facts against the raw rows
q = {(r["quant"], r["pp"], r["tg"]): r["ts"] for r in data["lb"] if r["set"] == "lb_0.6b_quants"}
assert F["pp512_06q4"] == f'{q[("Q4_K_M", 512, 0)]:,.0f}'
assert F["kvTok"] == "114,688" and all(abs(r["kv_bytes_per_token"] - {"f16": 114688, "q8_0": 60928, "q4_0": 32256}[r["kv_type"]]) < 1 for r in data["kv"])
print("spot checks pass")
sys.exit(0 if ok and same and not missing else 1)
