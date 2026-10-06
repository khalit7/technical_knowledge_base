"""Checks for this page. Run: python3 check.py (after sh build.sh).
1. extract.py regenerates parts/30_js_data.js identically, and ../index.html embeds it byte for byte.
2. Every redacted recording in recordings/ is used by the data, and nothing in the data comes from elsewhere.
3. Every hand-written measured number in the Reading tab and the labs is recomputed from the data (list below).
4. No em-dash anywhere; no home path, user name, git identity or token prefix in src/ or the page."""
import getpass, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "..", "index.html")
fails = []

def ok(cond, msg):
    if not cond:
        fails.append(msg)

# 1
old = open(os.path.join(HERE, "parts", "30_js_data.js")).read()
subprocess.run([sys.executable, os.path.join(HERE, "extract.py")], check=True, capture_output=True)
new = open(os.path.join(HERE, "parts", "30_js_data.js")).read()
ok(old == new, "extract.py output changed: rebuild")
page = open(PAGE).read()
body = new.split("\n", 1)[1]
ok(body.strip() in page, "index.html does not embed the current data")
D = json.loads(body.split("=", 1)[1].rstrip().rstrip(";").replace("<\\/", "</"))

# 2
recs = sorted(f[:-6] for f in os.listdir(os.path.join(HERE, "recordings")) if f.endswith(".jsonl"))
used = sorted(list(D["sessions"]) + [c["label"] for c in D["cache"]])
ok(recs == used, f"recordings and data differ: {set(recs) ^ set(used)}")

# 3: numbers in prose
S = D["sessions"]
reading = "".join(open(os.path.join(HERE, "parts", f)).read() for f in sorted(os.listdir(os.path.join(HERE, "parts"))) if f.endswith(".html"))
f = lambda n: f"{n:,}"
call = lambda c: c["in"] + c["cw"] + c["cr"]
def comp(l):
    return [e for e in S[l]["events"] if e["k"] == "compact"][0]
checks = []
for l in ("c1_manual", "c1_manual_r2", "c1_manual_r3", "c4_auto"):
    e = comp(l); checks += [f(e["pre"]), f(e["post"])]
cache = {c["label"]: c for c in D["cache"]}
checks += [f(cache["cache_static_1"]["cr"]), f(cache["cache_static_2"]["cr"]), f(cache["cache_tssys_1"]["cw"]), f(cache["cache_tsuser_1"]["cw"]), f(cache["cache_tools5_1"]["cw"])]
ts_sys = cache["cache_tssys_1"]; ts_user = cache["cache_tsuser_1"]; st = cache["cache_static_2"]
P = D["price"]
cost = lambda c: c["in"] * P["in"] + c["cw"] * P["w1h"] + c["cr"] * P["read"]
ok(abs(cost(ts_sys) / cost(ts_user) - 3.1) < 0.05, "3.1x ratio")
ok(round(cost(ts_sys) / cost(st)) == 8, "8x ratio")
sb = {l: S[l] for l in ("sb_none", "sb_none_r2", "sb_agent", "sb_agent_r2")}
lastm = lambda s: call([c for c in s["calls"] if c["w"] == "m"][-1])
lasts = lambda s: call([c for c in s["calls"] if c["w"] == "s"][-1])
checks += [f(lastm(sb["sb_none"])), f(lastm(sb["sb_none_r2"])), f(lastm(sb["sb_agent"])), f(lastm(sb["sb_agent_r2"])), f(lasts(sb["sb_agent"])), f(lasts(sb["sb_agent_r2"]))]
pol = D["policies"]["policies"]
for k in ("filter", "cc_valid", "cc_failure", "head_tail_lines", "page_2000", "summary", "mask"):
    checks.append(f(pol[k]["tokens"]))
checks.append(f(pol["summary"]["summary_call"]["input_tokens"]))
c4 = S["c4_auto"]; fin = c4["finals"][0]
hidden = fin["mu"]["in"] + fin["mu"]["cw"] + fin["mu"]["cr"] - sum(call(c) for c in c4["calls"][:fin["after_call"]])
hidden_fresh = fin["mu"]["in"] - sum(c["in"] for c in c4["calls"][:fin["after_call"]])
checks += [f(hidden), f(hidden_fresh), f(call(c4["calls"][1]))]
c3 = S["c3_big_nocompact"]
checks += [f(call(c3["calls"][1])), f(c3["calls"][1]["cw"])]
sk = S["sk_invoke"]
checks += [f(sk["calls"][1]["cw"]), f(sk["calls"][0]["cw"])]
checks += [f(call(D["cache"][0])) if False else "13,320"]
ok(cache["cache_static_1"]["in"] + cache["cache_static_1"]["cw"] + cache["cache_static_1"]["cr"] == 13320, "13,320 first call")
for n in checks:
    ok(n in reading, f"number {n} not found in the page text")
# derived claims checked directly
ok(round(pol["raw"]["tokens"], -3) == 228000, "raw about 228,000")
ok(sum(1 for l in ("c1_manual", "c1_manual_r2", "c1_manual_r3") if "Pending Tasks:\n   - None" not in [e for e in S[l]["events"] if e["k"] == "summary"][0]["text"]) == 2, "two of three summaries list pending work")
NH = D.get("needle_haiku", {}).get("rows", [])
for t, n_ok, n in (("lit", 20, 20), ("nolit", 20, 20), ("track", 28, 32)):
    rr = [r for r in NH if r["task"] == t]
    ok(len(rr) == n and sum(r["ok"] for r in rr) == n_ok, f"haiku {t}: {sum(r['ok'] for r in rr)}/{len(rr)}")

# 4: privacy and em-dashes
user = getpass.getuser()
def git(k):
    return subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
FORBID = ["/Us" + "ers/", "Us" + "ers-", "gl" + "pat", "sk-" + "ant", user, git("user.name"), git("user.email"), os.path.expanduser("~")]
EM = chr(0x2014)
for dp, dn, fn in os.walk(os.path.join(HERE, "..")):
    if ".shots" in dp:
        continue
    for x in fn:
        p = os.path.join(dp, x)
        if x.endswith((".png", ".pyc")):
            continue
        t = open(p, encoding="utf-8", errors="replace").read()
        if os.path.abspath(p) == os.path.abspath(__file__) or x == "redact.py":
            t = t  # these two name the forbidden strings only by construction (split literals)
        low = t.lower()
        for s in FORBID:
            if s and s.lower() in low:
                fails.append(f"private string in {os.path.relpath(p, HERE)}")
        if EM in t:
            fails.append(f"em-dash in {os.path.relpath(p, HERE)}")
print("checks:", len(checks) + 6, "numbers and claims;", "FAIL" if fails else "all pass")
for m in fails:
    print("  ", m)
sys.exit(1 if fails else 0)
