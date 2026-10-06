#!/usr/bin/env python3
"""Check that numbers written by hand in the page match the recordings and inputs, that the page embeds
exactly the redacted recordings, and that no private string or em-dash is present. Run after build.sh."""
import json, re, sys
from pathlib import Path

S = Path(__file__).resolve().parent
html = (S.parent / "index.html").read_text()
text = re.sub(r"<[^>]+>", " ", html)
R = {p.stem: json.loads(p.read_text()) for p in (S / "recordings").glob("*.json") if p.stem != "order.json" and p.stem != "order"}
order = json.loads((S / "recordings" / "order.json").read_text())
M = json.loads((S / "inputs" / "repomap_lab.json").read_text())
ok = fail = 0


def check(name, cond, info=""):
    global ok, fail
    if cond:
        ok += 1
    else:
        fail += 1
        print("FAIL", name, info)


def has(s):
    return s in text or s in html


fmt = lambda n: f"{n:,}"
# 1. the page embeds exactly the recordings, in order
m = re.search(r"window\.HR_DATA=(\{.*?\});\n", html, re.S)
emb = json.loads(m.group(1).replace("<\\/", "</"))
check("embedded runs = recordings", [r["id"] for r in emb["runs"]] == order)
for r in emb["runs"]:
    check("embedded equals file " + r["id"], r == R[r["id"]])
# 2. hand-written numbers
cx, oc = R["codex_1"], R["opencode_1"]
check("codex calls 5", cx["totals"]["calls"] == 5 and has("5 calls, 47,636 input tokens"))
check("codex input", cx["totals"]["in"] == 47636)
check("codex 12 tools", len(cx["first"]["tools"]) == 12 and has("gave the unknown model 12 tools"))
check("codex no apply_patch", all(t["name"] != "apply_patch" for t in cx["first"]["tools"]))
check("codex justification repeats", sum(1 for c in cx["calls"] if c["acts"] and "justification" in c["acts"][0]["args"]) == 4)
check("codex last length", cx["calls"][-1]["finish"] == "length" and cx["calls"][-1]["out"] == 2048)
check("opencode system/tool chars", oc["first"]["system_chars"] == 9602 and oc["first"]["tools_chars"] == 21144 and has("9,602 characters") and has("21,144 characters"))
check("opencode 10 tools, bash 4628", len(oc["first"]["tools"]) == 10 and [t for t in oc["first"]["tools"] if t["name"] == "bash"][0]["desc_chars"] == 4628)
check("opencode 7247 first", oc["first"]["in"] == 7247 and has("7,247 prompt tokens"))
check("opencode 13 calls, explore 3091", oc["totals"]["calls"] == 13 and [c for c in oc["calls"] if c["kind"] == "subagent"][0]["in"] == 3091)
check("codex 9210 and gemini 11452 larger than opencode", cx["first"]["in"] == 9210 and R["gemini_1"]["first"]["in"] == 11452 and has("at 11,452, were larger"))
gm, oh, mt, mx = R["gemini_1"], R["ohs_1"], R["mswe_local_tool"], R["mswe_local_text"]
firsts = {k: r["first"]["in"] for k, r in R.items() if r.get("first")}
check("gemini first is the largest", max(firsts, key=firsts.get) == "gemini_1" and has("The first request was the largest of all six harnesses"))
check("gemini chars", gm["first"]["system_chars"] == 32924 and gm["first"]["tools_chars"] == 17722 and len(gm["first"]["tools"]) == 15 and has("32,924 characters") and has("17,722 characters"))
check("gemini 6 calls, 1 failing, 4 parallel first", gm["totals"]["calls"] == 6 and gm["tests_failed_after"] == 1 and len(gm["calls"][0]["acts"]) == 4)
check("gemini last empty", not gm["calls"][-1]["acts"] and not gm["calls"][-1]["text"].strip())
check("ohs chars and tokens", oh["first"]["system_chars"] == 15228 and oh["first"]["tools_chars"] == 17056 and oh["first"]["in"] == 7196 and has("15,228 characters") and has("17,056 characters"))
check("ohs task_tracker 5051", [t for t in oh["first"]["tools"] if t["name"] == "task_tracker"][0]["desc_chars"] == 5051)
check("ohs 30 calls 322241", oh["totals"]["calls"] == 30 and oh["totals"]["in"] == 322241 and has("322,241 input tokens"))
check("ohs 5 str_replace", sum(1 for c in oh["calls"] if c["acts"] and c["acts"][0]["name"] == "file_editor" and "str_replace" in c["acts"][0]["args"]) == 5)
check("ohs rika", any("security_rika" in a["args"] for c in oh["calls"] for a in c["acts"]))
check("ratio 95", round(oh["totals"]["in"] / R["aider_whole_1"]["totals"]["in"]) == 95 and has("about 95 times"))
check("mswe tool 23 calls 86231, 6 sed", mt["totals"]["calls"] == 23 and mt["totals"]["in"] == 86231 and sum(1 for c in mt["calls"] if c["acts"] and "sed -i" in c["acts"][0]["args"]) == 6 and has("86,231 input tokens"))
check("mswe tool ended on 3 no-tool replies", all(not c["acts"] for c in mt["calls"][-3:]) and mt["exit_status"] == "RepeatedFormatError")
check("mswe text 6 calls submitted", mx["totals"]["calls"] == 6 and mx["exit_status"] == "Submitted" and mx["tests_failed_after"] == 2)
check("mswe text weak check", "top_words('a a b b c c', 2)" in json.dumps(mx["calls"]) or "top_words(\'a a b b c c\', 2)" in json.dumps(mx["calls"]))
check("both mswe no diff", not mt["diff"].strip() and not mx["diff"].strip())
ad, aw, ah = R["aider_diff_1"], R["aider_whole_1"], R["aider_haiku_diff"]
check("aider diff 7 calls 138 s", ad["totals"]["calls"] == 7 and ad["wall_s"] == 138 and has("(7 calls, 138 s)"))
check("aider whole 3 calls 42 s", aw["totals"]["calls"] == 3 and aw["wall_s"] == 42 and has("(3 calls, 42 s)"))
check("aider first prompt 879 vs 2655", aw["first"]["in"] == 879 and ad["first"]["in"] == 2655)
check("aider system chars 5407 vs 1191", ad["first"]["system_chars"] == 5407 and aw["first"]["system_chars"] == 1191)
check("aider haiku 3 calls 25 s", ah["totals"]["calls"] == 3 and ah["wall_s"] == 25 and has("3 calls and 25 s"))
check("all aider pass", all(r["tests_failed_after"] == 0 for r in (ad, aw, ah)))
fr, cr = R["mswe_haiku_free"], R["mswe_haiku_cut"]
check("haiku free fails, 10 calls", fr["tests_failed_after"] == 2 and fr["totals"]["calls"] == 10)
check("haiku cut fails, no diff", cr["tests_failed_after"] == 2 and not cr["diff"].strip())
check("haiku free no diff", not fr["diff"].strip())
check("haiku free All tests passed invented", any("All tests passed!" in (c.get("full_text") or "") for c in fr["calls"]))
check("haiku cut core.py empty", any("core.py file appears to be empty" in (c.get("text") or "") for c in cr["calls"]))
# repo map
sc = M["sc"]
F = [f for f, _ in M["files"]]
rk = lambda k, f: sc[k]["rank"][F.index(f)]
check("serialize 0.130 cold top", abs(rk("cold", "utils/serialize.py") - 0.130) < 0.0006 and max(sc["cold"]["rank"]) == rk("cold", "utils/serialize.py"))
check("2233 tokens at 2048 (chat)", sc["chat"]["maps"]["2048"]["tokens"] == 2233 and has("2,233-token map"))
check("interactive and exceptions climb", rk("chat", "agents/interactive.py") > rk("cold", "agents/interactive.py") and rk("chat", "exceptions.py") > rk("cold", "exceptions.py"))
top3 = sorted(F, key=lambda f: -rk("chat_ident", f))[:3]
check("docker and retry top three", "environments/docker.py" in top3 and "models/utils/retry.py" in top3, top3)
check("pers 1.69 and 3.39", abs(sc["chat"]["pers"]["agents/default.py"] - 1.6949) < 1e-3 and abs(sc["chat_ident"]["pers"]["environments/docker.py"] - 3.3898) < 1e-3)
check("59 files", M["n_files"] == 59 and has("59 Python files"))
check("47 ranked", sum(1 for x in sc["cold"]["rank"] if x > 0) == 47)
# hygiene
for bad in ("/" + "Us" + "ers/", "Us" + "ers-", Path.home().name, "glp" + "at", "sk-" + "ant", "\u2014", "claude" + "-502"):
    check("no " + bad, bad not in html)
print(f"ok={ok} fail={fail}")
sys.exit(1 if fail else 0)
