"""Turn the redacted recordings (recordings/*.jsonl and *.meta.json) into parts/22_js_hcc_data.js, the only run
data the page uses. Usage: python3 extract.py
Per run: init facts, result totals (from modelUsage, which includes subagents), per-model-call usage from the
message_start / message_delta stream events, and the events in order (thinking, text, tool call, tool result,
permission denial, hook event, system notes), each with its arrival time; long texts are cut for the page and the
cut is said. Also builds the permission matrix: the twelve scripted actions of perm.txt matched to the tool calls of
each permission run, with the outcome (ran, denied by the permission layer, or failed inside the tool)."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
OUTJS = os.path.join(HERE, "parts", "22_js_hcc_data.js")
CUT = 360
RUNS = json.load(open(os.path.join(HERE, "runs.json")))

def short(s, n=CUT):
    if len(s) <= n:
        return s
    return s[:n] + "\n[... %d more characters not shown here; the full text is in src/recordings]" % (len(s) - n)

def tool_input(name, inp):
    if name == "Bash":
        return inp.get("command", "") + (" (timeout %s ms)" % inp["timeout"] if "timeout" in inp else "")
    if name == "Read":
        return inp.get("file_path", "") + "".join(" %s=%s" % (k, inp[k]) for k in ("offset", "limit") if k in inp)
    if name == "Write":
        return inp.get("file_path", "") + "\n" + inp.get("content", "")
    if name == "Edit":
        return inp.get("file_path", "") + "\n- " + inp.get("old_string", "") + "\n+ " + inp.get("new_string", "")
    if name == "Grep":
        return "pattern %r in %s, mode %s" % (inp.get("pattern"), inp.get("path", "."), inp.get("output_mode", "files_with_matches"))
    if name == "Glob":
        return inp.get("pattern", "")
    return json.dumps(inp, ensure_ascii=False)

def result_text(c):
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(x.get("text", "") if isinstance(x, dict) else str(x) for x in c)
    return json.dumps(c)

def run(label):
    recs = [json.loads(l) for l in open(os.path.join(REC, label + ".jsonl"))]
    meta = json.load(open(os.path.join(REC, label + ".meta.json")))
    init = next((r for r in recs if r.get("type") == "system" and r.get("subtype") == "init"), {})
    results = [r for r in recs if r.get("type") == "result"]
    res = results[-1] if results else {}
    calls, cidx, last_by_parent, ev = [], {}, {}, []
    denied = {}
    for r in recs:
        if r.get("type") == "system" and r.get("subtype") == "permission_denied":
            denied[r.get("tool_use_id")] = r.get("message") or r.get("decision_reason") or ""
    for r in recs:
        t = r.get("type"); par = r.get("parent_tool_use_id"); ts = r.get("_t")
        if t == "stream_event":
            e = r["event"]
            if e["type"] == "message_start":
                m = e["message"]; u = m.get("usage") or {}
                cidx[m["id"]] = len(calls); last_by_parent[par] = len(calls)
                calls.append({"id": m["id"], "p": par, "m": m.get("model"), "in": u.get("input_tokens", 0), "cw": u.get("cache_creation_input_tokens", 0), "cr": u.get("cache_read_input_tokens", 0), "out": 0, "th": 0, "stop": None, "t": ts})
            elif e["type"] == "message_delta" and par in last_by_parent:
                c = calls[last_by_parent[par]]; u = e.get("usage") or {}
                c["in"] = u.get("input_tokens", c["in"]); c["cw"] = u.get("cache_creation_input_tokens", c["cw"]); c["cr"] = u.get("cache_read_input_tokens", c["cr"])
                c["out"] = u.get("output_tokens", 0); c["th"] = (u.get("output_tokens_details") or {}).get("thinking_tokens", 0)
                c["stop"] = (e.get("delta") or {}).get("stop_reason")
        elif t == "assistant":
            m = r["message"]; ci = cidx.get(m.get("id"), -1)
            if ci == -1 and par:
                own = next((x for x in ev if x.get("id") == par), None); ci = own["c"] if own else -1
            for b in m.get("content", []):
                if b["type"] == "thinking":
                    ev.append({"c": ci, "k": "think", "p": par, "t": ts})
                elif b["type"] == "text":
                    ev.append({"c": ci, "k": "text", "s": short(b["text"]), "p": par, "t": ts})
                elif b["type"] == "tool_use":
                    ev.append({"c": ci, "k": "tool", "n": b["name"], "id": b["id"], "s": short(tool_input(b["name"], b.get("input", {})), 500), "inp": b.get("input", {}), "p": par, "t": ts})
        elif t == "user":
            msg = r.get("message") or {}
            content = msg.get("content")
            if isinstance(content, str):
                ev.append({"c": -1, "k": "user", "s": short(content, 300), "p": par, "t": ts})
                continue
            for b in content or []:
                if isinstance(b, dict) and b.get("type") == "tool_result":
                    full = result_text(b.get("content"))
                    owner = next((x for x in reversed(ev) if x.get("id") == b.get("tool_use_id")), None)
                    tid = b.get("tool_use_id")
                    ev.append({"c": owner["c"] if owner else -1, "k": "res", "id": tid, "n": owner["n"] if owner else "", "e": bool(b.get("is_error")), "deny": tid in denied, "len": len(full), "s": short(full), "p": par, "t": ts})
                elif isinstance(b, dict) and b.get("type") == "text" and not par:
                    ev.append({"c": -1, "k": "user", "s": short(b.get("text", ""), 300), "p": par, "t": ts})
        elif t == "system" and r.get("subtype") in ("hook_started", "hook_response", "hook_progress"):
            if r.get("subtype") == "hook_started":
                continue
            ev.append({"c": -1, "k": "hook", "sub": r.get("subtype"), "ev": r.get("hook_event") or r.get("hook_event_name"), "name": r.get("hook_name"),
                       "out": short((r.get("output") or r.get("stdout") or "") + (r.get("stderr") or ""), 260), "code": r.get("exit_code"), "outcome": r.get("outcome"), "t": ts})
        elif t == "system" and r.get("subtype") in ("task_started", "task_progress", "task_notification"):
            u = r.get("usage") or {}
            ev.append({"c": -1, "k": "task", "sub": r.get("subtype"), "s": short(r.get("description") or r.get("summary") or "", 160), "tok": u.get("total_tokens"), "tu": u.get("tool_uses"), "t": ts})
        elif t == "system" and r.get("subtype") == "permission_denied":
            ev.append({"c": -1, "k": "deny", "n": r.get("tool_name"), "why": r.get("decision_reason_type"), "t": ts})
        elif t == "result":
            ev.append({"c": -1, "k": "result", "sub": r.get("subtype"), "turns": r.get("num_turns"), "s": short(r.get("result") or "", 400), "t": ts})
    for x in ev:
        x.pop("inp", None) if x["k"] != "tool" else None
    ev2 = []
    for x in ev:
        if x["k"] == "think" and ev2 and ev2[-1]["k"] == "think" and ev2[-1]["c"] == x["c"]:
            continue
        ev2.append(x)
    u = res.get("usage", {})
    mu = list((res.get("modelUsage") or {}).values())
    post = meta.get("post_tests") or ""
    info = RUNS.get(label, {})
    return {
        "id": label, "title": info.get("title", label), "group": info.get("group", ""), "note": info.get("note", ""), "flags": info.get("flags", ""),
        "prompt": info.get("prompt", ""),
        "model": init.get("model"), "perm": init.get("permissionMode"), "tools": init.get("tools"), "ccv": init.get("claude_code_version"),
        "agents": init.get("agents"),
        "dur": res.get("duration_ms"), "api": res.get("duration_api_ms"), "turns": res.get("num_turns"), "cost": res.get("total_cost_usd"),
        "nres": len(results), "stop": res.get("subtype"), "term": res.get("terminal_reason"), "is_error": res.get("is_error"),
        "u_res": {"in": u.get("input_tokens"), "cw": u.get("cache_creation_input_tokens"), "cr": u.get("cache_read_input_tokens"), "out": u.get("output_tokens")},
        "u": {"in": sum(v.get("inputTokens", 0) for v in mu), "cw": sum(v.get("cacheCreationInputTokens", 0) for v in mu), "cr": sum(v.get("cacheReadInputTokens", 0) for v in mu), "out": sum(v.get("outputTokens", 0) for v in mu),
              "th": sum(v.get("thinkingTokens", 0) for v in mu)},
        "mu": {k: {"cost": v.get("costUSD"), "in": v.get("inputTokens"), "out": v.get("outputTokens"), "cr": v.get("cacheReadInputTokens"), "cw": v.get("cacheCreationInputTokens"), "win": v.get("contextWindow")} for k, v in (res.get("modelUsage") or {}).items()},
        "denials": len(res.get("permission_denials") or []),
        "sub": (res.get("subagent_stats") or {}).get("spawned", 0),
        "pass": bool(re.search(r"^0 failed", post, re.M)),
        "post": post.strip(), "diff": short(meta.get("diff") or "", 1500), "hooklog": meta.get("hook_log"),
        "calls": [[c["in"], c["cw"], c["cr"], c["out"], c["th"], c["stop"], c["p"], c["m"], c["t"]] for c in calls],
        "ev": ev2,
    }

# The twelve scripted actions of prompts/perm.txt, and how to recognise each tool call.
ACTIONS = [
    ("Read textstats/core.py", lambda n, i: n == "Read" and i.get("file_path", "").endswith("textstats/core.py")),
    ("Bash: ls", lambda n, i: n == "Bash" and i.get("command", "").strip() == "ls"),
    ("Bash: python3 tests/test_core.py", lambda n, i: n == "Bash" and i.get("command", "").startswith("python3 tests")),
    ("Bash: python tests/test_core.py", lambda n, i: n == "Bash" and i.get("command", "").startswith("python tests")),
    ("Edit textstats/core.py", lambda n, i: n == "Edit" and i.get("file_path", "").endswith("textstats/core.py")),
    ("Write notes.txt", lambda n, i: n == "Write" and i.get("file_path", "").endswith("/notes.txt")),
    ("Edit tests/test_core.py", lambda n, i: n == "Edit" and i.get("file_path", "").endswith("tests/test_core.py")),
    ("Bash: sed -i '' ... README.md", lambda n, i: n == "Bash" and i.get("command", "").startswith("sed -i")),
    ("Bash: ls && rm -f notes.txt", lambda n, i: n == "Bash" and i.get("command", "").startswith("ls &&")),
    ("Bash: rm -f notes.txt", lambda n, i: n == "Bash" and i.get("command", "").strip() == "rm -f notes.txt"),
    ("Bash: curl -sI https://example.com", lambda n, i: n == "Bash" and i.get("command", "").startswith("curl")),
    ("Write ../outside.txt", lambda n, i: n == "Write" and i.get("file_path", "").endswith("outside.txt")),
]

def matrix(runs):
    cols = []
    for r in runs:
        if r["group"] != "perm":
            continue
        tools = [x for x in r["ev"] if x["k"] == "tool" and not x.get("p")]
        resmap = {x["id"]: x for x in r["ev"] if x["k"] == "res"}
        cells, pos, extra = [], 0, []
        for name, f in ACTIONS:
            hit = None
            for j in range(pos, len(tools)):
                if f(tools[j]["n"], tools[j].get("inp", {})):
                    hit = j; break
            if hit is None:
                cells.append({"o": "missing", "m": "not attempted"}); continue
            extra += [tools[j]["n"] + ": " + tools[j]["s"].split("\n")[0][-60:] for j in range(pos, hit)]
            pos = hit + 1
            rs = resmap.get(tools[hit]["id"], {})
            o = "ran"
            if rs.get("deny") or "denied by your permission settings" in rs.get("s", ""):
                o = "denied"
            elif rs.get("e") and "tool_use_error" in rs.get("s", ""):
                o = "tool"  # refused by the tool's own input check (for example read-before-edit)
            elif rs.get("e"):
                o = "fail"  # permitted and run; the command itself failed (non-zero exit)
            cells.append({"o": o, "m": short(rs.get("s", ""), 220)})
        cols.append({"id": r["id"], "col": RUNS[r["id"]].get("col", r["id"]), "model": r["model"], "perm": r["perm"],
                     "answered": sorted({c[7] for c in r["calls"] if c[7]}), "cells": cells, "extra": extra})
    return {"actions": [a[0] for a in ACTIONS], "cols": cols}

if __name__ == "__main__":
    labels = [k for k in RUNS if os.path.exists(os.path.join(REC, k + ".jsonl"))]
    data = [run(l) for l in labels]
    mx = matrix(data)
    for r in data:
        for x in r["ev"]:
            x.pop("inp", None)
        r["nthink"] = sum(1 for x in r["ev"] if x["k"] == "think")
        r["ev"] = [x for x in r["ev"] if x["k"] not in ("think", "deny")]
    js = ("// Generated by src/extract.py from the redacted recordings in src/recordings. Do not edit by hand.\n"
          "window.HCC=" + json.dumps({"runs": data, "matrix": mx, "prompts": {f: open(os.path.join(HERE, "prompts", f)).read() for f in sorted({r["prompt"] for r in data if r["prompt"]})}}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    js = js.replace("</", "<\\/")
    open(OUTJS, "w").write(js)
    print(len(data), "runs,", len(js), "bytes")
