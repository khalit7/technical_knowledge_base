"""Check that the numbers written by hand in parts/32_tab_trace.html agree with the redacted recordings,
and that the page embeds exactly the data extracted from them.  Usage: python3 check_prose.py"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "parts", "32_tab_trace.html")).read()
js = open(os.path.join(HERE, "..", "parts", "32_js_trc_a_data.js")).read()
D = {r["id"]: r for r in json.loads(js[js.index("=") + 1:js.rindex(";")])}
ok = True
def check(label, cond):
    global ok
    print(("ok   " if cond else "FAIL ") + label); ok &= bool(cond)
ctx = lambda c: c[0] + c[1] + c[2]
first = lambda k: ctx(D[k]["calls"][0])
main = lambda k: [c for c in D[k]["calls"] if not c[6]]
has = lambda s: s in html

# the page data is exactly what extract.py makes from the recordings now
before = js
subprocess.run([sys.executable, os.path.join(HERE, "extract.py")], check=True, capture_output=True)
check("page data regenerates byte for byte from the recordings", open(os.path.join(HERE, "..", "parts", "32_js_trc_a_data.js")).read() == before)
recs = sorted(f[:-6] for f in os.listdir(os.path.join(HERE, "recordings")) if f.endswith(".jsonl"))
check("every recording is in the page and nothing else (%d)" % len(recs), sorted(D) == recs)
check("16 task sessions, 6 startup sessions", sum(1 for r in D.values() if r["group"] != "ctx") == 16 and sum(1 for r in D.values() if r["group"] == "ctx") == 6 and has("16 real Claude Code sessions") and has("6 one-call sessions"))
check("Haiku first call 13,242", all(first(k) == 13242 for k in ("std_haiku_1", "std_haiku_2", "std_haiku_3")) and has("13,242"))
check("Sonnet first call 7,233", all(first(k) == 7233 for k in ("std_sonnet_1", "std_sonnet_2", "std_sonnet_3")) and has("7,233"))
check("every default tool 21,140", first("ctx_default") == 21140 and has("21,140"))
check("CLAUDE.md about 184 tokens", first("md_haiku_1") - first("std_haiku_1") == 184 and has("about 184 tokens"))
check("Agent tool about 2,700", abs(first("ctx_six_agent") - first("ctx_six") - 2700) < 100 and has("about 2,700 tokens"))
check("CLAUDE.md runs: two of three at most 8 calls; baseline 11 to 12", sorted(len(main(k)) for k in ("md_haiku_1", "md_haiku_2", "md_haiku_3"))[:2][-1] <= 8 and {len(main(k)) for k in ("std_haiku_1", "std_haiku_2", "std_haiku_3")} <= {11, 12} and has("against 11 to 12 without the file"))
P = {"claude-haiku-4-5-20251001": (1, 1.25, 2, .1, 5), "claude-sonnet-5-5": (2, 2.5, 4, .2, 10)}
cc = lambda c: (c[0] * P[c[7]][0] + c[1] * (P[c[7]][1] if c[8] else P[c[7]][2]) + c[2] * P[c[7]][3] + c[3] * P[c[7]][4]) / 1e6
check("subagent run: main thread $0.0619, subagent about $0.033", round(sum(cc(c) for c in D["sub_haiku_1"]["calls"]), 4) == 0.0619 and abs(D["sub_haiku_1"]["cost"] - 0.0619 - 0.033) < 0.001 and has("$0.0619") and has("about $0.033"))
check("all other runs: recomputed cost equals the CLI's", all(abs(sum(cc(c) for c in r["calls"]) - r["cost"]) < 1e-6 for k, r in D.items() if k != "sub_haiku_1"))
check("plan run answered by Sonnet 5.5", all(c[7] == "claude-sonnet-5-5" for c in D["plan_haiku_1"]["calls"]) and D["plan_haiku_1"]["model"].startswith("claude-haiku"))
check("1-hour writes in std runs, 5-minute in TTL and DISABLE runs", all(not c[8] for c in D["std_haiku_2"]["calls"]) and all(c[8] for c in D["ttl5m_haiku_1"]["calls"]) and all(c[8] for c in D["nocache_haiku_1"]["calls"]))
ev = D["log_haiku_1"]["ev"]
check("log run: Read refused 479.4KB over 256KB", any("479.4KB" in e.get("s", "") and "256KB" in e.get("s", "") for e in ev) and has("479.4KB"))
check("prefix 8,344 (Haiku) and 4,782 (Sonnet) cached across sessions", D["std_haiku_2"]["calls"][0][2] == 8344 and D["std_sonnet_1"]["calls"][0][2] == 4782 and "8344" in open(os.path.join(HERE, "..", "parts", "32_js_trc_d_lab.js")).read())
check("Claude Code 2.1.289 in every run", all(r["ccv"] == "2.1.289" for r in D.values()) and has("2.1.289"))
check("Sonnet denials: multiple cd and sed", any("sed" in d["input"] for d in D["std_sonnet_1"]["denials"]))
# privacy and em-dashes across everything this tab ships
bad = re.compile("/Us" + "ers/|Us" + "ers-|gl" + "pat|sk-" + "ant|" + re.escape(os.path.basename(os.path.expanduser("~"))))
files = [os.path.join(HERE, "..", "parts", f) for f in os.listdir(os.path.join(HERE, "..", "parts")) if f.startswith("32_")]
files += [os.path.join(HERE, "recordings", f) for f in os.listdir(os.path.join(HERE, "recordings"))]
files += [os.path.join(HERE, f) for f in os.listdir(HERE) if os.path.isfile(os.path.join(HERE, f))]
leaks = [f for f in files if bad.search(open(f).read())]
check("no home path, user name or token prefix in %d files" % len(files), not leaks)
check("no em-dash in %d files" % len(files), not [f for f in files if chr(0x2014) in open(f).read()])
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
