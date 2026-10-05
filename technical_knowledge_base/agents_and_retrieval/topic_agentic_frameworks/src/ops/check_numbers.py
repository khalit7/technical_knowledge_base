"""Check the Production stack tab against its recordings.
Usage: python3 check_numbers.py <t-ops innerText dump>
1. The page embeds exactly the data build_data.py makes from recordings/ (regenerated and compared).
2. Numbers quoted in the tab text recompute from the redacted recordings.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "recordings")
TXT = open(sys.argv[1]).read()
ok = bad = 0


def check(name, cond):
    global ok, bad
    if cond:
        ok += 1
    else:
        bad += 1
        print("FAIL", name)


def has(s):
    return s in TXT


# 1. embedded data equals a fresh build from the recordings
part = os.path.join(HERE, "..", "parts", "33_js_a_data.js")
before = open(part).read()
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
check("data part regenerates identically", open(part).read() == before)
page = open(os.path.join(HERE, "..", "..", "index.html")).read()
check("page embeds the data part", before.strip().split("\n", 1)[1] in page)

# 2. gateway
G = {s["scenario"]: s for s in json.load(open(os.path.join(R, "gateway.json")))}
r3 = lambda x: round(x, 3)  # build_data.py stores times relative to the first request, rounded to 1 ms
dur = lambda s, k=0: r3(G[s]["requests"][k]["t1"] - G[s]["requests"][0]["t0"])
for s in ("gw_retry", "gw_timeout", "direct_hang", "gw_fallback"):
    check(f"{s} total {dur(s):.2f} s in text", has(f"{dur(s):.2f} s"))
up = G["gw_retry"]["upstream"]
t0 = G["gw_retry"]["requests"][0]["t0"]
w = [r3(up[1]["t0"] - t0) - r3(up[0]["t1"] - t0), r3(up[2]["t0"] - t0) - r3(up[1]["t1"] - t0)]
check("retry waits", all(has(f"{x:.2f} s") for x in w))
check("cooldown attempts", has(f"still sent {len(G['gw_cooldown']['upstream'])} attempts"))
keys = [q for q in G["keys"]["requests"] if q.get("key") == "budget"]
okk = [q for q in keys if q["status"] == 200]
cost1 = float(okk[0]["headers"]["x-litellm-response-cost"])
check("budget calls", has(f"allowed {len(okk)} calls"))
check("budget end", has(f"${len(okk) * cost1:.6f}"))
check("budget exceeded status recorded", any(q["status"] == 422 for q in keys))

# 3. Claude Code cost attribution
sp = json.load(open(os.path.join(R, "cc_otel_spans.json")))
L = [s["attrs"] for s in sp if s["name"] == "claude_code.llm_request"]
tot = sum((int(a.get("input_tokens", 0)) + 2 * int(a.get("cache_creation_tokens", 0)) + 0.1 * int(a.get("cache_read_tokens", 0)) + 5 * int(a.get("output_tokens", 0))) / 1e6 for a in L)
res = [json.loads(l) for l in open(os.path.join(R, "cc_otel_haiku.jsonl")) if '"type": "result"' in l][0]
check("span cost equals result cost", abs(tot - res["total_cost_usd"]) < 1e-9)
check("cost in text", has(f"${tot:.4f}"))
check("span count", has(f"{len(sp)} spans under one"))

# 4. evals
E = json.load(open(os.path.join(R, "evals.json")))["runs"]
check("eval run count", has(f"scores {len(E)} recorded"))
den = [r for r in E if r["run"] == "orch_agent_denied"][0]
check("denied run never verified", den["tested_after_edit"] is False and den["denials"] == 3)

# 5. memory
M = json.load(open(os.path.join(R, "memory.json")))
for k, label in (("full", "Full history"), ("facts", "Facts"), ("graph", "Temporal graph"), ("paging", "Paging")):
    n = sum(a["pass"] for a in M["systems"][k])
    check(f"memory {k} {n}/5", has(f"{label}: {n} of 5"))

print(f"{ok} checks passed, {bad} failed")
sys.exit(1 if bad else 0)
