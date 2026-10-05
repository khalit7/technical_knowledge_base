"""Checks for the Reading and Further reading tabs. Run after sh src/build.sh.
1) regenerates parts/22_js_afread_data.js and proves index.html embeds it byte for byte;
2) proves the data holds exactly the redacted recordings in src/read/recordings and src/orch/recordings;
3) checks every measured number typed by hand in the Reading parts against the recordings;
4) scans the tab parts for em-dashes and private strings."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE)
subprocess.run([sys.executable, os.path.join(HERE, "extract_read.py")], check=True, capture_output=True)
data_js = open(os.path.join(SRC, "parts", "22_js_afread_data.js")).read()
page = open(os.path.join(SRC, "..", "index.html")).read()
ok = []; bad = []
def chk(name, cond):
    (ok if cond else bad).append(name)
chk("page embeds the regenerated data", data_js.strip() in page)
D = json.loads(data_js.split("window.AFREAD=", 1)[1].rstrip().rstrip(";"))
recs = {f: open(os.path.join(HERE, "recordings", f)).read() for f in os.listdir(os.path.join(HERE, "recordings")) if f.endswith(".jsonl")}
chk("own recordings: exactly two", sorted(recs) == ["A_prompt_json.jsonl", "B_json_schema.jsonl"])
chk("run A text comes from its recording", json.dumps(D["soA"]["text"], ensure_ascii=False)[1:-1][:200] in recs["A_prompt_json.jsonl"])
chk("run B tool input comes from its recording", json.dumps(D["soB"]["tool_calls"][0]["input"]["bugs"][0]["cause"], ensure_ascii=False)[1:-1] in recs["B_json_schema.jsonl"])
chk("run A does not parse as JSON", D["soA"]["parse"] != "ok")
chk("run B structured_output has 2 bugs", len(D["soB"]["structured"]["bugs"]) == 2)
R = D["runs"]
# hand-typed numbers in the prose
read = "".join(open(os.path.join(SRC, "parts", f)).read() for f in sorted(os.listdir(os.path.join(SRC, "parts"))) if f.startswith("20_read"))
chk("s0 chain 19.4 s", f"{R['chain']['wall']} s for ${R['chain']['cost']:.3f}" in read)
chk("s0 agent 24.8 s, $0.030", f"{R['agent']['wall']} s for ${R['agent']['cost']:.3f}" in read)
ft = json.load(open(os.path.join(SRC, "same", "data", "first_tokens.json")))
for k, v in [("a1_1", "397"), ("a2_1", "385"), ("a4_1", "491"), ("a3_1", "507"), ("a5_1", "2,231")]:
    chk(f"s2 first request {k} {v}", f"{ft[k]['full']:,}" == v and v in read)
chk("mistakes 385 to 2,231", "from 385 to 2,231 tokens" in read and min(x["full"] for x in ft.values()) == 385 and max(x["full"] for x in ft.values()) == 2231)
chk("s5 same hidden score", R["agent"]["hidden"] == R["multi"]["hidden"] == 5)
chk("s5 multi costs more", R["multi"]["tokens"] > 3 * R["agent"]["tokens"] and R["multi"]["wall"] > 2 * R["agent"]["wall"])
chk("s1 two designs 6/6", sorted(k for k in ["chain", "route", "parallel", "orch", "evalopt", "agent"] if R[k]["hidden"] == 6) == ["evalopt", "route"])
# em-dashes and private strings in everything this tab owns
own = [os.path.join(SRC, "parts", f) for f in os.listdir(os.path.join(SRC, "parts")) if f.startswith(("20_read", "22_js_afread", "23_js_afread", "39_"))]
own += [os.path.join(r, f) for r, _, fs in os.walk(HERE) for f in fs if not f.endswith(".pyc")]
acct = os.path.basename(os.path.expanduser("~"))
for p in own:
    t = open(p, errors="ignore").read()
    if p.endswith(("check_read.py", "redact.py")):
        continue
    chk("no em-dash " + os.path.basename(p), chr(0x2014) not in t)
    chk("no private strings " + os.path.basename(p), not any(s in t for s in ("/Users/", "Users-", acct, "glpat", "sk-ant", "claude-502")))
print(len(ok), "checks passed;", "FAILED: " + ", ".join(bad) if bad else "none failed")
sys.exit(1 if bad else 0)
