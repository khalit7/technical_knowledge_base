"""Confirm the built page embeds exactly the recorded outputs: window.PB in ../../index.html equals what build_data.py
makes from out/ now (adapted from the Python essentials page's src/pb/check_embed.py)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_data import build
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
emb = json.loads(re.search(r"window\.PB=(\{.*?\});\n", page).group(1).replace("<\\/", "</").replace("{\\u007b", "{{"))
fresh = build()
cur = json.loads(re.search(r"window\.PB=(\{.*\});", fresh, re.S).group(1).replace("<\\/", "</").replace("{\\u007b", "{{"))
on_disk = open(os.path.join(HERE, "..", "parts", "22_js_rd_0data.js"), encoding="utf-8").read()
ok1, ok2 = emb == cur, on_disk == fresh
print("embedded PB equals what out/ gives now:", ok1)
print("parts/22_js_rd_0data.js is up to date:", ok2)
print("ALL OK" if ok1 and ok2 else "MISMATCH")
sys.exit(0 if ok1 and ok2 else 1)
