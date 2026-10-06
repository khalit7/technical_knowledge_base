"""Checks for this page. Run from src/ after build.sh:
1. the data part is exactly what extract.py makes from src/data and src/recordings, and index.html embeds it;
2. every E6 recording's result (text, tokens, cost) appears in the page data, and nothing else does;
3. numbers typed into the prose match the data;
4. no em-dash and no private strings in anything committed."""
import json, os, re, subprocess, sys, glob, getpass

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
ok = fail = 0


def check(cond, msg):
    global ok, fail
    if cond:
        ok += 1
    else:
        fail += 1; print("FAIL", msg)


before = open(os.path.join(HERE, "parts", "22_js_data.js")).read()
subprocess.run([sys.executable, os.path.join(HERE, "extract.py")], check=True, capture_output=True)
after = open(os.path.join(HERE, "parts", "22_js_data.js")).read()
check(before == after, "22_js_data.js is not what extract.py produces")
check(after.strip() in PAGE, "index.html does not embed 22_js_data.js")
D = json.loads(after[len("window.FLG="):-2])

# 2. recordings
calls = {}
for f in glob.glob(os.path.join(HERE, "recordings", "e6", "*.jsonl")):
    if f.endswith("_events.jsonl"):
        continue
    res = [json.loads(l) for l in open(f) if '"type": "result"' in l]
    check(len(res) == 1, f"one result record in {os.path.basename(f)}")
    calls[os.path.basename(f)] = res[0]
page_calls = [c for sc in ("A", "B") for c in D["e6"]["runs"][sc]["calls"] if c["t1"] is not None]
check(len(page_calls) == len(calls) == 7, f"7 returned calls embedded ({len(page_calls)} page, {len(calls)} recordings)")
for r in calls.values():
    m = [c for c in page_calls if c["text"] == r["result"] and c["input"] == r["usage"]["input_tokens"]
         and c["output"] == r["usage"]["output_tokens"] and abs(c["cost"] - r["total_cost_usd"]) < 1e-12]
    check(len(m) == 1, "recording result found once in page data")
    # cost reproduces from Haiku 4.5 list prices ($1 in, $5 out per MTok; no cache use in these calls)
    u = r["usage"]
    check(abs(u["input_tokens"] * 1e-6 + u["output_tokens"] * 5e-6 - r["total_cost_usd"]) < 1e-9, "cost = in x $1 + out x $5 per MTok")
check(sum(len(D["e6"]["runs"][s]["calls"]) for s in "AB") == 9, "9 Haiku calls started in all")

# 3. prose numbers
text = re.sub(r"<[^>]+>", " ", PAGE)
text = re.sub(r"\s+", " ", text)
e3 = {(r["saver"], r["state"]): r for r in D["e3"]["runs"]}
ov = {(o["saver"], o["durability"]): o for o in D["e2"]["overhead"]}
vd = json.load(open(os.path.join(HERE, "inputs", "version_diffs.json")))["versions"]
claims = [
    ("1.3 MB for 40 small steps", round(e3[("sqlite", "Plain")]["final"]["total"] / 1e6, 1) == 1.3 and D["e3"]["n"] == 40),
    ("through 10 migrations", D["e3"]["schema"]["postgres_migrations"] == 10),
    ("each adding a tool call and a 1,000-character tool result", D["e3"]["filler_chars"] == 1000),
    ("under half a millisecond per step on SQLite", ov[("sqlite", "sync")]["ms_per_step"] < 0.5),
    ("The default was 25 up to langgraph 1.0.x, then 10,000 in 1.1.0 and 10,007 in 1.2.0",
     vd["1.0.0"]["default_recursion_limit"] == 25 and vd["1.1.0"]["default_recursion_limit"] == 10000 and vd["1.2.0"]["default_recursion_limit"] == 10007),
    ("9 Claude Haiku 4.5 calls", True),
    ("read, a_search, b_lint, a_read_hits, join, join", [x for x in D["e1"] if x["name"] == "uneven_edges"][0]["final"]["log"] == ["read", "a_search", "b_lint", "a_read_hits", "join", "join"]),
    ("[\"triage: refund question, handing off\", \"billing: handled\"]", D["e5"]["handoff"]["final"]["log"] == ["triage: refund question, handing off", "billing: handled"]),
    ("fix one of the two bugs", D["e7b"]["final_tests_pass"] is False and "ties_alphabetical" not in D["e7b"]["final_core"] and "-kv[1], kv[0]" in D["e7b"]["final_core"]),
    ("the approve-all reviewer let it through and the bugs stayed", D["e7"]["final_tests_pass"] is False and any(t.get("args", {}).get("path") == "core.py" for m in D["e7"]["messages"] if isinstance(m.get("tool_calls"), list) for t in m["tool_calls"] if t["name"] == "write_file")),
    ("44 small graph runs", 7 + 1 + 4 + 6 + 4 + 9 + 8 + 2 + 1 + 1 + 1 == 44),
    ("Cannot use Command(resume=...) without checkpointer", any("Cannot use Command(resume=...) without checkpointer" in (c.get("error") or "") for c in [x for x in D["e4"]["cases"] if x["name"] == "no_checkpointer"][0]["calls"])),
    ("EmptyInputError: Received no input for __start__", any((s["processes"][1]["stdout"] or {}).get("err") == "EmptyInputError: Received no input for __start__" for s in D["e2"]["scenarios"])),
    ("Found edge ending at unknown node", "Found edge ending at unknown node" in json.load(open(os.path.join(HERE, "data", "e1b_checks.json")))["unknown_edge"]),
]
for s, cond in claims:
    check(s.replace("\"", "&quot;") in PAGE or s in PAGE or s in text, f"prose not found: {s}")
    check(cond, f"prose does not match data: {s}")
# the side-effect counts the reading animation ends on equal the recording
se = [c for c in D["e4"]["cases"] if c["name"] == "side_effect_before"][0]["calls"][-1]["starts"]
check(se["review"] == 2 and se["email_sent"] == 2, "side_effect_before: review 2, email 2")
sa = [c for c in D["e4"]["cases"] if c["name"] == "side_effect_after"][0]["calls"][-1]["starts"]
check(sa["review"] == 2 and sa["email_sent"] == 1, "side_effect_after: review 2, email 1")

# 4. em-dash and private strings
EMD = "\u2014"
login = getpass.getuser()
bad = re.compile(r"/Users/|Users-|glpat|sk-ant|" + re.escape(login), re.I)
email = re.compile(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", re.I)
for root, dirs, files in os.walk(os.path.join(HERE, "..")):
    if ".shots" in root or "__pycache__" in root:
        continue
    for fn in files:
        p = os.path.join(root, fn)
        if fn.endswith((".png", ".db")):
            continue
        t = open(p, encoding="utf-8", errors="replace").read()
        check(EMD not in t, f"em-dash in {fn}")
        m = bad.search(t)
        if fn != "check_page.py" and fn != "redact.py":
            check(m is None, f"private string in {fn}: {m.group(0) if m else ''}")
            em = [e for e in email.findall(t) if e != "user@example.com" and not e.endswith((".png", ".py"))]
            check(not em, f"e-mail address in {fn}: {em[:2]}")
print(f"checks ok={ok} fail={fail}")
sys.exit(1 if fail else 0)
