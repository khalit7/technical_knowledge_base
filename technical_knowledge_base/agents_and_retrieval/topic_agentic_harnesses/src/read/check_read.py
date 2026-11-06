#!/usr/bin/env python3
"""Checks for the Reading and Further reading tabs.
1. The page embeds exactly the data extract_read.py builds from the redacted recordings.
2. Every measured number written by hand in the Reading parts matches the recordings.
3. No em-dash or private string in the Reading files.
Run from anywhere: python3 src/read/check_read.py
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
PARTS = os.path.join(SRC, "parts")
TR = os.path.join(SRC, "trace", "recordings")
fails = []


def ok(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


# 1. regenerate and compare with the built page
before = open(os.path.join(PARTS, "22_js_rd_data.js")).read()
subprocess.run([sys.executable, os.path.join(HERE, "extract_read.py")], check=True, capture_output=True)
after = open(os.path.join(PARTS, "22_js_rd_data.js")).read()
ok(before == after, "22_js_rd_data.js is exactly what extract_read.py builds")
page = open(os.path.join(os.path.dirname(SRC), "index.html")).read()
ok(after.strip() in page, "index.html embeds the current data file")
D = json.loads(after[after.index("=") + 1:].strip().rstrip(";"))

prose = "".join(open(os.path.join(PARTS, f)).read() for f in sorted(os.listdir(PARTS)) if f.startswith("20_read"))
prose_txt = re.sub(r"<[^>]+>", " ", prose)


def has(s):
    return s in prose_txt


def first_input(label):
    for line in open(os.path.join(TR, label + ".jsonl")):
        d = json.loads(line)
        if d.get("type") == "assistant":
            u = d["message"]["usage"]
            return u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"]


cc, s0 = D["cc"], D["s0"]
c1, cl = cc["calls"][0], cc["calls"][-1]
tin = lambda c: c["in"] + c["cw"] + c["cr"]
ok(has("{:,}".format(tin(c1))) and tin(c1) == 13242, "first call 13,242 tokens")
ok(has("{:,}".format(tin(cl))), "last call %s tokens" % "{:,}".format(tin(cl)))
ok(len(cc["calls"]) == 12 and has("Twelve model calls"), "12 model calls")
ok(cc["wall"] == "31" and has("31 seconds"), "31 seconds wall")
ok(round(cc["cost"], 3) == 0.039 and has("$0.039"), "cost about $0.039")
ok(cc["ctxwin"] == 200000 and has("200,000 tokens for Claude Haiku 4.5"), "window 200,000")
ok(s0["in"] == 635 and has("635 input tokens"), "step 0: 635 input tokens")
ok(abs(s0["sec"] - 7.9) < 0.05 and has("7.9 seconds"), "step 0: 7.9 s")
ok(s0["post"].endswith("1 failed"), "step 0 left 1 test failing")
reads = sum(c["cr"] for c in cc["calls"]); total = sum(tin(c) for c in cc["calls"]); out = sum(c["out"] for c in cc["calls"])
ok(has("{:,} of {:,} input tokens".format(reads, total)), "cache reads %d of %d (Fig. 2, step 5)" % (reads, total))
# the replay's step list (sx-c1, 2026-11-06): its stretches and the numbers it quotes
c6 = cc["calls"][5]
ok(has("by call 6 the request is {:,} tokens".format(tin(c6))), "call 6 request %s tokens" % "{:,}".format(tin(c6)))
ok(s0["out"] == 731 and s0["th"] == 475 and has("731 output tokens (475 of them thinking)"), "step 0: 731 output tokens, 475 thinking")
tools = lambda c: [b for b in c["b"] if b["k"] == "tool"]
ok(tools(cc["calls"][6])[0]["err"] and "command not found: python" in tools(cc["calls"][6])[0]["r"], "call 7 is the python error")
ok("2 failed" in tools(cc["calls"][7])[0]["r"] and all(tools(cc["calls"][i])[0]["name"] == "Edit" for i in (8, 9)), "call 8 shows 2 failed, calls 9 and 10 are the edits")
ok("0 failed" in tools(cc["calls"][10])[0]["r"] and not tools(cc["calls"][11]), "call 11 passes, call 12 has no tool call")
js = open(os.path.join(PARTS, "23_js_rd_main.js")).read()
ok("const ST=[[0,0],[1,6],[7,7],[8,8],[9,10],[11,11],[12,13]];" in js and len(re.findall(r"<li>", page[page.index('id="sx-c1"'):page.index("</ol>", page.index('id="sx-c1"'))])) == 7, "seven stretches, seven items in sx-c1")
nocache = (total * 1 + out * 5) / 1e6
ok(has("about ${:.3f}".format(nocache)), "no-cache derivation $%.3f" % nocache)
# startup context from the trace lab's ctx recordings
for lab, label in [("6,653", "ctx_none"), ("13,219", "ctx_six"), ("21,140", "ctx_default")]:
    v = first_input(label)
    ok("{:,}".format(v) == lab and has(lab), "startup %s = %s" % (label, lab))
ok(has("+{:,}".format(first_input("ctx_six") - first_input("ctx_none"))), "Fig. 2: six tools add %d" % (first_input("ctx_six") - first_input("ctx_none")))
md = first_input("md_haiku_1") - first_input("std_haiku_1")
ok(md == 184, "CLAUDE.md adds %d tokens (quoted on the Trace and context lab and Context engineering since 2026-10-24)" % md)
ok(any("479.4KB" in l and "256KB" in l for l in open(os.path.join(TR, "log_haiku_1.jsonl"))) or
   any("479.4KB" in l for l in open(os.path.join(TR, "log_sonnet_1.jsonl"))), "479 KB file refused (256 KB limit) in a recording")
L = D["loopcmp"]
ok(has("${:.4f}".format(L["ours_cost"])) and has("${:.4f}".format(L["cc_cost"])), "loop cost $%.4f against Claude Code $%.4f written in the caption" % (L["ours_cost"], L["cc_cost"]))
ok(abs(L["ours_cost"] - 0.0738) < 0.00005 and abs(L["cc_cost"] - 0.0384) < 0.00005, "Loop lab Sonnet $0.0738 vs Claude Code $0.0384")
step5 = open(os.path.join(SRC, "loop", "harness", "step5.py")).read().splitlines()
code = [l for l in step5 if l.strip() and not l.strip().startswith("#")]
ok(len(step5) == 240 and has("240 lines"), "step5.py has 240 lines (%d)" % len(step5))
ok(abs(len(code) - 190) <= 3 and has("190 of them code"), "step5.py about 190 code lines (%d, docstrings counted)" % len(code))
ok(len(D["gates"]) == 11, "eleven gate cases in the data (the gate stepper moved to Agent security section 4 on 2026-10-24)")
ok(sum(1 for r in D["runs"] if "haiku" in r["label"]) == 3, "three Haiku runs")

# 3. em-dash and privacy
mine = [f for f in os.listdir(PARTS) if f.startswith("20_read") or f.startswith("22_js_rd") or f.startswith("23_js_rd") or f.startswith(("26_js_sc", "27_js_sc", "28_js_sc")) or f == "39_tab_more.html"]
mine_txt = "".join(open(os.path.join(PARTS, f)).read() for f in mine)
mine_txt += "".join(open(os.path.join(HERE, f)).read() for f in os.listdir(HERE) if f.endswith(".md"))
for f in os.listdir(os.path.join(HERE, "old")):
    mine_txt += open(os.path.join(HERE, "old", f)).read()
ok("\u2014" not in mine_txt, "no em-dash in Reading files and notes")
import getpass
for bad in ["/Users/", "Users-", "glpat", "sk-ant", getpass.getuser()]:  # case-sensitive: the login name is looked up at run time, never spelt
    ok(bad not in mine_txt, "no private string %r" % bad)
print("\n%d failures" % len(fails))
sys.exit(1 if fails else 0)
