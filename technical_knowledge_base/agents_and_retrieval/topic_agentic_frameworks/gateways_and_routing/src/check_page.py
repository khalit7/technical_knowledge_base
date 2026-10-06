"""Check that ../index.html embeds exactly the redacted recordings and that numbers quoted in the prose match them.
Run from src/: python3 check_page.py   (after sh build.sh). Exits non-zero on any failure."""
import html, json, os, re, subprocess, sys

H = os.path.dirname(os.path.abspath(__file__))
os.chdir(H)
fails = []

# 1. the data part is exactly what gen_data.py makes from recordings/, and the page embeds it
before = open("parts/22_js_fgw_data.js").read()
subprocess.run([sys.executable, "gen_data.py"], check=True, capture_output=True)
after = open("parts/22_js_fgw_data.js").read()
if before != after:
    fails.append("parts/22_js_fgw_data.js was stale (regenerated now; rebuild)")
page = open("../index.html").read()
if after.split("window.FGW=", 1)[1].strip() not in page:
    fails.append("index.html does not embed the current data part")
emb = json.loads(after.split("window.FGW=", 1)[1].rsplit(";", 1)[0].replace("<\\/", "</"))
rec = json.load(open("recordings/fgw_runs.json"))
emb.pop("phi")
if emb != rec:
    fails.append("embedded data differs from recordings/fgw_runs.json")

# 2. prose numbers against recompute.py
sys.path.insert(0, H)
import recompute as RC
V = RC.V
text = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", page, flags=re.S)))
text = " ".join(text.split())
T = RC.D["router"]["tasks"]
e3 = {c["key"]: c for c in RC.D["e3"]["cases"]}
c1 = {c["s"]: c for c in RC.D["e1"]["cases"]}
checks = [
    ("latency-based routing sent 34 of 40", c1["latency-based-routing"]["count"]["A"] == 34),
    ("sent all 40 to A, the expensive copy", c1["cost-based-routing, prices in model_info (B cheaper)"]["count"]["A"] == 40),
    ("sent 26 to A", c1["least-busy"]["count"]["A"] == 26),
    ("(18 to 22)", c1["usage-based-routing-v2"]["count"]["A"] == 18),
    ("reached a hanging provider 9 times", len(e3["sdk_default_t10"]["att"]) == 9),
    ("after 32.8 s and three sends", f'{e3["sdk_default_t10"]["done"]:.1f}' == "32.8"),
    ("starting at 36.9 s", f'{max(a[0] for a in e3["sdk_default_t10"]["att"]):.1f}' == "36.9"),
    ("270 seconds of provider work", round(sum(a[1] - a[0] for a in e3["sdk_default_t10"]["att"])) == 270),
    ("3 calls, error after 10.2 s", len(e3["sdk_noretry_t10"]["att"]) == 3 and f'{e3["sdk_noretry_t10"]["done"]:.1f}' == "10.2"),
    ("9 calls, error after 61.9 s", len(e3["sdk_default_t60"]["att"]) == 9 and f'{e3["sdk_default_t60"]["done"]:.1f}' == "61.9"),
    ("calls at 0.1, 5.7, 11.8 and 17.8 s", "[0.1, 5.7, 11.8, 17.8]" in V["e2 c429"]),
    ("(at 7.3 s), then benched until 14.7 s", "7.3, 14.7" in V["e2 c503"]),
    ("about 5.5 s per request", V["e2 single mean s per request"] == 5.5),
    ("accepted 19 requests in 15 seconds", V["e4 burst accepted in window"].startswith("19 between 50.0 and 65.0")),
    ("seconds 0 to 9, 61 to 70, 121 to 129", V["e4 steady accepted at"] == list(range(10)) + list(range(61, 71)) + list(range(121, 130))),
    ("at most 10 in any 15 seconds", "most in any 15 s 10" in V["lim burst sliding log"]),
    ("at most 12 (its full bucket", "most in any 15 s 12" in V["lim burst token bucket"]),
    ("exactly 5 accepted, final spend $0.0004", V["e5 seq accepted"] == 5),
    ("1 accepted, 19 refused", V["e5 conc accepted"] == 1),
    ("final spend $0.0016, four times the budget", RC.D["e5"]["spend_later"]["fgw-noreserve_no_max_tokens"] == 0.0016),
    ("5 accepted, final spend exactly $0.0004", RC.D["e5"]["spend_later"]["fgw-max_tokens_16"] == 0.0004 and V["e5 max_tokens_16"].startswith("wave1 5")),
    ("0.08 s instead of seconds", V["e6 b"].startswith("0.083")),
    ("local 38 of 48, Haiku 44 of 48", V["router n, local right, haiku right"] == (48, 38, 44)),
    ("42 right with 25% of calls", V["router complexity (non-SIMPLE to strong)"].startswith("42 right with 12")),
    ("would expect 39.5", V["router random expected at same share"] == 39.5),
    ("6 strong calls (12.5%) for 44", V["router oracle"].startswith("44 right with 6")),
    ("= 0.67", round(V["router APGR complexity"], 2) == 0.67),
    ("cost $0.19 at API list prices", round(V["router haiku cost total USD"], 2) == 0.19),
    ("8 of its 10 misses", V["router local no ANSWER line"] == 8),
    ("ranged from $0.10 to $1.04", "in $0.10-1.04/M" in V["or meta-llama/llama-3.3-70b-instruct"]),
    ("from 12,288 to 131,072", "ctx 12288-131072" in V["or meta-llama/llama-3.3-70b-instruct"]),
    ("about two thirds of first picks", "top two 68.3%" in V["or meta-llama/llama-3.3-70b-instruct"]),
    ("up to 23 endpoints", "23 endpoints" in V["or openai/gpt-oss-120b"]),
]
for phrase, ok in checks:
    if phrase not in text:
        fails.append("phrase not on page: " + phrase)
    elif not ok:
        fails.append("number does not match data: " + phrase)
for k in ("steady", "burst"):
    got, n = V[f"e4 {k} reproduced"]
    if got != n:
        fails.append(f"limiter replay reproduces {got} of {n} ({k})")

# 3. privacy and em-dashes
for bad in ("/Users/", "Users-", os.path.basename(os.path.expanduser("~")), "glpat", "sk-ant", "\u2014"):
    if bad.lower() in page.lower():
        fails.append("forbidden string in page: " + repr(bad))
print("\n".join(fails) if fails else f"ok: data embedded exactly, {len(checks)} prose numbers match, limiter replay exact")
sys.exit(1 if fails else 0)
