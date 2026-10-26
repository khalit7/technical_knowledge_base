"""Confirm the built page embeds exactly the recorded outputs: window.PB in ../../index.html equals what build_data.py
makes from out/ now. Copied from the language page's src/pb/check_embed.py (2026-10-26) and trimmed to this page."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.PB=(\{.*?\});\n", page)
emb = json.loads(m.group(1).replace("<\\/", "</"))
dpath = os.path.join(HERE, "..", "parts", "22_js_ci_0pb.js")
data = open(dpath, encoding="utf-8").read()
cur = json.loads(re.search(r"window\.PB=(\{.*\});", data, re.S).group(1).replace("<\\/", "</"))
ok = emb == cur
print("embedded PB equals parts/22_js_ci_0pb.js:", ok)
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
fresh = open(dpath, encoding="utf-8").read()
print("data file is up to date with out/:", fresh == data); ok &= fresh == data
# the JIT numbers quoted in the prose come from out/jit.json
J = emb["jit"]["runs"]; r = lambda v, c: J[f"{v}|{c}|0"]["median_s"] / J[f"{v}|{c}|1"]["median_s"]
parts = "".join(open(os.path.join(HERE, "..", "parts", p), encoding="utf-8").read() for p in sorted(os.listdir(os.path.join(HERE, "..", "parts"))) if p.startswith("20_read"))
want = [f"{r('3.15', 'char_loop'):.2f}x", f"{r('3.13', 'char_loop'):.2f}x", f"{r('3.15', 'json_count'):.1f}x"]
miss = [w for w in want if w not in parts]
print("JIT ratios quoted in the prose:", "ok" if not miss else miss); ok &= not miss
print("ALL OK" if ok else "MISMATCH")
sys.exit(0 if ok else 1)
