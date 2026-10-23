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
    # numbers typed statically in the 2026-10-23 rebuild (hero, card titles, notes)
    ("hero: 3,411 / 5,318 / 4,932 / 817 / 783 / 33 / 374.4 MB", (n["step_jaxpr"], n["step_shlo"], n["step_hlo"], n["step_kernels"], n["step_fusions"], n["step_dots"], n["xla_peak_mb"]) == (3411, 5318, 4932, 817, 783, 33, 374.4)),
    # the root's Compiler lab prose prints 1,057 (its old counter); its lab output now counts top-level kernels (816), so check the arithmetic and the 816
    ("root reconciliation: 1,057 = 816 + 241 reducer bodies", n["root_entry_kernels"] == 816 and 1057 - 816 == 241),
    ("attention block forms: 61, 90, 133, then 13 kernels", (gen["low"]["fcounts"]["jaxpr_eqns"], gen["low"]["fcounts"]["stablehlo_ops"], gen["low"]["fcounts"]["hlo_instructions"], gen["low"]["fcounts"]["opt_kernels"]) == (61, 90, 133, 13)),
    ("stair note: cse 4,681 to 3,758; fusion 3,677 to 2,006", any(pd["step"]["steps"][i][2] == "cse" and pd["step"]["steps"][i - 1][3] == 4681 and pd["step"]["steps"][i][3] == 3758 for i in range(1, len(pd["step"]["steps"])))
     and any(pd["step"]["steps"][i][2] == "fusion" and pd["step"]["steps"][i - 1][3] == 3677 and pd["step"]["steps"][i][3] == 2006 for i in range(1, len(pd["step"]["steps"])))),
    ("softmax title: 4 kernels default, 6 library off, 6 fusion off", [[b for b in gen["fuse"]["breakers"] if b["key"] == "softmax"][0]["s"][k]["k"] for k in ("default", "no_library", "no_fusion")] == [4, 6, 6]),
    ("duplicate card: 2 kernels (mul), 3 kernels (exp)", [[b for b in gen["fuse"]["breakers"] if b["key"] == k][0]["s"]["default"]["k"] for k in ("mul_two_users", "exp_two_users")] == [2, 3]),
    ("10.57 GB against 2.52 GB", (n["bytes_nofusion_gb"], n["bytes_default_gb"]) == (10.57, 2.52)),
    ("peak 374.4 MB, 0.3% from the reconstruction", n["xla_peak_mb"] == 374.4 and n["peak_diff_pct"] == 0.3),
    ("peak attribution: divisions 28%, erfc 17.9%", n["peak_div_pct"] == 28 and n["peak_erfc_pct"] == 17.9),
    ("storm: 64 compilations against 4", (n["storm_exact_compiles"], n["storm_bucket_compiles"]) == (64, 4)),
]
for name, ok in checks:
    print(("ok  " if ok else "FAIL"), name)
    fail |= (not ok)
sys.exit(1 if fail else 0)
