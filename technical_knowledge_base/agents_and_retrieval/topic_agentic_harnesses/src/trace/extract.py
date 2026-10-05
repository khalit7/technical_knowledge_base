"""Turn the redacted recordings (recordings/*.jsonl and *.meta.json) into parts/32_js_trc_a_data.js,
the only data the Trace and context lab uses.  Usage: python3 extract.py
Per run: the init facts, the result record's totals, per-model-call usage (from message_start and
message_delta stream events: fresh input, cache write, cache read, output, thinking), and the events
in order (thinking, text, tool call, tool result), long tool results cut for the page with the cut said."""
import json, os, re, glob
HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
OUTJS = os.path.join(HERE, "..", "parts", "32_js_trc_a_data.js")
CUT = 700

TITLES = json.load(open(os.path.join(HERE, "runs.json")))

def short(s, n=CUT):
    if len(s) <= n: return s
    return s[:n] + "\n[... %d more characters not shown on the page; the full text is in src/trace/recordings]" % (len(s) - n)

def tool_input(name, inp):
    if name == "Bash": return inp.get("command", "")
    if name in ("Read", "Write"): return inp.get("file_path", "") + ("" if name == "Read" else "\n" + inp.get("content", ""))
    if name == "Edit": return inp.get("file_path", "") + "\n- " + inp.get("old_string", "") + "\n+ " + inp.get("new_string", "")
    return json.dumps(inp, ensure_ascii=False)

def result_text(c):
    if isinstance(c, str): return c
    if isinstance(c, list): return "\n".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in c)
    return json.dumps(c)

def run(label):
    recs = [json.loads(l) for l in open(os.path.join(REC, label + ".jsonl"))]
    meta = json.load(open(os.path.join(REC, label + ".meta.json")))
    init = next(r for r in recs if r.get("type") == "system" and r.get("subtype") == "init")
    res = next(r for r in recs if r.get("type") == "result")
    calls, cidx, last_by_parent, ev = [], {}, {}, []
    for r in recs:
        t = r.get("type"); par = r.get("parent_tool_use_id")
        if t == "stream_event":
            e = r["event"]
            if e["type"] == "message_start":
                m = e["message"]; u = m.get("usage") or {}
                cidx[m["id"]] = len(calls); last_by_parent[par] = len(calls)
                calls.append({"id": m["id"], "p": par, "m": m.get("model"), "in": u.get("input_tokens", 0), "cw": u.get("cache_creation_input_tokens", 0), "cr": u.get("cache_read_input_tokens", 0), "out": 0, "th": 0, "stop": None, "w5": ((u.get("cache_creation") or {}).get("ephemeral_5m_input_tokens") or 0) > 0})
            elif e["type"] == "message_delta":
                c = calls[last_by_parent[par]]; u = e.get("usage") or {}
                c["in"] = u.get("input_tokens", c["in"]); c["cw"] = u.get("cache_creation_input_tokens", c["cw"]); c["cr"] = u.get("cache_read_input_tokens", c["cr"])
                c["out"] = u.get("output_tokens", 0); c["th"] = (u.get("output_tokens_details") or {}).get("thinking_tokens", 0)
                c["stop"] = (e.get("delta") or {}).get("stop_reason")
        elif t == "assistant":
            m = r["message"]; ci = cidx.get(m.get("id"), -1)
            if ci == -1 and par:  # a subagent's own calls carry no usage records in the stream: file them under the call that spawned it
                own = next((x for x in ev if x.get("id") == par), None); ci = own["c"] if own else -1
            for b in m.get("content", []):
                if b["type"] == "thinking": ev.append({"c": ci, "k": "think", "p": par})
                elif b["type"] == "text": ev.append({"c": ci, "k": "text", "s": short(b["text"]), "p": par})
                elif b["type"] == "tool_use": ev.append({"c": ci, "k": "tool", "n": b["name"], "id": b["id"], "s": short(tool_input(b["name"], b.get("input", {})), 600), "p": par})
        elif t == "user":
            for b in (r.get("message") or {}).get("content", []) if isinstance((r.get("message") or {}).get("content"), list) else []:
                if isinstance(b, dict) and b.get("type") == "tool_result":
                    full = result_text(b.get("content"))
                    owner = next((x for x in reversed(ev) if x.get("id") == b.get("tool_use_id")), None)
                    ev.append({"c": owner["c"] if owner else -1, "k": "res", "id": b.get("tool_use_id"), "n": owner["n"] if owner else "", "e": bool(b.get("is_error")), "len": len(full), "s": short(full), "p": par})
    # merge consecutive thinking markers of the same call
    ev2 = []
    for x in ev:
        if x["k"] == "think" and ev2 and ev2[-1]["k"] == "think" and ev2[-1]["c"] == x["c"]: continue
        ev2.append(x)
    u = res.get("usage", {})
    post = meta.get("post_tests") or ""
    mu = list((res.get("modelUsage") or {}).values())
    sub = res.get("subagent_stats") or {}
    return {
        "id": label, "title": TITLES.get(label, {}).get("title", label), "group": TITLES.get(label, {}).get("group", ""),
        "note": TITLES.get(label, {}).get("note", ""),
        "model": init.get("model"), "perm": init.get("permissionMode"), "tools": init.get("tools"), "ccv": init.get("claude_code_version"),
        "agents": init.get("agents"),
        "dur": res.get("duration_ms"), "api": res.get("duration_api_ms"), "turns": res.get("num_turns"), "cost": res.get("total_cost_usd"),
        "wall": (lambda m: int(m.group(1)) if m else None)(re.search(r"wall=(\d+)s", meta.get("meta") or "")),
        "stop": res.get("subtype"), "term": res.get("terminal_reason"),
        "u_res": {"in": u.get("input_tokens"), "cw": u.get("cache_creation_input_tokens"), "cr": u.get("cache_read_input_tokens"), "out": u.get("output_tokens")},
        "u": {"in": sum(v.get("inputTokens", 0) for v in mu), "cw": sum(v.get("cacheCreationInputTokens", 0) for v in mu), "cr": sum(v.get("cacheReadInputTokens", 0) for v in mu), "out": sum(v.get("outputTokens", 0) for v in mu),
              "th": sum(v.get("thinkingTokens", 0) for v in mu), "cw1h": (u.get("cache_creation") or {}).get("ephemeral_1h_input_tokens"), "cw5m": (u.get("cache_creation") or {}).get("ephemeral_5m_input_tokens")},
        "ctxwin": mu[0].get("contextWindow") if mu else None, "mu": {k: {"cost": v.get("costUSD"), "in": v.get("inputTokens"), "out": v.get("outputTokens"), "cr": v.get("cacheReadInputTokens"), "cw": v.get("cacheCreationInputTokens")} for k, v in (res.get("modelUsage") or {}).items()},
        "denials": [{"tool": d.get("tool_name"), "input": short(json.dumps(d.get("tool_input"), ensure_ascii=False), 300)} for d in res.get("permission_denials") or []],
        "sub": sub.get("spawned", 0), "subtypes": sub.get("by_type") or {},
        "pass": TITLES.get(label, {}).get("pass", bool(re.search(r"^0 failed", post, re.M)) and "post_exit=0" in (meta.get("meta") or "")),
        "verdict": TITLES.get(label, {}).get("verdict", ""),
        "post": post.strip(), "diff": short(meta.get("diff") or "", 1500),
        "result": short(res.get("result") or "", 1200),
        "calls": [[c["in"], c["cw"], c["cr"], c["out"], c["th"], c["stop"], c["p"], c["m"], c["w5"]] for c in calls],
        "ev": ev2,
    }

if __name__ == "__main__":
    labels = [k for k in TITLES if os.path.exists(os.path.join(REC, k + ".jsonl"))]
    data = [run(l) for l in labels]
    js = "// Generated by src/trace/extract.py from the redacted recordings in src/trace/recordings. Do not edit by hand.\nwindow.TRC_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js = js.replace("</", "<\\/")
    open(OUTJS, "w").write(js)
    print(len(data), "runs,", len(js), "bytes")
