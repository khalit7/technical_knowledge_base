"""Build ../parts/30_js_ds_data.js (window.DS_DATA) from content.py, code/, outputs/ and llama/excerpts.json.
Every output shown on the page is the exact text of outputs/<axis>/<lang>/<name>.txt (check.py confirms)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import content as C
DIRECTIVE = re.compile(r'^(#|//)\s*(flags|edition|run|check|post|stdin|file|pre|cmd):')
def snippet(path):
    src = os.path.join(HERE, "code", path)
    code = "".join(l for l in open(src, encoding="utf-8") if not DIRECTIVE.match(l)).rstrip("\n")
    name = os.path.basename(path); stem = name.rsplit(".", 1)[0]
    helpers = []
    d = os.path.dirname(src)
    for h in sorted(os.listdir(d)):
        if h.startswith(stem + "__"):
            helpers.append({"name": h[len(stem) + 2:], "code": "".join(l for l in open(os.path.join(d, h), encoding="utf-8") if not DIRECTIVE.match(l)).rstrip("\n")})
    out = os.path.join(HERE, "outputs", os.path.dirname(path), stem + ".txt")
    return {"path": path, "name": name, "code": code, "helpers": helpers, "out": open(out, encoding="utf-8").read().rstrip("\n")}
S = {}
def ref(p):
    if p not in S: S[p] = snippet(p)
    return p
ex = json.load(open(os.path.join(HERE, "llama", "excerpts.json"), encoding="utf-8"))
data = {"langs": C.LANGS, "axes": C.AXES, "values": C.VALUES, "notes": C.TRACE_NOTES, "llama": ex,
        "cells": {}, "ffs": [], "ffValues": C.FF_VALUES, "tags": C.TAGS}
for (a, l), c in C.CELLS.items():
    c = dict(c); c["files"] = [ref(p) for p in c["files"]]
    for x in c["llama"]: assert x in ex["excerpts"], x
    data["cells"][a + "|" + l] = c
for f in C.FFS:
    f = dict(f); f["py"] = [ref(p) for p in f["py"]]; f["other"] = [ref(p) for p in f["other"]]
    data["ffs"].append(f)
data["snips"] = S
data["versions"] = open(os.path.join(HERE, "versions.txt"), encoding="utf-8").read().strip() if os.path.exists(os.path.join(HERE, "versions.txt")) else ""
vals = {i for v in C.VALUES.values() for i, _ in v["items"]}
for c in C.CELLS.values(): assert c["value"] in vals, c["value"]
assert len(C.CELLS) == len(C.AXES) * len(C.LANGS)
js = "window.DS_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
assert "—" not in js, "em-dash"
open(os.path.join(HERE, "..", "parts", "30_js_ds_data.js"), "w", encoding="utf-8").write(js)
print("snippets", len(S), "cells", len(C.CELLS), "ffs", len(C.FFS), "bytes", len(js))
