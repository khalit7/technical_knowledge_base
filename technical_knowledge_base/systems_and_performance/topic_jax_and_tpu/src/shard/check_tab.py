"""Check the Sharding lab against its recorded data. Plain Python.

    python3 check_tab.py
1. The page (../../index.html) embeds exactly the data sh_data.py builds from out/*.json.
2. Every number written as static prose in parts/34_tab_shard_*.html matches the data it comes from.
3. No absolute path, user name or e-mail in the lab's files.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PARTS = os.path.join(os.path.dirname(HERE), "parts")
fails = []


def ok(cond, what):
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        fails.append(what)


def load(n):
    with open(os.path.join(HERE, "out", n)) as f:
        return json.load(f)


# 1. embedded data
part = open(os.path.join(PARTS, "34_js_sh_0data.js")).read()
page = open(os.path.join(ROOT, "index.html")).read()
emb = re.search(r"window\.SHD=(\{.*?\});\n", page)
ok(emb is not None, "page embeds window.SHD")
if emb:
    ok("window.SHD=" + emb.group(1) + ";" in part, "embedded SHD identical to parts/34_js_sh_0data.js")
import subprocess  # noqa: E402
before = part
subprocess.run([sys.executable, "-I", "-B", os.path.join(HERE, "sh_data.py")], check=True, capture_output=True)
ok(open(os.path.join(PARTS, "34_js_sh_0data.js")).read() == before, "parts/34_js_sh_0data.js is what sh_data.py builds from out/*.json")

# 2. static prose numbers
st, pg, co = load("strategies.json"), load("playground.json"), load("collectives.json")
S = {r["id"]: r for r in st["strategies"]}
html = "".join(open(os.path.join(PARTS, f)).read() for f in sorted(os.listdir(PARTS)) if f.startswith("34_tab_shard"))
ok(st["params_total"] == 826368 and "826,368-parameter" in html, "826,368 parameters")
ok(128 * 512 * 4 == 262144 and "256 KiB" in html, "fc1.w is 256 KiB")
naive = S["fsdp_naive"]["grouped"]
ag = {}
for k, ph, g, b, n in naive:
    if k == "all-gather":
        ag[b] = ag.get(b, 0) + n
ok(ag.get(8388608) == 8 and "8 copies of the MLP hidden layer [32, 128, 512] (8 MiB each)" in html, "naive FSDP: 8 all-gathers of 8 MiB")
ok(ag.get(2097152) == 16 and "16 of [32, 128, 128] (2 MiB each)" in html, "naive FSDP: 16 all-gathers of 2 MiB")
ratio = S["fsdp_naive"]["summary"]["all-gather"]["bytes"] / S["fsdp"]["summary"]["all-gather"]["bytes"]
ok(31.5 < ratio < 32.5 and "about 32 times the all-gather bytes" in html, f"naive/fixed all-gather bytes = {ratio:.1f}")
tp = S["tp"]["summary"]
ok(tp == {"all-reduce": tp["all-reduce"]} and tp["all-reduce"]["count"] == 18 and "Shardy produced 18 all-reduces" in html, "TP: 18 all-reduces, nothing else")
fwd = sum(n for k, ph, g, b, n in S["tp"]["grouped"] if k == "all-reduce" and ph == "forward" and b == 1048576)
ok(fwd == 8 and "Measured here: 8 forward all-reduces for 4 blocks" in html, "TP: 8 forward all-reduces of 1 MiB")
ok(co["ring"]["sent_per_device_bytes"] == 2 * 7 * co["ring"]["array_bytes"] // 8, "hand ring all-reduce sends 2(n-1)/n N")
ok(co["mismatch_auto"]["ok"] and not co["mismatch_explicit"]["ok"], "shard_map mismatch: runs on Auto, refused on Explicit")
ok(all(r["max_err"] < 1e-6 for r in pg["rows"]) and len(pg["rows"]) == 108 and "All 108 combinations" in html, "playground: 108 compilations, all correct")
ok(max(r["max_abs_loss_diff_vs_single"] for r in st["strategies"]) < 2e-6, "all layouts within 2e-6 of one-device loss")
ok(st["steps"] == 20, "20 steps")

# 3. privacy
pat = re.compile(r"/Users/|Users-|khalid|glpat|sk-ant|[\w.]+@[\w-]+\.[a-z]{2,}")
for d in (HERE, PARTS):
    for f in os.listdir(d):
        if f.startswith(("34_", "sh_", "check_tab.mjs", "README", "viz_")):
            t = open(os.path.join(d, f)).read() if os.path.isfile(os.path.join(d, f)) else ""
            ok(not pat.search(t), "privacy " + f)
for f in os.listdir(os.path.join(HERE, "out")):
    ok(not pat.search(open(os.path.join(HERE, "out", f)).read()), "privacy out/" + f)
print("FAILED: %d" % len(fails) if fails else "ALL OK")
sys.exit(1 if fails else 0)
