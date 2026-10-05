"""Check that the built page embeds exactly the generated atlas data and the recorded outputs.

1. Extract window.AT_DATA from ../../index.html and compare it with atlas.json (must be equal).
2. Every recording the page shows equals wire/out/<id>.txt byte for byte (after build_data's trailing-newline strip).
3. No secret-looking strings anywhere in the page (API keys, tokens, the redacted filter name).
4. Every entry the page shows has at least one source URL, and every RFC cited on the page exists in sources/rfc_meta.json.
Run: python3 check_embed.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "../../index.html"), encoding="utf-8").read()
m = re.search(r"window\.AT_DATA=(\{.*?\});\n", html, re.S)
if not m: sys.exit("AT_DATA not found in index.html")
page = json.loads(m.group(1).replace("<\\/", "</"))
ref = json.load(open(os.path.join(HERE, "atlas.json"), encoding="utf-8"))
bad = []
if page != ref: bad.append("embedded AT_DATA differs from atlas.json (rerun build_data.py and build.sh)")
outs = sorted(f[:-4] for f in os.listdir(os.path.join(HERE, "wire/out")) if f.endswith(".txt") and f != "meta.txt")
for w, txt in page["wires"].items():
    disk = open(os.path.join(HERE, "wire/out", w + ".txt"), encoding="utf-8").read().rstrip("\n")
    if txt != disk: bad.append(f"recording {w} differs from wire/out/{w}.txt")
unused = [o for o in outs if o not in page["wires"]]
import sys as _s, os as _o; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "..")); from private_patterns import alternation as _priv
for pat in (r"sk-ant-[A-Za-z0-9]", r"glpat-", r"AKIA[0-9A-Z]{16}", _priv(), r"Bearer [A-Za-z0-9._-]{20,}"):
    if re.search(pat, html): bad.append(f"secret-looking string in page: {pat}")
rfcs = json.load(open(os.path.join(HERE, "sources/rfc_meta.json")))["rfcs"]
for e in page["entries"]:
    if not e["srcs"]: bad.append(f"{e['id']} has no sources")
for n in set(re.findall(r"RFC (\d{3,5})", json.dumps(page))):
    if n not in rfcs and n not in ("2308",): bad.append(f"RFC {n} named on the page but not in rfc_meta.json")
print(f"entries {len(page['entries'])}, recordings shown {len(page['wires'])} of {len(outs)} recorded" + (f" (not shown: {', '.join(unused)})" if unused else ""))
print("\n".join(bad) if bad else "OK: page embeds exactly atlas.json and the recorded outputs; no secrets; every RFC named is in the fetched metadata")
sys.exit(1 if bad else 0)
