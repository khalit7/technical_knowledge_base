"""Checks after build: the data part regenerates identically and is embedded; numbers in the prose match the data
and recompute from the recordings; no em-dash and no private string anywhere in the page folder.
Usage: python3 check_page.py"""
import html, json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(H, "code"))
import redact_common as R  # noqa: E402

fails = []
ok = lambda c, m: None if c else fails.append(m)
part = open(os.path.join(H, "parts/22_js_data.js")).read()
subprocess.run([sys.executable, os.path.join(H, "gen_data.py")], check=True, capture_output=True)
ok(open(os.path.join(H, "parts/22_js_data.js")).read() == part, "data part does not regenerate identically")
page = open(os.path.join(H, "../index.html")).read()
ok(part.strip() in page, "data part not embedded in index.html")
D = json.loads(part[len("window.FOBS="):-2])
text = html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", page, flags=re.S)))
text = re.sub(r"\s+", " ", text)

# recordings: the Claude Code result record is the source of the cost numbers
res = [json.loads(l) for l in open(os.path.join(H, "recordings/cc_default.jsonl")) if l.strip()]
fin = [r for r in res if r.get("type") == "result"][-1]
u = fin["usage"]
cost = (u["input_tokens"] * 1 + u["cache_creation_input_tokens"] * 2 + u["cache_read_input_tokens"] * 0.1 + u["output_tokens"] * 5) / 1e6
ok(abs(cost - fin["total_cost_usd"]) < 1e-9, f"cost formula {cost} != {fin['total_cost_usd']}")
ok(u["cache_creation"]["ephemeral_1h_input_tokens"] == u["cache_creation_input_tokens"], "not all cache writes are 1 h")
ok(D["cost"]["result"] == fin["total_cost_usd"], "page cost differs from recording")
ok(abs(D["cost"]["ways"]["ttl"]["total"] - fin["total_cost_usd"]) < 1e-9, "Langfuse 1h total differs")
ok(abs(D["cost"]["metric"]["sum_usd"] - fin["total_cost_usd"]) < 1e-9, "metric sum differs")
gap = 100 * (1 - D["cost"]["ways"]["mapped"]["total"] / fin["total_cost_usd"])
ok(round(gap) == 16, f"gap {gap}")
ok(abs(D["cost"]["ways"]["mapped"]["total"] + u["cache_creation_input_tokens"] * 0.75e-6 - fin["total_cost_usd"]) < 1e-9,
   "mapped gap is not exactly the 5m vs 1h cache-write price difference")

# trace facts quoted in prose
tr = json.load(open(os.path.join(H, "recordings/cc_default_trace.json")))
errs = sorted(round(s["t1"], 1) for s in tr if s["status"] == 2)
ok(errs == [10.6, 19.0], f"error span times {errs}")
ok(sum(1 for s in tr if s["service"] == "claude-code" and "user.email" in s["attrs"]) == 45, "identity attribute count")
samp = D["samp"]["emitted_seconds_after_replay_start"]
ok(samp["first_error_span_sent_at"] == 6.35 and round(samp["long"]) == 61 and round(samp["root"]) == 33
   and round(samp["root"] - samp["root_span_sent_at"]) == 4, "sampling timings")
for phrase in ["16% gap", "6.35 s into the replay", "only emitted 61 s", "33 s in, 4 s after the root", "10.6 s", "19.0 s",
               "18 recorded runs", "two of the eight variants", "12 times in its log"]:
    ok(phrase in text, "prose phrase missing: " + phrase)

# private strings and em-dashes anywhere in the folder
folder = os.path.dirname(H)
for root, dirs, files in os.walk(folder):
    dirs[:] = [d for d in dirs if d not in (".shots", "__pycache__")]
    for f in files:
        p = os.path.join(root, f)
        try:
            t = open(p, encoding="utf-8").read()
        except Exception:
            continue
        if f in ("redact_common.py",):
            continue
        if f == "live.md":  # the old Notion page, verbatim; it names the knowledge base's owner in its own text
            continue
        if chr(0x2014) in t:
            fails.append("em-dash in " + os.path.relpath(p, folder))
        found = [x for x in R.leaks(t) if not x.endswith("@mycompany.com")]  # a regex example quoted from the redaction README
        if found:
            fails.append(f"private string in {os.path.relpath(p, folder)} ({len(found)})")
print("FAIL" if fails else "ok", *fails, sep="\n")
sys.exit(1 if fails else 0)
