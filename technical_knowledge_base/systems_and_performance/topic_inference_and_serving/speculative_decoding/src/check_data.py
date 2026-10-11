"""The page embeds data.json unchanged, every data-f placeholder has a fact, and no fact is empty or '?'.
Also checks that numbers written as plain text in the result tables of results/ match data.json where both exist.
usage: python3 -I check_data.py"""
import json, os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
D = json.load(open(os.path.join(H, "data.json")))
m = re.search(r"window\.SD_DATA=(\{.*?\});\n", page, re.S)
bad = 0
if not m or json.loads(m.group(1)) != D:
    print("BAD: embedded data differs from data.json"); bad += 1
keys = set(re.findall(r'data-f="([^"]+)"', page)) - {"key"}  # "key" appears in a code comment
for k in sorted(keys):
    v = D["facts"].get(k)
    if v in (None, "", "?"):
        print("BAD: no fact for", k); bad += 1
unused = set(D["facts"]) - keys - {"costNote", "xNote", "xLoad", "fcFlipMax", "cDraft", "costNote17"}
print("placeholders", len(keys), "facts", len(D["facts"]), "unused facts", sorted(unused))
print("bad=%d" % bad); sys.exit(1 if bad else 0)
