"""Check the built page against its data. Run after recompute.py, gen_data.py and build.sh.
1. parts/22_js_fsdk_data.js is what gen_data.py writes now, and ../index.html embeds it byte for byte.
2. The page embeds exactly the redacted recordings in recordings/ (same labels, nothing else).
3. Numbers written in the prose are recomputed from data/numbers.json and the recordings.
4. No private string (home path, login name, git identity, e-mail, token prefix) in the page or in src/, no em-dash in the page."""
import getpass, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
N = json.load(open(os.path.join(HERE, "data", "numbers.json")))
fail = []

# 1 and 2
part = open(os.path.join(HERE, "parts", "22_js_fsdk_data.js"), encoding="utf-8").read()
before = part
subprocess.run([sys.executable, os.path.join(HERE, "gen_data.py")], check=True, capture_output=True)
part = open(os.path.join(HERE, "parts", "22_js_fsdk_data.js"), encoding="utf-8").read()
if part != before: fail.append("22_js_fsdk_data.js was stale (regenerated: rebuild)")
body = part.split("\n", 1)[1]
if body.strip() not in PAGE: fail.append("index.html does not embed the current data part")
D = json.loads(body[body.index("=") + 1:body.rindex(";")])
labels = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, "recordings")) if re.match(r"s\d_", f) and f.endswith(".json") and not f.startswith("s7_"))
if sorted(D["runs"]) != labels: fail.append(f"embedded runs {sorted(D['runs'])} != recordings {labels}")
if sorted(D["wire"]) != ["s1_wire", "s3_bare"]: fail.append("wire runs")

# 3 prose numbers
f = lambda n: f"{n:,}"
R = {k: N[k] for k in N if k.startswith("s")}
res = lambda L, i=-1: R[L]["results"][i]
wire = json.load(open(os.path.join(HERE, "recordings", "s1_wire.json")))["wire"]
q = [w for w in wire if w["dir"] == "out" and w["type"] == "control_request"]
cnt = lambda s: sum(1 for w in q if w["sub"] == s)
lat = {}
pend = {}
for w in wire:
    if w["type"] == "control_request" and w["dir"] == "out": pend[w["rid"]] = w
    if w["type"] == "control_response" and w["dir"] == "in" and w["rid"] in pend:
        r = pend[w["rid"]]
        if r["sub"] == "mcp_message" and r["body"].get("method") == "tools/call":
            lat.setdefault(r["body"]["params"]["name"], []).append(round((w["t"] - r["t"]) * 1000))
s4 = R["s4_session"]["results"]
ctxu = next(o for o in R["s4_session"]["other_cb"] if o.get("kind") == "context_usage")
cat = {c["name"]: c["tokens"] for c in ctxu["categories"]}
mt = {c["name"].split("__")[-1]: c["tokens"] for c in ctxu["mcpTools"]}
s5mu = res("s5_subagent")["model_usage"]
conn = N["connectors"]["batch2"]
s1asst = sum(1 for e in json.load(open(os.path.join(HERE, "recordings", "s1_wire.json")))["events"] if e["k"] == "asst"
             for b in e["blocks"])
hidden = sorted({r["model_usage_in"] - r["usage_in"] for L in ("s1_wire", "s3_bare", "s6_structured", "s8_ts", "s9_rewind", "s2_deny") for r in R[L]["results"]})
CHECKS = [
    (f"asked our process {len(q)} questions in {wire[-1]['t']:.1f} seconds", True),
    (f"{cnt('hook_callback')} hook calls, {cnt('can_use_tool')} permission questions and {cnt('mcp_message')} MCP messages", True),
    (f(R["s1_wire"]["first_call_in"]), True), (f(R["s3_bare"]["first_call_in"]), True),
    (f"after {R['s3_bare']['n_calls']} model calls", True),
    (f"{res('s3_bare')['denials']} of its {len(R['s3_bare']['tool_calls'])} tool calls were refused", True),
    (f"{f(res('s3_bare')['usage_in'])} input tokens processed, ${res('s3_bare')['cost']:.4f}", True),
    (f"${res('s1_wire')['cost']:.4f} for run s1", True),
    (f"split {f(ctxu['totalTokens'])} tokens into system prompt {cat['System prompt']}, MCP tools {cat['MCP tools']} (list_files {mt['list_files']}, read_file {mt['read_file']}, edit_file {mt['edit_file']}, run_tests {mt['run_tests']}) and messages {f(cat['Messages'])}", True),
    (f"autocompaction set for {f(ctxu['autoCompactThreshold'])}", True),
    (f"Haiku ${s5mu['claude-haiku-4-5-20251001']['costUSD']:.4f}, Sonnet ${s5mu['claude-sonnet-5-5']['costUSD']:.4f}, total ${res('s5_subagent')['cost']:.4f}", True),
    (f"counted {f(res('s5_subagent')['usage_in'])} input tokens, <code>model_usage</code> {f(res('s5_subagent')['model_usage_in'])}", True),
    (f"(1,571 against 1,390 in s1)", R["s6_structured"]["first_call_in"] == 1571),
    ("cost 181 tokens", R["s6_structured"]["first_call_in"] - R["s1_wire"]["first_call_in"] == 181),
    (f"made 5 model calls but streamed {s1asst} <code>AssistantMessage</code>", R["s1_wire"]["n_calls"] == 5),
    (f"read output tokens from the result ({f(res('s1_wire')['usage_out'])} in s1)", True),
    ("916 input tokens (930 in s2)", hidden == [916, 930]),
    (f"read {f(R['s3_bare']['results'][0]['model_usage']['claude-haiku-4-5-20251001']['cacheReadInputTokens'])} cached tokens", True),
    (f"128,296 tokens of tool definitions", conn[0]["cache_creation"] == 128296),
    (f"$0.257 at list prices instead of $0.0008", round(conn[0]["cost_usd"], 3) == 0.257),
    ("165 tools in batch 2, and 122 tools", conn[0]["tools"] == 165 and conn[2]["tools"] == 122),
    (f"Its first call was 1,566 tokens against 1,390", R["s8_ts"]["first_call_in"] == 1566),
    (f"6 model calls, ${res('s8_ts')['cost']:.4f}", R["s8_ts"]["n_calls"] == 6),
    (f"the run cost ${res('s9_rewind')['cost']:.4f} against ${res('s1_wire')['cost']:.4f}".replace("the run", "The run"), True),
    ("1 to 5 ms for the file tools, 26 and 36 ms for the two test runs",
     max(max(v) for k, v in lat.items() if k != "run_tests") <= 5 and sorted(lat["run_tests"]) == [26, 36]),
    ("first call grew from 1,390 tokens with our prompt and tools to 14,703 with the defaults", True),
]
for s, ok in CHECKS:
    if not ok: fail.append(f"data does not support: {s}")
    elif s not in PAGE: fail.append(f"prose missing or changed: {s}")

# 4 privacy and em-dash
user = getpass.getuser()
ident = [subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip() for k in ("user.name", "user.email")]
bad = ["/Us" + "ers/", "Us" + "ers-", user, "gl" + "pat", "sk-" + "ant"] + [i for i in ident if i]
email = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
for root, dirs, files in os.walk(os.path.dirname(HERE)):
    dirs[:] = [d for d in dirs if d not in ("__pycache__", ".shots")]
    for fn in files:
        p = os.path.join(root, fn)
        try: t = open(p, encoding="utf-8").read()
        except Exception: continue
        for b in bad:
            if re.search(re.escape(b), t, re.I): fail.append(f"private string in {os.path.relpath(p, HERE)}")
        for m in email.findall(t):
            if m not in ("user@example", "support@anthropic.com") and not m.endswith(("@anthropic.com",)):
                fail.append(f"e-mail-like string {m} in {os.path.relpath(p, HERE)}")
if "—" in PAGE: fail.append("em-dash in page")
print(f"{len(CHECKS)} prose numbers checked, {len(D['runs'])} runs embedded")
print("FAIL\n" + "\n".join(sorted(set(fail))) if fail else "OK")
sys.exit(1 if fail else 0)
