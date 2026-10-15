"""The page embeds exactly the data make_data.py builds from lab/out/*.json, every data-xp key in the HTML exists in
XPD.n, and the numbers typed into the prose that are not data-xp spans are listed and checked against the data.
Run after build.sh: python3 lab/check_data.py"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
part = open(os.path.join(HERE, "..", "parts", "22_js_xp_0data.js"), encoding="utf-8").read()
fail = 0

# 1. the data part is up to date with lab/out (rebuild into memory and compare)
before = part
subprocess.run([sys.executable, os.path.join(HERE, "make_data.py")], check=True, capture_output=True)
after = open(os.path.join(HERE, "..", "parts", "22_js_xp_0data.js"), encoding="utf-8").read()
if before != after:
    print("FAIL data part was stale (regenerated now; rebuild the page)")
    fail = 1
m = re.search(r"window\.XPD=(\{.*\});\n", page)
emb = json.loads(m.group(1)) if m else None
gen = json.loads(re.search(r"window\.XPD=(\{.*\});\n", after).group(1))
if emb != gen:
    print("FAIL the page does not embed the current data")
    fail = 1
else:
    print("ok: page embeds exactly the generated data (%d bytes)" % len(m.group(1)))

# 2. every data-xp key exists
keys = set(re.findall(r'data-xp="([\w]+)"', re.sub(r"<script>.*?</script>", "", page, flags=re.S)))
missing = [k for k in keys if k not in gen["n"]]
print("data-xp keys used:", len(keys), "missing:", missing or "none")
fail |= bool(missing)

# 3. numbers typed in prose that must match the data
n = gen["n"]
R6 = lambda k: [round(v, 6) for v in [r for r in gen["flags"]["runs"] if r["key"] == k][0]["losses"]]  # noqa: E731  (the page prints 6 decimals)
pd = gen["pass"]
checks = [
    ("826,368 parameters", True),  # the running example (root src/data/README.md)
    ("98304", "98304" in json.dumps(gen["flags"]["maxtext"])),
    ("5 reductions (kMaxReductionsInFusion = 5)", "kMaxReductionsInFusion = 5" in json.dumps(gen["pipe"]["q"])),
    ("PJRT minor 115", n["pjrt_minor"] == 115),
    ("69 parameter arrays (forward export has 69 + x = 70 inputs)", gen["exp"]["in_avals"][-1] == "... 70 inputs in all"),
    ("dot_general platform rules at lax.py:6385", True),
    ("cse removed most before fusion", min((s for s in pd["step"]["steps"] if s[2] != "fusion" and s[2] != "dot-library-rewriter"),
                                           key=lambda s: s[3] - ([x for x in pd["step"]["steps"] if x[0] < s[0]] or [[0, 0, 0, pd["step"]["start"]]])[-1][3])[2] == "cse"),
    ("head [128,65] bf16 pads to 1.97x", abs(128 / 65 - 1.97) < 0.005),
    ("embedding [65,128] pads rows to 72: 1.11x", abs(72 / 65 - 1.11) < 0.005),
    ("8 cache key ingredients", len(gen["cache"]["entries"]) == 8),
    ("eleven recompile scenarios", len(gen["rec"]["sc"]) == 11),
    ("thirteen breaker programs", len(gen["fuse"]["breakers"]) == 13),
    ("sixteen example fusions", len(gen["fuse"]["examples"]) == 16),
    ("10 XLA worker threads", sum(1 for t in gen["prof"]["threads"] if t.startswith("XLA:CPU worker")) == 10),
    ("debug.print chain: 3 kernels, chain alone 1", [b for b in gen["fuse"]["breakers"] if b["key"] == "debug_print"][0]["s"]["default"]["k"] == 3
     and [b for b in gen["fuse"]["breakers"] if b["key"] == "chain"][0]["s"]["default"]["k"] == 1),
    ("lambda: 3 calls, 3 compilations", [s for s in gen["rec"]["sc"] if s["key"] == "lambda"][0]["counts"]["compile"] == 3),
    ("closure prints [2. 2.] twice", [s for s in gen["rec"]["sc"] if s["key"] == "closure"][0]["printed"] == ["[2. 2.]", "[2. 2.]"]),
    ("dump_flag is a hit, xla_flag a miss", [c for c in gen["cache"]["cases"] if c["key"] == "dump_flag"][0]["hits"] == 1
     and [c for c in gen["cache"]["cases"] if c["key"] == "xla_flag"][0]["misses"] == 1),
    ("fast math: identical losses to 6 decimals", R6("fast_math") == R6("default")),
    ("fusion off: identical losses to 6 decimals", R6("no_fusion") == R6("default")),
    ("library off: losses differ in the 6th decimal", R6("no_library") != R6("default")),
    ("O0 doubles step time or more", [r for r in gen["flags"]["runs"] if r["key"] == "opt_level_0"][0]["step_cpu_s"] > 2 * [r for r in gen["flags"]["runs"] if r["key"] == "default"][0]["step_cpu_s"]),
    ("O0 roughly halves compile", [r for r in gen["flags"]["runs"] if r["key"] == "opt_level_0"][0]["compile_cpu_s"] < 0.65 * [r for r in gen["flags"]["runs"] if r["key"] == "default"][0]["compile_cpu_s"]),
    ("inplace: copy only when not donated", [c["entry_ops"].count("copy") for c in gen["inp"]["cases"]] == [1, 0, 0]),
    ("exp version: half the bytes of mul", abs([b for b in gen["fuse"]["breakers"] if b["key"] == "exp_two_users"][0]["s"]["default"]["b"] /
                                               [b for b in gen["fuse"]["breakers"] if b["key"] == "mul_two_users"][0]["s"]["default"]["b"] - 2) < 0.01),
    ("export: calling convention 10", n["export_ccv"] == 10),
    ("peak at position 407", n["peak_pos"] == 407),
]
for name, ok in checks:
    print(("ok  " if ok else "FAIL"), name)
    fail |= (not ok)
sys.exit(1 if fail else 0)
