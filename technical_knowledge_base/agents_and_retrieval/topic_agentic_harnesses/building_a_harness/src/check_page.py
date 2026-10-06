#!/usr/bin/env python3
"""Checks for the page: (1) index.html embeds exactly parts/22_js_hb_data.js; (2) every number written by
hand in the Reading prose is recomputed from that data (or from the code it describes); (3) no em-dash and
no private string anywhere in the page or the files that will be committed.
Usage: check_page.py   (run after build_data.py and build.sh)"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_protocols", "src"))
import private_patterns as PP

page = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
data_js = open(os.path.join(HERE, "parts", "22_js_hb_data.js"), encoding="utf-8").read()
H = json.loads(data_js[data_js.index("=") + 1:].rstrip().rstrip(";"))
prose = "".join(open(f, encoding="utf-8").read() for f in sorted(glob.glob(os.path.join(HERE, "parts", "*.html"))))
fails = []


def ok(cond, what):
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        fails.append(what)


def says(text, what):
    ok(text in prose, f"prose says: {what!r}" if text == what else f"prose says {text!r} ({what})")


# 1. the page embeds exactly the built data
ok(data_js.strip().split("\n", 1)[1] in page, "index.html embeds parts/22_js_hb_data.js byte for byte")

# 2. numbers in the prose
B = H["bench"]
def first_ok(model, fmt, applier=None):
    applier = applier or B["primary"][fmt]
    return sum(B["runs"][model][t["id"]][fmt][0]["res"][applier][1] for t in B["tasks"] if fmt in B["runs"][model].get(t["id"], {}))
def refused(model, fmt):
    return sum(1 - B["runs"][model][t["id"]][fmt][0]["res"][B["primary"][fmt]][0] for t in B["tasks"])
hn = "haiku_nothink"
says(f"exact replace {first_ok(hn, 'exact')} of 13 correct", "section 0, exact")
says(f"<code>git apply</code> {first_ok(hn, 'udiff')} of 13 (12 with recounted headers)", "section 0, udiff")
ok(first_ok(hn, "udiff", "udiff_recount") == 12 and first_ok(hn, "udiff", "udiff_aider") == 12, "recount and Aider udiff: 12 of 13")
says(f"{refused(hn, 'udiff')} of 13 diffs were refused", "section 6, udiff refusals")
w = B["runs"][hn]["t08"]
says(f"took {w['whole'][0]['out']:,} output tokens as a whole file and {min(w[f][0]['out'] for f in ('exact','sr','udiff','patch'))} to {max(w[f][0]['out'] for f in ('exact','sr','udiff','patch'))} in the other formats", "section 6, t08 tokens")
ok(first_ok(hn, "whole") == 12 and B["runs"][hn]["t11"]["whole"][0]["res"]["whole"][:2] == [1, 0], "whole file 12 of 13, t11 applied but wrong")
ht = "haiku_think"
tot = lambda m, f: sum(B["runs"][m][t["id"]][f][0]["out"] for t in B["tasks"])
says(f"Haiku got {first_ok(ht, 'udiff')} of the 13 diffs through <code>git apply</code> instead of {first_ok(hn, 'udiff')} and spent {tot(ht, 'udiff'):,} output tokens on them, thinking included, against {tot(hn, 'udiff'):,} without thinking", "section 6, thinking")
sn = "sonnet_nothink"
says(f"took in {first_ok(sn, 'udiff')} of 13 cases, against Haiku's {first_ok(hn, 'udiff')}", "section 6, Sonnet udiff")
ok(first_ok(sn, "exact") == 12 and B["runs"][sn]["t11"]["exact"][-1]["res"]["exact"][1] == 1, "Sonnet exact 12 of 13, t11 fixed on retry")
ok(all(B["runs"][m]["t11"]["patch"][0]["res"]["patch"][1] for m in (hn, ht, sn)), "apply_patch passed t11 at first attempt for all three Claude runs")
X = H["boundary"]
says(f"wrote a fake user turn, with tool calls inside, in {sum(x['user'] for x in X['B'])} of {len(X['B'])} samples", "section 0, boundary")
ok(sum(a["past"] for a in X["A"].values()) == 0, "text protocol: no sample wrote past its action")
lo = "local_t0"
says(f"was correct at the first attempt in {first_ok(lo, 'whole')} of 10 whole-file replies, {first_ok(lo, 'sr')} of 10 SEARCH/REPLACE, {first_ok(lo, 'exact')} of 10 exact replacements, and {first_ok(lo, 'udiff')} of 10 for both unified diffs and apply_patch", "section 6, local ranking")
ok(first_ok(lo, "patch") == 1 and len(B["runs"][lo]) == 10, "local: patch 1 of 10, ten edits")
ap_ = sum(B["runs"][lo][t][ "udiff"][0]["res"]["udiff_aider"][0] for t in B["runs"][lo]); okk = first_ok(lo, "udiff", "udiff_aider")
says(f"applied {ap_} of 10, but {ap_ - okk} of those {ap_} failed the check", "section 6, lenient applier")
A = H["aci"][hn]
n = len(A); t = sum(r["terse"] for r in A); nat = sum(r["native"] for r in A); ins = sum(r["instructive"] for r in A)
says(f'"Edit failed." fixed {t} of {n}, the tools\' own messages {nat}, a computed diagnosis {ins}', "section 0, error wording")
# parallel calls
rows = {r[0]: r[1:] for r in H["par"]["rows"]}
son = rows["Claude Sonnet 5.5 (Claude Code)"]; hai = rows["Claude Haiku 4.5 (Claude Code)"]; loc = rows["Qwen3 4B, local (native.py)"]
says(f"Sonnet batched calls in {son[1]+son[2]} of {sum(son)} replies, Haiku in {hai[1]+hai[2]} of {sum(hai)}", "section 0, batches")
says(f"in {son[1]+son[2]} of its {sum(son)} tool-calling replies and Haiku 4.5 in {hai[1]+hai[2]} of {sum(hai)}", "section 3, batches")
pairs = [tuple(c[0] for c in tt["calls"]) for r in H["stop"] for tt in r["turns"] if len(tt["calls"]) > 1]
says(f"in {pairs.count(('edit_file','run_tests'))} of its {len(pairs)} multi-call replies", "section 3, dependent batches")
says(f"the local model batched an edit with the test run {pairs.count(('edit_file','run_tests'))} times", "section 0, dependent batches")
# stop lab
R = {r["id"]: r for r in H["stop"]}
early = [r["id"] for r in H["stop"] if not r["passed"] and r["turns"][-1]["fin"] != "length" and not r["turns"][-1]["calls"]]
says(f"with a test still failing in {len(early)} runs", "section 8, early stops")
says(f"{len(early)} of {len(R)} local runs stopped with a test failing", "section 0, early stops")
ok(R["naive_t0"]["turns"][-1]["fin"] == "length" and not R["naive_t0"]["passed"], "naive_t0 ended on a truncated reply")
says(f"spending {R['verify_s2']['spent']:,} tokens against {R['naive_s2']['spent']:,}", "section 8, verify cost")
says(f"burned {R['verify_s2']['spent']:,} tokens on another", "section 0, verify cost")
ok(R["verify_s4"]["passed"] and not R["careful_s4"]["passed"] and len(R["verify_s4"]["turns"]) == 7 + 1, "verify_s4 passes (fixed by turn 7), careful_s4 fails")
ok(len(R["verify_s2"]["turns"]) == 13, "verify_s2 took 13 turns")
L = H["cc"]["limits"]
says(f"at ${L['cc_budget']['res']['total_cost_usd']:.4f}", "section 8, budget overshoot")
ok(L["cc_maxturns"]["results"] == 3 and L["cc_budget"]["results"] == 0, "max-turns ran 3 calls; budget run ran none")
# tokens
cuts = H["tok"]["cuts"]
says(", ".join(f"{c:,}" for c in cuts[:-1]) + f" and {cuts[-1]:,} tokens", "section 1, prompt sizes")
ok([tt["pt"] for tt in R["careful_s1"]["turns"]] == cuts, "template token counts equal the server's prompt_tokens")
# harness size
src = open(os.path.join(HERE, "harness", "native.py")).read().splitlines()
code = [l for l in src if l.strip() and not l.strip().startswith("#")]
says(f"{len(src)} lines of standard-library Python ({len(code)} without comments and blank lines)", "section 9, native.py size")

# 3. em-dash and private strings
EM = chr(0x2014)
files = [os.path.join(HERE, "..", "index.html"), os.path.join(HERE, "..", "README.md")]
for root, _, fs in os.walk(HERE):
    if "__pycache__" in root:
        continue
    files += [os.path.join(root, f) for f in fs if not f.startswith(".")]
bad = re.compile(r"/Users/|Users-|glpat|sk-ant|" + re.escape(__import__("getpass").getuser()) + "|" + PP.alternation(), re.I)
for f in files:
    s = open(f, encoding="utf-8", errors="replace").read()
    if EM in s:
        fails.append("em-dash in " + os.path.relpath(f, HERE)); print("FAIL em-dash in", f)
    m = bad.search(s)
    if m and not f.endswith("check_page.py"):
        fails.append("private string in " + os.path.relpath(f, HERE)); print("FAIL private string", repr(m.group(0)), "in", f)
ok(True, f"scanned {len(files)} files for em-dashes and private strings")
print("\n" + ("ALL OK" if not fails else f"{len(fails)} FAILURES"))
sys.exit(1 if fails else 0)
