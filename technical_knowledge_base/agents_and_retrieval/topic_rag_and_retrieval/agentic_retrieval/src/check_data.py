"""Checks that the page embeds exactly the recorded data, that prose numbers come from it, and lists what is pending.
1. build_data.py reproduces parts/22_ar_data.js and facts.json byte for byte; ../index.html embeds that object.
2. No @@key@@ left in the page; every fact value used in the parts appears in the page.
3. Independent cross-checks against the root's committed outputs (strategies.json, hops.json, position.json) and
   against a timing measured by another page (RAG in production child: 9,338 ms at 7,611 prompt tokens).
4. Every pending (null) result in data/pending.json is listed: those numbers are shown as dashed boxes, never typed.
5. Privacy grep over every file of this page folder that would be committed.
Run: $RAG_SCRATCH/venv/bin/python -I -B check_data.py   (no generator, no lock)"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.normpath(os.path.join(HERE, ".."))
ROOT = os.path.normpath(os.path.join(PAGE, "..", "src"))
bad = []


def ok(c, msg):
    print(("ok   " if c else "FAIL ") + msg)
    if not c:
        bad.append(msg)


before = (open(os.path.join(HERE, "parts", "22_ar_data.js")).read(), open(os.path.join(HERE, "facts.json")).read())
subprocess.run([sys.executable, "-I", "-B", os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
after = (open(os.path.join(HERE, "parts", "22_ar_data.js")).read(), open(os.path.join(HERE, "facts.json")).read())
ok(before == after, "build_data.py reproduces 22_ar_data.js and facts.json byte for byte")
html = open(os.path.join(PAGE, "index.html")).read()
m = re.search(r"window\.AR=(\{.*?\});\n", html, re.S)
AR = json.loads(m.group(1))
ok(AR == json.loads(after[0][len("window.AR="):-2]), "the page embeds exactly 22_ar_data.js")
D = lambda n: json.load(open(os.path.join(HERE, "data", n)))  # noqa: E731
out, tr, hops, pend = D("outcomes.json"), D("traj.json"), D("hops.json"), D("pending.json")
ok(AR["tax"] == tr["tax"] and AR["beh"] == tr["beh"] and AR["cur"] == tr["cur"], "trajectory summaries embedded unchanged")
ok(AR["comp"]["rows"][0]["react"]["a"] == tr["comp"][0]["react"]["a"] and len(AR["comp"]["rows"]) == 40, "comparer rows are the first 40")
ok(all(AR["out"]["res"][s]["f1"] == out["res"][s]["f1"] for s in AR["out"]["strategies"]), "per-question F1 embedded unchanged")
# 2. facts in prose
F = json.load(open(os.path.join(HERE, "facts.json")))
ok("@@" not in html, "no unfilled @@key@@ in the page")
used = set()
for fn in os.listdir(os.path.join(HERE, "parts")):
    if fn.endswith(".html"):
        used |= set(re.findall(r"@@(\w+)@@", open(os.path.join(HERE, "parts", fn)).read()))
miss = [k for k in used if k not in F]
ok(not miss, "every @@key@@ used in the parts exists in facts.json %s" % (miss or ""))
ok(all(F[k] in html for k in used if k in F), "every used fact value appears in the page (%d used of %d)" % (len(used), len(F)))
# 3. cross-checks
SJ = json.load(open(os.path.join(ROOT, "agent", "out", "strategies.json")))["1.7b"]
for s in ("closed", "single_k5", "react", "decomp", "longctx"):
    mine = sum(out["res"][s]["f1"]) / 200
    ok(abs(mine - SJ[s]["f1"]) < 0.002, "F1 %s %.3f = root strategies.json %.3f" % (s, mine, SJ[s]["f1"]))
RH = json.load(open(os.path.join(ROOT, "agent", "out", "hops.json")))
ok(200 - hops["need_second"] == RH["systems"]["bge-small"]["both"]["3"], "questions needing a second hop (%d) = 200 - root's both-in-top-3 (%d)" % (hops["need_second"], RH["systems"]["bge-small"]["both"]["3"]))
ok(sum(out["both5"]) == RH["systems"]["bge-small"]["both"]["5"], "both gold in top 5 (%d) = root hops.json" % sum(out["both5"]))
pp = os.path.join(ROOT, "agent", "out", "position.json")
if os.path.exists(pp) and pend.get("root_position"):
    RP = json.load(open(pp))["1.7b"]["f1"]
    mine = [pend["root_position"]["1.7b"]["f1"][k] for k in ("0", "4", "9", "14", "18")]
    ok(all(abs(a - b) < 0.0015 for a, b in zip(mine, RP)), "position F1 by slot = root position.json %s" % RP)
if os.path.exists(pp):
    PJ = json.load(open(pp))
    for m, key, txt in (("1.7b", "first_vs_middle", "+0.116 (paired 95% interval +0.063 to +0.168)"), ("1.7b", "last_vs_middle", "+0.087 (+0.045 to +0.130)"),
                        ("4b", "first_vs_middle", "+0.128, interval +0.055 to +0.207")):
        d = PJ[m][key]
        ok(("%+.3f" % d["diff"]) in txt and ("%+.3f" % d["ci"][0]) in txt and ("%+.3f" % d["ci"][1]) in txt and txt in html,
           "position text '%s' = root position.json %s %s" % (txt, m, key))
lc = D("longctx.json")
a, b, c = lc["coef"]
p7611 = a + b * 7611 + c * 7611 * 7611 / 2 / 1000
ok(abs(p7611 - 9338) / 9338 < 0.05, "prefill model at 7,611 tokens %.0f ms within 5%% of the production child's measured 9,338 ms" % p7611)
tl = D("tool.json")
ok(tl["formula_mape"] < 0.05, "loop token formula within 5%% of recorded billed tokens (%.3f)" % tl["formula_mape"])
# 4. pending
nulls = []


def walk(o, p=""):
    if o is None:
        nulls.append(p)
    elif isinstance(o, dict):
        for k, v in o.items():
            walk(v, p + "." + k if p else k)


walk(pend)
print("PENDING (%d): %s" % (len(nulls), ", ".join(nulls)))
# 5. privacy
import getpass  # noqa: E402
_terms = ["/" + "Us" + "ers/", "Us" + "ers-", "gl" + "pat", "sk" + "-ant", re.escape(getpass.getuser())]
pat = re.compile("|".join(_terms) + r"|[\w.-]+@[\w-]+\.(com|ai|io|org)\b", re.I)
hits = []
for dp, dn, fns in os.walk(PAGE):
    if ".shots" in dp or "__pycache__" in dp:
        continue
    for fn in fns:
        pth = os.path.join(dp, fn)
        try:
            t = open(pth, encoding="utf-8").read()
        except Exception:
            continue
        for mm in pat.finditer(t):
            hits.append("%s: %s" % (os.path.relpath(pth, PAGE), mm.group(0)))
ok(not hits, "privacy grep clean %s" % hits[:5])
big = [f for dp, dn, fns in os.walk(PAGE) for f in fns if ".shots" not in dp and os.path.getsize(os.path.join(dp, f)) > 4e6]
ok(not big, "no file over 4 MB")
print("FAILED %d" % len(bad) if bad else "ALL CHECKS OK")
sys.exit(1 if bad else 0)
