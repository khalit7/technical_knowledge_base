"""Check that the page embeds exactly the redacted recordings' numbers, and that the rendered
Orchestration lab text quotes them. Usage: python3 check_numbers.py <rendered t-orch innerText file>
Recomputes every total from the raw redacted JSONL (result records), independently of build_data.py."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "recordings")
html = open(os.path.join(HERE, "..", "..", "index.html")).read()
m = re.search(r"window\.ORCH=(\{.*?\});\n", html, re.S)
D = json.loads(m.group(1).replace("<\\/", "</"))
text = open(sys.argv[1]).read() if len(sys.argv) > 1 else ""
bad, ok = [], 0


def check(cond, msg):
    global ok
    if cond:
        ok += 1
    else:
        bad.append(msg)


def results(path):
    return [json.loads(l) for l in open(path) if '"type": "result"' in l or '"type":"result"' in l]


def fmt(n):
    return f"{round(n):,}"


# every recording file is used, and nothing else is
used = set()
for p in ["chain", "route", "parallel", "orch", "evalopt"]:
    files = sorted(f for f in os.listdir(os.path.join(R, p)) if f.endswith(".jsonl"))
    ev = [e for e in D["patterns"][p]["ev"] if e["k"] == "llm"]
    check([e["l"] + ".jsonl" for e in ev] == files, f"{p}: calls {[e['l'] for e in ev]} vs files {files}")
    tok = out = cost = 0
    for f in files:
        used.add(f"{p}/{f}")
        r = results(os.path.join(R, p, f))[-1]
        u = r["usage"]
        e = [x for x in ev if x["l"] + ".jsonl" == f][0]
        check(e["i"] == u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"], f"{p}/{f} input")
        check(e["o"] == u["output_tokens"], f"{p}/{f} output")
        check(abs(e["c"] - r["total_cost_usd"]) < 1e-6, f"{p}/{f} cost")
        tok += e["i"]; out += e["o"]; cost += r["total_cost_usd"]
    row = [l for l in text.splitlines() if l.startswith({"chain": "Prompt chaining", "route": "Routing", "parallel": "Parallelisation", "orch": "Orchestrator-workers", "evalopt": "Evaluator-optimizer"}[p] + "\t")]
    check(bool(row) and fmt(tok) in row[0] and fmt(out) in row[0], f"{p}: table row {row[:1]} lacks {fmt(tok)} / {fmt(out)}")
for a in ["agent", "agent_denied", "multi", "multi_ignored"]:
    used.add(f"{a}/agent.jsonl")
    r = results(os.path.join(R, a, "agent.jsonl"))[-1]
    mu = list(r["modelUsage"].values())[0]
    check(abs(D[a]["cost"] - mu["costUSD"]) < 1e-6, f"{a} cost")
    check(D[a]["usage"]["cr"] == mu["cacheReadInputTokens"], f"{a} cache reads")
    check(D[a]["usage"]["o"] == mu["outputTokens"], f"{a} output")
for f in os.listdir(os.path.join(R, "langgraph")):
    if f.endswith(".jsonl") and f != "events.jsonl":
        used.add(f"langgraph/{f}")
        check(f[:-6] in D["lg"]["calls"], f"langgraph call {f}")
allj = {f"{d}/{f}" for d in os.listdir(R) if os.path.isdir(os.path.join(R, d)) for f in os.listdir(os.path.join(R, d)) if f.endswith(".jsonl") and f != "events.jsonl"}
check(allj == used, f"recordings not embedded: {allj - used}")
# prose
if text:
    a, mm = D["agent"], D["multi"]
    tot = lambda x: x["usage"]["i"] + x["usage"]["cw"] + x["usage"]["cr"]
    for needle in [fmt(tot(a)), f"${a['cost']:.3f}", f"${mm['cost']:.2f}", fmt(tot(mm)), f"{tot(mm)/tot(a):.1f} times the tokens",
                   "263 s", "9.7 s", "5/6 hidden", "6/6 hidden", "gave 6/6", "2.1.289", "1.2.13", "3 commands denied"]:
        check(needle in text, f"text lacks {needle!r}")
    check(not re.search(r"NaN|undefined|Infinity", text), "NaN/undefined in text")
    check(chr(0x2014) not in text, "em-dash in text")
print(f"{ok} checks passed, {len(bad)} failed")
for b in bad:
    print("FAIL", b)
sys.exit(1 if bad else 0)
