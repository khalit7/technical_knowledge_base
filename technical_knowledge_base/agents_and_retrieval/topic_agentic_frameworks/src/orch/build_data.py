"""Build parts/32_js_a_data.js (window.ORCH) from the REDACTED recordings in recordings/ only."""
import json, os, re
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "recordings")
OUT = os.path.join(os.path.dirname(HERE), "parts", "32_js_a_data.js")
PAT = ["chain", "route", "parallel", "orch", "evalopt"]


def J(*p):
    return json.load(open(os.path.join(R, *p)))


def lines(*p):
    return [json.loads(l) for l in open(os.path.join(R, *p)) if l.strip()]


def tail(s, n):
    s = s.strip()
    return s if len(s) <= n else "[...] " + s[-n:]


def head(s, n):
    s = s.strip()
    return s if len(s) <= n else s[:n] + " [...]"


def instruction(prompt):
    # the part of the prompt after the pasted files and test output: what this call was asked to do
    parts = re.split(r"\n--- [^\n]+ ---\n", prompt)
    last = parts[-1]
    m = re.split(r"\n\n", last, maxsplit=1)
    return tail(m[1] if len(m) > 1 and len(m[0]) < 400 and "failed" in m[0] else last, 700)


def pattern(run):
    s = J(run, "summary.json")
    ev = []
    for e in s["events"]:
        if e["kind"] == "llm":
            ev.append(dict(k="llm", n=e["node"], l=e["label"], t0=e["t0"], t1=e["t1"], i=e["input"] + e["cache_write"] + e["cache_read"],
                           o=e["output"], th=e["thinking"], api=e.get("api_ms"), c=round(e["cost"], 6), sys=head(e["system"], 300),
                           ask=instruction(e["prompt"]), plen=len(e["prompt"]), rep=head(e["text"], 1400)))
        else:
            d = e.get("detail", {})
            ev.append(dict(k="code", n=e["node"], l=e["label"], t0=e["t0"], t1=e["t1"], d=head(json.dumps(d, ensure_ascii=False), 600)))
    out = dict(wall=s["wall"], passed=s["passed"], hidden=s["hidden"], core=s["final_core"], ev=ev)
    for k in ("routes", "plan", "rounds", "gate_ok"):
        if k in s:
            out[k] = s[k]
    return out


def ts(x):
    return datetime.fromisoformat(x.replace("Z", "+00:00")).timestamp()


def agent(run):
    s = J(run, "summary.json")
    recs = lines(run, "agent.jsonl")
    init = [r for r in recs if r.get("type") == "system" and r.get("subtype") == "init"][0]
    results = [r for r in recs if r.get("type") == "result"]
    mu = list(results[-1]["modelUsage"].values())[0]
    t_first = None
    steps, seen, seen_ui = [], {}, set()
    tool_owner = {}
    for r in recs:
        t = r.get("type")
        if t not in ("assistant", "user"):
            continue
        tt = ts(r["timestamp"]) if r.get("timestamp") else None
        if t_first is None and tt:
            t_first = tt
        who = r.get("parent_tool_use_id") or "lead"
        who = tool_owner.get(who, who)
        m = r["message"]
        if t == "assistant":
            mid = m.get("id")
            u = m.get("usage") or {}
            if mid not in seen:
                seen[mid] = dict(who=who, i=u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0),
                                 cr=u.get("cache_read_input_tokens", 0), cw=u.get("cache_creation_input_tokens", 0), o=u.get("output_tokens", 0))
            first = len(steps)
            for c in m["content"]:
                if c["type"] == "thinking":
                    steps.append(dict(t=round(tt - t_first, 3), who=who, k="think", x="(thinking; text not returned)"))
                elif c["type"] == "text":
                    steps.append(dict(t=round(tt - t_first, 3), who=who, k="text", x=head(c["text"], 500)))
                elif c["type"] == "tool_use":
                    inp = c["input"]
                    if c["name"] in ("Agent", "Task"):
                        tool_owner[c["id"]] = "sub%d" % (1 + sum(1 for v in tool_owner.values() if v.startswith("sub")))
                        x = inp.get("description", "") + ": " + head(inp.get("prompt", ""), 300)
                    elif c["name"] == "Edit":
                        x = "%s\n- %s\n+ %s" % (inp.get("file_path"), head(inp.get("old_string", ""), 200), head(inp.get("new_string", ""), 200))
                    else:
                        x = inp.get("command") or inp.get("file_path") or inp.get("pattern") or json.dumps(inp)
                    steps.append(dict(t=round(tt - t_first, 3), who=who, k="tool", tool=c["name"], x=head(x, 500)))
            if mid not in seen_ui and len(steps) > first:
                seen_ui.add(mid)
                steps[first]["ui"] = seen[mid]["i"]
        else:
            for c in m["content"] if isinstance(m["content"], list) else []:
                if c.get("type") == "tool_result":
                    cc = c.get("content")
                    if isinstance(cc, list):
                        cc = " ".join(x.get("text", "") for x in cc if isinstance(x, dict))
                    steps.append(dict(t=round(tt - t_first, 3), who=who, k="result", x=head(str(cc), 400), err=bool(c.get("is_error"))))
    per = {}
    for v in seen.values():
        p = per.setdefault(v["who"], dict(calls=0, i=0, cr=0, cw=0, o=0))
        p["calls"] += 1
        for k in ("i", "cr", "cw", "o"):
            p[k] += v[k]
    return dict(wall=s["wall"], passed=s["passed"], hidden=s["hidden"], core=s["final_core"],
                tools=init.get("tools"), version=init.get("claude_code_version"), model=init.get("model"), perm=init.get("permissionMode"),
                turns=[r["num_turns"] for r in results], cost=round(mu["costUSD"], 6),
                usage=dict(i=mu["inputTokens"], cw=mu["cacheCreationInputTokens"], cr=mu["cacheReadInputTokens"], o=mu["outputTokens"], th=mu.get("thinkingTokens")),
                subagents=results[-1].get("subagent_stats", {}).get("spawned", 0), per=per, steps=steps,
                denials=sum(1 for r in recs if r.get("type") == "system" and r.get("subtype") == "permission_denied"))


def langgraph():
    ev = lines("langgraph", "events.jsonl")
    t0 = ev[0]["t"]
    for e in ev:
        e["t"] = round(e["t"] - t0, 3)
        e.pop("pid", None)
    calls = {}
    for fn in sorted(os.listdir(os.path.join(R, "langgraph"))):
        if fn.endswith(".jsonl") and fn != "events.jsonl":
            res = [r for r in lines("langgraph", fn) if r.get("type") == "result"][-1]
            calls[fn[:-6]] = dict(cost=round(res["total_cost_usd"], 6), reply=head(res["result"], 900))
    def ck(fn):
        rows = J("langgraph", fn)
        return [dict(t=round(datetime.fromisoformat(r["created_at"]).timestamp() - t0, 3), id=r["checkpoint_id"][-6:], parent=(r["parent"] or "")[-6:], step=r["step"], source=r["source"], next=r["next"],
                     keys=r["keys"], interrupt=bool(r["interrupts"]), passed=r["values"].get("passed"),
                     hidden=r["values"].get("hidden"), diagnosis=head(r["values"].get("diagnosis", ""), 1200) if r["values"].get("diagnosis") else None,
                     patch=r["values"].get("patch")) for r in rows]
    return dict(events=ev, calls=calls, after_kill=ck("checkpoints_after_kill.json"), final=ck("checkpoints_fix-1.json"))


data = dict(baseline=J("baseline.json"), patterns={p: pattern(p) for p in PAT}, agent=agent("agent"),
            agent_denied=agent("agent_denied"), multi=agent("multi"), multi_ignored=agent("multi_ignored"), lg=langgraph())
data["baseline"].pop("hidden_source", None)
data["emdash"] = J("redaction.json")["emdash_replaced"]
data["versions"] = dict(langgraph="1.2.13", langgraph_checkpoint_sqlite="3.1.1", langgraph_checkpoint="4.2.0", langchain_core="1.6.6", python="3.12")
data["date"] = "5 October 2026"
js = "// Generated by src/orch/build_data.py from the redacted recordings in src/orch/recordings/. Do not edit by hand.\nwindow.ORCH=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
js = js.replace("</", "<\\/")
open(OUT, "w").write(js)
print("wrote", OUT, len(js), "bytes")
