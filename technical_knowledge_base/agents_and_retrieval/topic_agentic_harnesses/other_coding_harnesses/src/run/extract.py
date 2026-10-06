"""Turn raw run logs (scratchpad) into one redacted JSON per run for the page (repo copy).
Wire view: every model request and reply, read from the logging proxy (local model) or the claude shim log
(Claude through claude -p). Usage: extract.py RUN_NAME OUT_DIR"""
import json, os, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import proxylib  # noqa: E402
from runmeta import META  # noqa: E402

N, OUT = sys.argv[1], Path(sys.argv[2])
R = HERE / "runs" / N
m = META[N]
SCRATCH = str(HERE.parent.parent)  # .../scratchpad
ids = {}
# strings that must never reach the repo, built at run time so this file does not contain them
BAD = ["/" + "Us" + "ers/", "Users" + "-", Path.home().name, "glp" + "at", "sk-" + "ant", "\u2014", next((x for x in SCRATCH.split("/") if x.startswith("claude-")), SCRATCH)]


def lab(prefix, x):
    k = (prefix, x)
    if k not in ids:
        ids[k] = f"{prefix}{sum(1 for p, _ in ids if p == prefix) + 1}"
    return ids[k]


def red(s):
    if not isinstance(s, str):
        return s
    s = s.replace(str(R / "work"), "/work").replace(str(R / "repo"), "/work").replace(str(HERE / "home"), "~")
    s = s.replace(str(HERE / "empty"), "/empty").replace(str(HERE), "/hoth").replace(SCRATCH, "/scratch")
    s = re.sub(r"/(?:private/)?(?:tmp|var/folders)/[^\s\"'`]*", "/tmp/...", s)
    s = re.sub("/" + "Users" + "/" + r"[^\s\"'`/]+", "/home/user", s)
    s = re.sub(r"\blk[0-9a-f]{32}\b", "<gateway-key>", s)
    s = re.sub(r"\b(ses|msg|prt|call|toolu|chatcmpl|resp|fc)_[A-Za-z0-9_-]{6,}", lambda x: lab(x.group(1) + "-", x.group(0)), s)
    s = re.sub(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", lambda x: lab("id-", x.group(0)), s)
    return s.replace("\u2014", ", ")


def clip(s, n):
    s = red(s or "")
    return s if len(s) <= n else s[:n] + f" [... {len(s) - n} more chars]"


def text_of(c):
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in c)
    return "" if c is None else str(c)


def kind_of(req, tools):
    msgs = req.get("messages", [])
    sysm = " ".join(text_of(x.get("content")) for x in msgs if x.get("role") == "system")
    for k, pat in m.get("kinds", []):
        if re.search(pat, sysm[:3000] + " " + text_of(msgs[-1].get("content") if msgs else "")[:400]):
            return k
    return m.get("default_kind", "main")


def calls_from_proxy():
    out = []
    for c in proxylib.load(R / "proxy.jsonl"):
        q, r = c["request"], c["resp"]
        tools = q.get("tools") or []
        out.append({"q": q, "tools": tools, "content": r["content"], "tool_calls": r["tool_calls"], "finish": r["finish_reason"],
                    "pin": (r["usage"] or {}).get("prompt_tokens"), "pout": (r["usage"] or {}).get("completion_tokens"),
                    "dt": round(c["t1"] - c["t0"], 1), "status": c["status"]})
    return out


def calls_from_shim():
    out = []
    for l in open(R / "shim.jsonl"):
        j = json.loads(l)
        res = ([x for x in j["records"] if x.get("type") == "result"] or [{}])[-1]
        u = res.get("usage", {})
        q = {"messages": j["request_messages"]}
        out.append({"q": q, "tools": [], "content": j["returned_text"], "full": j["full_text"], "cut": j["cut"], "tool_calls": [],
                    "finish": "stop", "pin": u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0),
                    "pout": u.get("output_tokens"), "dt": j["wall_s"], "cost": res.get("total_cost_usd"),
                    "cache_w": u.get("cache_creation_input_tokens", 0), "cache_r": u.get("cache_read_input_tokens", 0),
                    "model": (res.get("modelUsage") and list(res["modelUsage"].keys())[0]) or None})
    return out


raw = calls_from_shim() if m.get("source") == "shim" else calls_from_proxy()
TOKF = R / "tokens.json"  # counted offline with the model's chat template when the stream carried no usage
if TOKF.exists():
    for c, t in zip(raw, json.loads(TOKF.read_text())):
        if c["pin"] is None:
            c["pin"], c["pout"], c["tok_src"] = t["prompt_tokens"], t["completion_tokens"], "computed"
calls = []
first_main = None
for i, c in enumerate(raw):
    q = c["q"]
    k = kind_of(q, c["tools"])
    msgs = q.get("messages", [])
    rec = {"i": i, "kind": k, "n_msgs": len(msgs), "n_tools": len(c["tools"]), "in": c["pin"], "out": c["pout"], "dt": c["dt"],
           "finish": c["finish"], "text": clip(c["content"], 700), **({"tok_src": c["tok_src"]} if c.get("tok_src") else {}),
           "acts": [{"name": t["name"], "args": clip(t["arguments"], 500)} for t in c["tool_calls"]]}
    if "full" in c:
        rec["cut"] = c.get("cut")
        rec["full_text"] = clip(c["full"], 3000)
    if "cost" in c:
        rec.update({"cost": c["cost"], "cache_w": c["cache_w"], "cache_r": c["cache_r"]})
    # the observation the model saw for the previous action (last message of this request)
    if i > 0 and msgs:
        last = msgs[-1]
        rec["obs_role"] = last.get("role")
        rec["obs"] = clip(text_of(last.get("content")), 500)
    calls.append(rec)
    if first_main is None and k == "main":
        sysm = "\n\n".join(text_of(x.get("content")) for x in msgs if x.get("role") in ("system", "developer"))
        users = [text_of(x.get("content")) for x in msgs if x.get("role") == "user"]
        first_main = {"i": i, "system_chars": len(sysm), "system": clip(sysm, 6000), "n_msgs": len(msgs),
                      "user_chars": sum(len(u) for u in users), "user": clip("\n---\n".join(users), 2500),
                      "tools": [{"name": t["function"]["name"], "desc_chars": len(t["function"].get("description") or ""),
                                 "schema_chars": len(json.dumps(t["function"].get("parameters") or {})),
                                 "desc": clip(t["function"].get("description"), 240)} for t in c["tools"]],
                      "tools_chars": len(json.dumps(c["tools"])) if c["tools"] else 0, "in": c["pin"],
                      "params": {k2: v for k2, v in q.items() if k2 in ("temperature", "top_p", "max_tokens", "stop", "tool_choice", "parallel_tool_calls", "stream")}}

meta_out = {k: v for k, v in m.items() if k not in ("kinds",)}
fin = (R / "final_tests.txt").read_text() if (R / "final_tests.txt").exists() else ""
mj = R / "meta.json"
if mj.exists():
    mm = json.loads(mj.read_text())
    fin = fin or mm.get("tests_out", "")
    meta_out["exit_status"] = mm.get("exit_status")
    meta_out["wall_s"] = mm.get("wall_s")
diff = (R / "diff.txt").read_text() if (R / "diff.txt").exists() else (json.loads(mj.read_text()).get("diff", "") if mj.exists() else "")
ex = (R / "exit.txt").read_text() if (R / "exit.txt").exists() else ""
mw = re.search(r"seconds (\d+)", ex)
if mw and "wall_s" not in meta_out:
    meta_out["wall_s"] = int(mw.group(1))
fails = re.search(r"(\d+) failed", fin)
out = {"id": N, **meta_out, "tests_failed_after": int(fails.group(1)) if fails else None,
       "tests_out": red(fin.strip()), "diff": clip(diff, 3000), "calls": calls, "first": first_main,
       "totals": {"calls": len(calls), "in": sum(c["in"] or 0 for c in calls), "out": sum(c["out"] or 0 for c in calls),
                  "model_seconds": round(sum(c["dt"] or 0 for c in calls), 1)}}
s = json.dumps(out, indent=0, ensure_ascii=False)
for bad in BAD:
    assert bad not in s, (N, bad, s[max(0, s.find(bad) - 80):s.find(bad) + 80])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / f"{N}.json").write_text(s)
print(N, len(calls), "calls", out["totals"], "failed_after", out["tests_failed_after"])
