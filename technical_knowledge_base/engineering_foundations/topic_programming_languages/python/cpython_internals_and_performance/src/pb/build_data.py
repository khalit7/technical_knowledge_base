"""Collect the recorded outputs this page shows (the 21 version snippets, the JIT runs, the lazy-import runs) from out/
into ../parts/22_js_ci_0pb.js as window.PB. Copied from the language page's src/pb/build_data.py (2026-10-26) and trimmed
to this page. Nothing here is typed by hand except features.py (descriptions with sources); outputs are copied verbatim."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from features import FEATURES
O = lambda *p: os.path.join(HERE, "out", *p)


def src(path):
    return open(path).read().rstrip("\n")


PB = {}
v = json.load(open(O("versions.json")))
PB["ver"] = {"interpreters": v["interpreters"], "features": [
    {"id": f[0], "v": f[1], "kind": f[2], "title": f[3], "pep": f[4], "url": f[5], "note": f[6],
     "src": src(os.path.join(HERE, "versions", f[0] + ".py")), "runs": v["runs"][f[0]]} for f in FEATURES]}
PB["jit"] = json.load(open(O("jit.json")))
PB["lazy"] = json.load(open(O("lazy.json")))
js = "// written by src/pb/build_data.py from src/pb/out; do not edit by hand\nwindow.PB=" + json.dumps(PB, ensure_ascii=False, separators=(",", ":")) + ";\n"
js = js.replace("</", "<\\/").replace("{{", "{\\u007b")  # keep build.sh from reading C braces as links
open(os.path.join(HERE, "..", "parts", "22_js_ci_0pb.js"), "w").write(js)
print("22_js_ci_0pb.js", len(js.encode()), "bytes")
