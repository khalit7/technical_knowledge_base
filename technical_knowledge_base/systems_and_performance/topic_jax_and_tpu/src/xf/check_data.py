"""Checks for the Transforms lab: the built page embeds exactly the data make_data.py writes from out/*.json,
and numbers written in the prose match the data. Usage: python3 check_data.py (after sh ../build.sh)."""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
PAGE = os.path.join(os.path.dirname(SRC), "index.html")
fails = 0


def ok(c, m):
    global fails
    print(("ok   " if c else "FAIL ") + m)
    fails += 0 if c else 1


part = open(os.path.join(SRC, "parts", "31_js_xf_0data.js"), encoding="utf-8").read()
subprocess.run([sys.executable, os.path.join(HERE, "make_data.py")], check=True, capture_output=True)
ok(open(os.path.join(SRC, "parts", "31_js_xf_0data.js"), encoding="utf-8").read() == part, "data part is up to date with out/*.json")
html = open(PAGE, encoding="utf-8").read()
m = re.search(r"window\.XFD=(\{.*?\});\n", html, re.S)
ok(m is not None and json.loads(m.group(1)) == json.loads(re.search(r"window\.XFD=(\{.*\});", part, re.S).group(1)), "page embeds exactly the generated data")
D = json.loads(m.group(1))
prose = "".join(open(os.path.join(SRC, "parts", f), encoding="utf-8").read() for f in sorted(os.listdir(os.path.join(SRC, "parts"))) if f.startswith("31_tab_xf"))
n_params = D["pytree"]["n_params"]
ok("826,368" in prose and n_params == 826368, f"parameter count in prose = data ({n_params})")
ok("Ten Python lines" in prose and len(D["trace"]["attention"]["src"]) == 10, "attention source is ten lines")
ok("5.656854152679443" in prose and any("5.656854152679443" in e for e in D["trace"]["attention"]["eqns"]), "folded constant appears in the jaxpr")
# section 6 (keys) moved to JAX core on 2026-10-23, with the 82% formula; the stub quotes the two agreements
ok("100% of 4,096 positions" in prose and "81.8%" in prose, "key-reuse stub quotes the recorded agreements")
ok("4,096 tokens" in prose and D["vmap"]["mlp_anim"]["batch"]["head"].count("4096") >= 1, "vmap batch is 4,096 tokens")
ok(D["vmap"]["B"] == 32 and D["vmap"]["T"] == 128 and "32 sequences of 128" in prose, "per-example run is 32 x 128")
ok("32544801" in prose and D["source"]["commit"].startswith("32544801"), "pinned commit in prose = source data")
ok(D["basics"]["async"]["label"].find("1024x1024") >= 0, "async timing is the 1024 x 1024 matmul named in prose")
dr = {d["id"]: d for d in D["drills"]}
ok(dr["lambda"]["compiles"] == 3 and dr["inline"]["compiles"] == 1, "drill prose (3 compiles per 3 lambda steps, 1 for re-wrap) matches counts")
ok(all(d["compiles"] == d["answer"] for d in D["drills"]), "every drill's written explanation matches its measured compile count")
ok(D["prng8"]["devices"] == 8, "PRNG check ran on 8 devices")
ok(D["vmap"]["agree"]["vmap_vs_loop"] < 1e-6 and D["grad"]["summary"]["max_abs_diff"] < 1e-6, "agreement figures within float32 noise")
print("FAILED", fails if fails else "") if fails else print("all data checks passed")
sys.exit(1 if fails else 0)
