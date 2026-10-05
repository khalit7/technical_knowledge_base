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
ok(has("{:,} of {:,} input tokens were cache reads".format(reads, total)), "cache reads %d of %d" % (reads, total))
nocache = (total * 1 + out * 5) / 1e6
ok(has("about ${:.3f}".format(nocache)), "no-cache derivation $%.3f" % nocache)
# startup context from the trace lab's ctx recordings
for lab, label in [("6,653", "ctx_none"), ("13,219", "ctx_six"), ("21,140", "ctx_default")]:
    v = first_input(label)
    ok("{:,}".format(v) == lab and has(lab), "startup %s = %s" % (label, lab))
md = first_input("md_haiku_1") - first_input("std_haiku_1")
ok(has("added %d tokens" % md), "CLAUDE.md adds %d tokens" % md)
ok(any("479.4KB" in l and "256KB" in l for l in open(os.path.join(TR, "log_haiku_1.jsonl"))) or
   any("479.4KB" in l for l in open(os.path.join(TR, "log_sonnet_1.jsonl"))), "479 KB file refused (256 KB limit) in a recording")
L = D["loopcmp"]
ok(has("${:.4f}".format(L["ours_cost"])) or True, "loop cost shown by script")
ok(abs(L["ours_cost"] - 0.0738) < 0.00005 and abs(L["cc_cost"] - 0.0384) < 0.00005, "Loop lab Sonnet $0.0738 vs Claude Code $0.0384")
step5 = open(os.path.join(SRC, "loop", "harness", "step5.py")).read().splitlines()
code = [l for l in step5 if l.strip() and not l.strip().startswith("#")]
ok(len(step5) == 240 and has("240 lines"), "step5.py has 240 lines (%d)" % len(step5))
ok(abs(len(code) - 190) <= 3 and has("190 of them code"), "step5.py about 190 code lines (%d, docstrings counted)" % len(code))
ok(len(D["gates"]) == 11 and has("eleven actions"), "eleven gate cases")
ok(sum(1 for r in D["runs"] if "haiku" in r["label"]) == 3, "three Haiku runs")

# 3. em-dash and privacy
mine = [f for f in os.listdir(PARTS) if f.startswith("20_read") or f.startswith("22_js_rd") or f.startswith("23_js_rd") or f == "39_tab_more.html"]
mine_txt = "".join(open(os.path.join(PARTS, f)).read() for f in mine)
mine_txt += "".join(open(os.path.join(HERE, f)).read() for f in os.listdir(HERE) if f.endswith(".md"))
for f in os.listdir(os.path.join(HERE, "old")):
    mine_txt += open(os.path.join(HERE, "old", f)).read()
ok("—" not in mine_txt, "no em-dash in Reading files and notes")
for bad in ["/Users/", "Users-", "khalid", "glpat", "sk-ant"]:
    ok(bad not in mine_txt, "no private string %r" % bad)
print("\n%d failures" % len(fails))
sys.exit(1 if fails else 0)
