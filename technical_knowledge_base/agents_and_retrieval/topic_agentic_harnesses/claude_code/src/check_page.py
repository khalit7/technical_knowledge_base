"""Checks for the built page. Usage: python3 check_page.py (after sh build.sh)
1. The page embeds exactly the data extract.py makes from the redacted recordings (regenerated and compared).
2. Every hand-written number in the prose below is recomputed from the recordings and must appear in the page.
3. No private string, token prefix or em-dash in the page, the recordings or the other source files."""
import json, os, re, subprocess, sys, glob, getpass

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(HERE, "..", "index.html")).read()
REC = os.path.join(HERE, "recordings")
fails = []

# 1. regenerate the data part and compare
js_path = os.path.join(HERE, "parts", "22_js_hcc_data.js")
before = open(js_path).read()
subprocess.run([sys.executable, os.path.join(HERE, "extract.py")], check=True, capture_output=True)
after = open(js_path).read()
if before != after:
    fails.append("22_js_hcc_data.js was not up to date with the recordings")
body = after.split("\n", 1)[1].strip()
if body not in PAGE:
    fails.append("the page does not embed the current data part (rebuild)")
data = json.loads(after[after.index("=") + 1:].strip().rstrip(";").replace("<\\/", "</"))
R = {r["id"]: r for r in data["runs"]}

def recs(label):
    return [json.loads(l) for l in open(os.path.join(REC, label + ".jsonl"))]

def result(label):
    return [r for r in recs(label) if r["type"] == "result"][-1]

def cost(label, w5_extra=0):
    p = {"claude-haiku-4-5-20251001": (1, 2, .1, 5), "claude-sonnet-5-5": (2, 4, .2, 10)}
    t = 0
    for m, v in result(label)["modelUsage"].items():
        a = p[m]
        t += (v["inputTokens"] * a[0] + v["cacheCreationInputTokens"] * a[1] + v["cacheReadInputTokens"] * a[2] + v["outputTokens"] * a[3]) / 1e6
    return t

def callin(c):
    return c[0] + c[1] + c[2]

claims = []
def claim(text, value, shown):
    claims.append((text, value, shown))
    if shown not in PAGE:
        fails.append("prose number not found: %s -> %r" % (text, shown))

mx = data["matrix"]
col = {c["id"]: c for c in mx["cols"]}
ran = lambda cid: sum(1 for x in col[cid]["cells"] if x["o"] in ("ran", "fail"))
claim("Manual ran", ran("perm_manual"), "Manual mode in <code>-p</code> ran %d of 12" % ran("perm_manual"))
claim("acceptEdits ran", ran("perm_acceptEdits"), "acceptEdits ran %d." % ran("perm_acceptEdits"))
claim("auto Sonnet ran all", ran("perm_auto_sonnet"), "all twelve actions ran")
plan_models = {c[7] for c in R["perm_plan"]["calls"]}
claim("plan answered by", plan_models, "every one of its %d calls was answered by <code>claude-sonnet-5-5</code>" % len(R["perm_plan"]["calls"]))
assert plan_models == {"claude-sonnet-5-5"}
den = sum(1 for f in glob.glob(os.path.join(REC, "*.jsonl")) for l in open(f) if '"subtype": "permission_denied"' in l)
claim("permission_denied records", den, "%d times in the permission runs" % den)
hk = sum(1 for l in open(os.path.join(REC, "hooks_on.jsonl")) if '"subtype": "hook_response"' in l)
claim("hook pairs", hk, "hooks_on (%d pairs)" % hk)
log = json.load(open(os.path.join(REC, "hooks_on.meta.json")))["hook_log"].strip().split("\n")
ntools = sum(1 for r in recs("hooks_on") if r["type"] == "assistant" for b in r["message"]["content"] if b["type"] == "tool_use")
claim("logger coverage", (len(log), ntools), "the log holds %d of the %d tool calls" % (len(log), ntools))
off, on = callin(R["skill_ok_off"]["calls"][0]), callin(R["skill_ok_on"]["calls"][0])
claim("skill description tokens", on - off, "description cost %d tokens at launch" % (on - off))
claim("skill_task calls", len(R["skill_task"]["calls"]), "fixed both bugs in %d model calls" % len(R["skill_task"]["calls"]))
sk = R["skill_task"]; inv = next(e for e in sk["ev"] if e["k"] == "tool" and e["n"] == "Skill")
claim("skill body write", sk["calls"][inv["c"] + 1][1], "%d tokens written to the cache on the next call" % sk["calls"][inv["c"] + 1][1])
sub = R["subagent"]
first_task = next(e for e in sub["ev"] if e["k"] == "task" and e.get("tok"))
claim("subagent first tokens", first_task["tok"], "subagent at {:,} tokens".format(first_task["tok"]))
claim("parent first request", callin(sub["calls"][0]), "against {:,} for the parent".format(callin(sub["calls"][0])))
main = sum((c[0] * 1 + c[1] * 2 + c[2] * .1 + c[3] * 5) / 1e6 for c in sub["calls"])
claim("parent cost", round(main, 3), "add up to $%.3f at list prices" % main)
claim("subagent total", round(sub["cost"], 3), "<code>modelUsage</code> says $%.3f" % sub["cost"])
claim("subagent share", round(100 * (sub["cost"] - main) / sub["cost"]), "%d%% of the run" % round(100 * (sub["cost"] - main) / sub["cost"]))
mu = list(result("subagent")["modelUsage"].values())[0]
w5 = mu["cacheCreationInputTokens"] - sum(c[1] for c in sub["calls"])
claim("subagent 5m writes", w5, "{:,} cache-write tokens".format(w5))
assert abs(cost("subagent") - 0.75 * w5 / 1e6 - result("subagent")["total_cost_usd"]) < 1e-6
b = result("budget"); bu = b["usage"]
claim("budget end", round(b["total_cost_usd"], 4), "at $%.4f" % b["total_cost_usd"])
claim("budget overshoot", round(100 * (b["total_cost_usd"] / 0.02 - 1)), "%d%% over" % round(100 * (b["total_cost_usd"] / 0.02 - 1)))
cc = bu["cache_creation"]; usage_cost = (bu["input_tokens"] + 2 * cc["ephemeral_1h_input_tokens"] + 1.25 * cc["ephemeral_5m_input_tokens"] + .1 * bu["cache_read_input_tokens"] + 5 * bu["output_tokens"]) / 1e6
claim("budget usage cost", round(usage_cost, 4), "($%.4f at list prices)" % usage_cost)
r1, r2 = result("resume1"), result("resume2")
claim("resume costs", (r1["total_cost_usd"], r2["total_cost_usd"]), "$%.6f, which is session 1's $%.6f plus its own $%.6f" % (r2["total_cost_usd"], r1["total_cost_usd"], r2["total_cost_usd"] - r1["total_cost_usd"]))
c2 = R["resume2"]["calls"][0]
claim("resume cache read", c2[2], "read {:,} tokens".format(c2[2]))
claim("resume new", c2[1], "wrote %d new ones" % c2[1])
t = recs("tools"); tr = [r for r in t if r["type"] == "user" and isinstance(r["message"]["content"], list)]
meta2 = tr[1]["tool_use_result"]["file"]
claim("partial read lines", (meta2["numLines"], meta2["totalLines"]), "lines 1 to {:,} returned".format(meta2["numLines"]))
res_texts = [b["content"] for r in tr for b in r["message"]["content"] if b.get("type") == "tool_result"]
claim("partial read chars", len(res_texts[1]), "({:,} characters".format(len(res_texts[1])))
claim("persisted output chars", len(res_texts[9]), "{:,} characters in all".format(len(res_texts[9])))
claim("failure chars", len(res_texts[10]), "{:,} characters came back".format(len(res_texts[10])))
claim("partial share", round(100 * meta2["numLines"] / meta2["totalLines"]), "got %d%% of a file" % round(100 * meta2["numLines"] / meta2["totalLines"]))
par = R["parallel"]; vals = [re.search(r"([ABC]) ([\d.]+) ([\d.]+)", e["s"]).groups() for e in par["ev"] if e["k"] == "res" and re.match(r"[ABC] ", e["s"])][:3]
claim("parallel A", vals[0], "A from %.2f to %.2f seconds" % (float(vals[0][1]), float(vals[0][2])))
p2 = [e["t"] for e in R["parallel2"]["ev"] if e["k"] == "res"][:3]
claim("parallel2 spread", round(max(p2) - min(p2), 2), "within %.2f s of each other" % (max(p2) - min(p2)))

# 3. private strings and em-dashes
user = getpass.getuser(); home = os.path.expanduser("~")
forbid = ["/Us" + "ers/", "Us" + "ers-", user, "gl" + "pat", "sk-" + "ant", home]
for f in [os.path.join(HERE, "..", "index.html"), os.path.join(HERE, "..", "README.md")] + glob.glob(os.path.join(HERE, "**", "*"), recursive=True):
    if os.path.isdir(f) or f.endswith(".png"):
        continue
    s = open(f, errors="replace").read()
    for x in forbid:
        if x and x in s:
            fails.append("private string %r in %s" % (x[:6] + "...", os.path.relpath(f, HERE)))
    if chr(0x2014) in s:
        fails.append("em-dash in " + os.path.relpath(f, HERE))

print(len(claims), "prose numbers checked")
print("FAIL\n" + "\n".join(fails) if fails else "all checks passed")
sys.exit(1 if fails else 0)
