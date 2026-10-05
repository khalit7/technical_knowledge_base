#!/usr/bin/env python3
"""Loop lab checks: (1) the page embeds exactly the data built from the redacted recordings, and every run in it
has its redacted recording in src/loop/recordings/; (2) every number written by hand in the tab's prose matches
the recordings. Numbers written into the prose through data-v attributes come from the data at load time.
Run: python3 src/loop/check_numbers.py   (no scratch access needed)"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
part = open(os.path.join(HERE, "..", "parts", "31_js_loop_0data.js")).read()
page = open(os.path.join(HERE, "..", "..", "index.html")).read()
html = open(os.path.join(HERE, "..", "parts", "31_tab_loop.html")).read()
ok = True


def check(name, cond, detail=""):
    global ok
    print(("ok   " if cond else "FAIL ") + name + (": " + str(detail) if detail else ""))
    ok &= bool(cond)


check("page embeds the data part verbatim", part.split("\n", 1)[1].strip() in page)
data = json.loads(part[part.index("=") + 1:part.rindex(";")].replace("{\\u007b", "{{"))
ev = {f[:-6]: [json.loads(l) for l in open(os.path.join(REC, f))] for f in os.listdir(REC) if f.endswith(".jsonl") and f.startswith("s")}
for r in data["runs"]:
    e = ev.get(r["id"])
    check(f"{r['id']}: redacted recording present", e is not None)
    turns = [x for x in e if x["kind"] == "turn"]
    check(f"{r['id']}: turn count matches", len(turns) == r["tot"]["calls"], (len(turns), r["tot"]["calls"]))
    out = sum(x["usage"]["output_tokens"] for x in turns)
    check(f"{r['id']}: output tokens match", out == r["tot"]["out"], (out, r["tot"]["out"]))
    v = next(x for x in e if x["kind"] == "verdict")
    check(f"{r['id']}: verdict matches", v["passed"] == r["passed"])
for c in data["cc"]:
    recs = [json.loads(l) for l in open(os.path.join(REC, c["id"] + ".jsonl"))]
    res = next(x for x in recs if x["type"] == "result")
    check(f"{c['id']}: cost and turns match the result record", res["total_cost_usd"] == c["cost"] and res["num_turns"] == c["numTurns"])

# hand-written numbers in the prose
mask = {x["turn"]: x for x in ev["s4_smart_mask"] if x["kind"] == "turn"}
t3 = mask[3]
# 7,475 is the raw reply's length; redaction shortens the paths inside it
check("runaway call: 7,475 characters returned (raw; redacted copy shorter)", 7000 < len(t3["text"]) <= 7475 and "7,475" in html, len(t3["text"]))
check("runaway call: 294 s", round(t3["seconds"]) == 294 and "294 s" in html, t3["seconds"])
check("masking fired from call 4 on", all(mask[k]["masked"] >= 1 for k in mask if k >= 4) and mask[3]["masked"] == 0)
check("masking limit 2,000", next(x for x in ev["s4_smart_mask"] if x["kind"] == "start")["context_limit"] == 2000)
noisy = [x for x in ev["s4_off_noisy"] if x["kind"] == "turn" and x.get("action") and x["action"]["tool"] == "run_tests"]
lines = [x["observation"].count("\n") for x in noisy]
chars = [x["raw_chars"] for x in noisy]
check("noisy output about 240 lines and 12,900 characters", all(230 <= n <= 250 for n in lines) and all(12800 <= c <= 13000 for c in chars), (lines, chars))
obs = noisy[0]["observation"].splitlines()
idx = [i + 1 for i, l in enumerate(obs[1:]) if re.match(r"(PASS|FAIL) test_|\d+ failed", l)]
check("test result lines at 92 to 95 of the noisy output", idx == [92, 93, 94, 95] and "lines 92 to 95" in html, idx)
naive = [x for x in ev["s4_naive_noisy"] if x["kind"] == "turn" and x.get("action") and x["action"]["tool"] == "run_tests"]
check("naive clip drops the result lines but keeps 'exit code'", all("FAIL test_" not in x["observation"] and "PASS test_" not in x["observation"] and x["observation"].startswith("exit code") for x in naive))
cc_denied = {c["id"]: len(c["denials"]) for c in data["cc"]}
check("Claude Code denials: 2, 2, 2, 1", [cc_denied[k] for k in ("cc_haiku", "cc_haiku_r2", "cc_sonnet", "cc_sonnet_fair")] == [2, 2, 2, 1], cc_denied)
maxpar = max(sum(1 for x in k["c"] if x["t"] == "tool") for c in data["cc"] for k in c["calls"])
check("up to three tool calls in one Claude Code call", maxpar == 3, maxpar)
check("gate table has eleven actions", len(data["gate"]) == 11 and "eleven actions" in html)
s1 = [x for x in ev["s1_haiku"] if x["kind"] == "turn"]
check("step 1 invented a result in call 2", "--- turn 2: result of read_file ---" in s1[1]["text"])
check("step 1 called write_file", any(x.get("action") and x["action"]["tool"] == "write_file" for x in s1))
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
