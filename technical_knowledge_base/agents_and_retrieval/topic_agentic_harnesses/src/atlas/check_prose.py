#!/usr/bin/env python3
"""Harness atlas: prove hand-written numbers in the tab agree with the data and sources, and that the tab's
files hold no private strings or em-dashes. Run after build_data.py and build.sh."""
import json, re, getpass
# private strings built at run time so this file does not contain them: home prefix, scratch-dir form, user name, token prefixes, em-dash
PRIVATE = ["/" + "Us" + "ers/", "Us" + "ers-", getpass.getuser(), "gl" + "pat", "sk" + "-ant", "\u2014"]
import subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent; P = HERE.parent / "parts"
html = (P / "33_tab_atlas.html").read_text()
js = "".join((P / f).read_text() for f in ["33_js_atl_b_core.js", "33_js_atl_c_scores.js", "33_js_atl_d_anim.js", "33_js_atl_e_more.js"])
A = json.loads(re.search(r"window\.ATL=(.*);\s*$", (P / "33_js_atl_a_data.js").read_text(), re.S).group(1))
ok = 0
def check(cond, what):
    global ok
    if not cond: raise SystemExit("FAIL: " + what)
    ok += 1
an = A["anim"]; L, C = an["loop"]["calls"], an["cc"]["calls"]
cin = lambda c: c[0] + c[1] + c[2]
check(13000 <= cin(C[0]) < 13500, "Claude Code first call about 13,000: %d" % cin(C[0]))
check(15 <= cin(C[0]) / cin(L[0]) < 20, "nearly twenty times: %.1f" % (cin(C[0]) / cin(L[0])))
check(min(cin(c) for c in L) >= 700 and max(cin(c) for c in L) <= 2250, "small harness 700 to 2,200")
pr = lambda c: (c[0] * 1 + c[1] * 2 + c[2] * 0.1 + c[3] * 5) / 1e6
lc, cc = sum(map(pr, L)), sum(map(pr, C))
check(abs(cc - an["cc"]["cost"]) < 1e-6, "Claude Code cost reproduces CLI: %.6f vs %.6f" % (cc, an["cc"]["cost"]))
check(abs(lc - cc) / cc < 0.1, "two land close in dollars: %.4f vs %.4f" % (lc, cc))
o = A["sets"]["tb20"]["rows"]; opus = [r for r in o if r["m"] == "Claude Opus 4.6"]
check(len(opus) == 9 and "nine agents in all" in html, "Opus 4.6 nine agents")
check(min(opus, key=lambda r: r["v"])["h"] == "Claude Code" and max(opus, key=lambda r: r["v"])["h"] == "Meta-Harness", "Opus 4.6 ends")
blog = (HERE.parent.parent.parent.parent / "measurement/topic_benchmarks/agentic/src/inputs/arena_harness_tax_2026-09-16_text.txt").read_text()
for s in ["2.0× as much as Pi and 1.6× as much as Codex on SWE-bench Lite", "within ±2% on SWE-bench Lite and within about ±5% on Terminal-Bench 2.0", "97.8% of attempts in Claude Code, 96.7% in Codex and 96.7% in Pi", "($1.33 vs $0.67)"]:
    check(s in blog, "HarnessTax blog says: " + s)
check("7 models x 3 harnesses" in A["htm"]["design"] and "30 random tasks" in A["htm"]["design"], "HarnessTax design")
lego = {(p["model"].split(" (")[1][:4], p["harness"]): p["value"] for p in A["lego"]}
check(lego[("base", "OpenHands SDK")] == 64.0 and lego[("afte", "OpenCode")] == 66.6, "LEGO-RL values")
st = " ".join(s["numbers"] for s in A["studies"])
check("+22.6 in Codex" in st and "+0.6 Qwen Code" in st, "Polar gains")
pages = HERE.parent.parent.parent.parent / "reference/papers"
txt = lambda p: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", (pages / p / "index.html").read_text()))
tu = txt("terminal_universe"); check("52.1 vs 36.7" in tu and "37,273 of 359,593" in tu, "Terminal-Universe numbers")
check("3 M sandboxes a day" in txt("dsec"), "DSec 3M a day")
for p, nums in [("harnessdev", ["67.8 vs 86.2", "34 of 64", "69.3 to 33.0"]), ("jit_agent", ["74.1 → 81.8", "14.9 to −54.1%"]),
                ("sol_pi", ["44.7", "93.7% and 94.3%"]), ("prime_agent", ["95.5%", "95.0, 95.2, 95.5"]), ("statem", ["92.1% vs 83.1%"]),
                ("neohorse_1", ["58.94 → 64.87"]), ("rrsi", ["+14.1", "+1.8 to +4.7", "+0.6"])]:
    t = txt(p)
    for n in nums: check(n in t, p + " page says " + n)
x = A["x"]["totals"]; check(x["calls"] == 11, "experiment calls")
check(A["x"] == json.load(open(HERE / "inputs/mswe_attempt_2026-10-05.json")), "page embeds exactly the redacted experiment summary")
files = [P / f for f in ["33_tab_atlas.html", "33_js_atl_a_data.js", "33_js_atl_b_core.js", "33_js_atl_c_scores.js", "33_js_atl_d_anim.js", "33_js_atl_e_more.js"]] + list(HERE.rglob("*.*"))
for f in files:
    if f.suffix in (".py",) : continue
    t = f.read_text(errors="ignore")
    for bad in PRIVATE:
        check(bad not in t, f"{f.name} free of {bad!r}")
print("check_prose: all", ok, "checks passed")
