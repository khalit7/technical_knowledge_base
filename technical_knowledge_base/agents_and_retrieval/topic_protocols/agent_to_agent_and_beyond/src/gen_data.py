"""Turn lab/out/*.json and inputs/ucp_allbirds_profile.json into parts/22_js_data.js (window.A2AD).
Only trimming and splitting: every byte shown on the page comes from a recording. Run from anywhere."""
import json, os, re
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "lab", "out")
A = json.load(open(os.path.join(O, "a2a.json"))); M = json.load(open(os.path.join(O, "mcp_job.json")))
UCP = json.load(open(os.path.join(H, "inputs", "ucp_allbirds_profile.json")))
CUT = 1500


def short(s, n=CUT):
    return s if len(s) <= n else s[:n] + f"\n... ({len(s) - n} more bytes)"


def state_of(ev):
    r = ev.get("result", ev)
    if "task" in r: return r["task"]["status"]["state"]
    if "statusUpdate" in r: return r["statusUpdate"]["status"]["state"]
    if "status" in r and isinstance(r["status"], dict): return r["status"].get("state")
    return None


def _req_step(req, t, conn):
    first = req.split("\r\n", 1)[0]
    body = req.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in req else ""
    meth = ""
    try:
        meth = json.loads(body).get("method", "")
    except Exception:
        pass
    return {"dir": "up", "t": t, "conn": conn, "bytes": len(req.encode()), "title": (meth + "  " if meth else "") + first, "raw": short(req.replace("\r\n", "\n"))}


def steps_from_wire(reads):
    """Parse the unmerged reads per connection and direction: one step per HTTP request, per response head (with
    its body when it is not a stream), and per SSE event, each stamped with the time of the read that completed it."""
    out, buf = [], {}
    for r in reads:
        k = (r["conn"], r["dir"]); b = buf.get(k, {"txt": "", "sse": False, "head": False}); buf[k] = b
        b["txt"] += r["data"]; t, conn = r["t_ms"], r["conn"]
        while True:
            s = b["txt"]
            if r["dir"] == "up":
                if "\r\n\r\n" not in s: break
                head, rest = s.split("\r\n\r\n", 1)
                m = re.search(r"(?i)content-length: (\d+)", head); n = int(m.group(1)) if m else 0
                if len(rest.encode()) < n: break
                body = rest.encode()[:n].decode(); req = head + "\r\n\r\n" + body
                out.append(_req_step(req, t, conn)); b["txt"] = rest.encode()[n:].decode(); continue
            if not b["head"]:
                if "\r\n\r\n" not in s: break
                head, rest = s.split("\r\n\r\n", 1)
                if "text/event-stream" in head:
                    out.append({"dir": "down", "t": t, "conn": conn, "bytes": len(head.encode()) + 4,
                                "title": head.split("\r\n", 1)[0] + "  (text/event-stream: the stream stays open)", "raw": head.replace("\r\n", "\n")})
                    b["head"] = True; b["sse"] = True; b["txt"] = rest; continue
                m = re.search(r"(?i)content-length: (\d+)", head); n = int(m.group(1)) if m else 0
                if len(rest.encode()) < n: break
                body = rest.encode()[:n].decode(); st = None
                try:
                    st = state_of(json.loads(body))
                except Exception:
                    pass
                full = head + "\r\n\r\n" + body
                out.append({"dir": "down", "t": t, "conn": conn, "bytes": len(full.encode()), "title": head.split("\r\n", 1)[0] + (f"  ({st})" if st else ""),
                            "state": st, "raw": short(full.replace("\r\n", "\n"))})
                b["txt"] = rest.encode()[n:].decode(); continue
            m = re.search(r"data: (\{.*?\})\r?\n", s)
            if not m:
                if s.startswith("0\r\n\r\n") or s.endswith("0\r\n\r\n"):
                    if b.get("last"): b["last"]["bytes"] += len(s.encode())  # chunked-encoding framing and the final 0-length chunk
                    b.update(txt="", head=False, sse=False, last=None)
                break
            ev = json.loads(m.group(1)); rr = ev.get("result", ev); kind = next(iter(rr)); st = state_of(ev)
            lab = kind + (f": {st}" if st else "")
            if kind == "artifactUpdate":
                u = rr[kind]; a = u["artifact"]; lab += f" ({a.get('name')}{', append' if u.get('append') else ''}{', last chunk' if u.get('lastChunk') else ''})"
            out.append({"dir": "down", "t": t, "conn": conn, "bytes": len(s[:m.end()].encode()), "title": "SSE event  " + lab, "state": st,
                        "raw": short("data: " + json.dumps(ev, indent=1))})
            b["last"] = out[-1]; b["txt"] = s[m.end():]
    for b in buf.values():  # bytes left when a client hung up mid-stream
        if b.get("last") and b["txt"]: b["last"]["bytes"] += len(b["txt"].encode())
    return out


def text_for_model_a2a(events):
    """What team A's agent has to read: agent status messages and artifacts (not ids or envelopes)."""
    s = []
    for e in events:
        r = e.get("result", e)
        if "statusUpdate" in r and r["statusUpdate"]["status"].get("message"):
            s += [p.get("text", "") for p in r["statusUpdate"]["status"]["message"]["parts"]]
        if "artifactUpdate" in r:
            s += [p["text"] if "text" in p else json.dumps(p["data"]) for p in r["artifactUpdate"]["artifact"]["parts"]]
    return s


main = A["main"]
# parity with MCP's tools/list: the card's skills are what team A's model reads to choose the agent
a2a_text = [json.dumps(A["discovery"]["card"]["skills"])] + text_for_model_a2a(main["turn1"] + main["turn2"])
mcp_tools = [w for w in M["wire"] if w["dir"] == "up" and "tools/call" in w["data"]]
scen = {
    "mcp": {"label": "MCP: your agent drives team B's tools", "steps": steps_from_wire(M["reads"]),
            "requests": M["http_requests"], "up": M["bytes_up"], "down": M["bytes_down"], "wall": M["wall_ms"],
            "ctx": M["context_chars"], "calls": sum(1 for s in M["steps"] if s["call"].startswith("tools/call")),
            "ctx_items": [{"call": s["call"], "chars": len(s["into_context"])} for s in M["steps"]]},
    "main": {"label": "A2A: delegate the job, streamed", "steps": steps_from_wire(main["reads"]), "up": main["bytes_up"], "down": main["bytes_down"],
             "wall": main["wall_ms"], "ctx": sum(len(x) for x in a2a_text), "calls": 2, "requests": sum(1 for s in steps_from_wire(main["reads"]) if s["dir"] == "up"),
             "ctx_items": [{"call": "Agent Card skills (discovery)" if i == 0 else t[:60], "chars": len(t)} for i, t in enumerate(a2a_text)]},
    "resub": {"label": "A2A: stream dropped, then SubscribeToTask", "steps": steps_from_wire(A["resubscribe"]["reads"]), "up": A["resubscribe"]["bytes_up"], "down": A["resubscribe"]["bytes_down"]},
    "auth": {"label": "A2A: in-task authorization", "steps": steps_from_wire(A["in_task_auth"]["reads"]), "up": A["in_task_auth"]["bytes_up"], "down": A["in_task_auth"]["bytes_down"],
             "open": A["in_task_auth"]["stream_open_while_waiting"]},
    "cancel": {"label": "A2A: cancel a running task", "steps": steps_from_wire(A["canceled"]["reads"]), "up": A["canceled"]["bytes_up"], "down": A["canceled"]["bytes_down"]},
}
push = A["push"]
_ps = steps_from_wire(push["reads"]); _off = next(s["t"] for s in _ps if s["title"].startswith("SendMessage"))
scen["push"] = {"label": "A2A: push notifications to a webhook", "steps": _ps + [
    {"dir": "hook", "t": round(h["t_ms"] + _off, 2), "conn": 9, "bytes": int(h["headers"].get("content-length", 0)), "state": state_of(h["body"]),
     "title": "POST /a2a-hook  " + next(iter(h["body"])) + (f": {state_of(h['body'])}" if state_of(h["body"]) else ""),
     "raw": short("POST /a2a-hook (as received by team A's webhook)\n" + "\n".join(f"{k}: {v}" for k, v in h["headers"].items()) + "\n\n" + json.dumps(h["body"], indent=1))}
    for h in push["webhook"]], "up": push["bytes_up"], "down": push["bytes_down"], "hooks": len(push["webhook"])}


def add_ctx(k):
    """Characters each step puts in front of team A's model (same definition as the totals)."""
    st = scen[k]["steps"]
    if k == "mcp":
        items = [s for s in M["steps"] if not s["call"].startswith("(")]
        downs = [s for s in st if s["dir"] == "down"]
        for s, it in zip(downs, items):
            s["ctx"] = len(it["into_context"])
        user = next(s for s in M["steps"] if s["call"].startswith("("))
        downs[1]["ctx"] += len(user["into_context"])  # the user's scripted answer joins the context after list_suites
        downs[1]["note"] = "plus the user's answer: " + user["into_context"]
    else:
        first = True
        for s in st:
            if s["dir"] == "down" and first and "agent-card" in json.dumps(st[0]["title"]):
                s["ctx"] = len(json.dumps(A["discovery"]["card"]["skills"])); first = False; continue
            if s["title"].startswith("SSE event"):
                ev = json.loads(s["raw"][6:]) if not s["raw"].endswith("bytes)") else None
                if ev: s["ctx"] = sum(len(x) for x in text_for_model_a2a([ev]))


add_ctx("mcp"); add_ctx("main")
assert sum(s.get("ctx", 0) for s in scen["mcp"]["steps"]) == scen["mcp"]["ctx"], "mcp ctx mismatch"
assert sum(s.get("ctx", 0) for s in scen["main"]["steps"]) == scen["main"]["ctx"], ("main ctx mismatch", sum(s.get("ctx", 0) for s in scen["main"]["steps"]), scen["main"]["ctx"])

errs = []
for k, v in A.items():
    if not k.startswith("err_"): continue
    req = next((w["data"] for w in v["wire"] if w["dir"] == "up"), "")
    resp = next((w["data"] for w in v["wire"] if w["dir"] == "down"), "")
    b = v["result"]["body"]; e = b.get("error", {}) if isinstance(b, dict) else {}
    errs.append({"name": k[4:], "status": v["result"]["status"], "code": e.get("code"), "message": e.get("message") or (state_of(b.get("result", b)) if isinstance(b, dict) else ""),
                 "reason": (e.get("data") or e.get("details") or [{}])[0].get("reason") if (e.get("data") or e.get("details")) else None,
                 "req": short(req.replace("\r\n", "\n"), 900), "resp": short(resp.replace("\r\n", "\n"), 900)})

disc = A["discovery"]
data = {
    "recorded": A["recorded"], "versions": A["versions"],
    "card": json.dumps(disc["card"], indent=1), "card_bytes": disc["card_bytes"], "card_status": disc["status"],
    "card_wire": [short(w["data"].replace("\r\n", "\n"), 700) for w in disc["wire"]],
    "no_token": {"wire": [short(w["data"].replace("\r\n", "\n"), 700) for w in A["no_token"]["wire"]], "err": A["no_token"]["client_error"]},
    "scen": scen, "errors": errs,
    "bindings": {b: {"up": A["binding_" + b]["bytes_up"], "down": A["binding_" + b]["bytes_down"], "ms": A["binding_" + b]["ms"],
                     "req": short(next(w["data"] for w in A["binding_" + b]["wire"] if w["dir"] == "up" and "POST" in w["data"]).replace("\r\n", "\n"), 1200)}
                 for b in ("JSONRPC", "HTTP+JSON")},
    "rejected": json.dumps(A["rejected"]["events"][-1], indent=1)[:1600],
    "push_screened": A["push_screened"]["client_error"],
    "signing": A["signing"],
    "inauth": {"open": A["in_task_auth"]["stream_open_while_waiting"], "grant_ms": A["in_task_auth"]["grant"]["ms"], "final": A["in_task_auth"]["final_state"]},
    "resub": {"first": [(e["t_ms"], next(iter(e["data"]["result"]))) for e in A["resubscribe"]["first_stream"]],
              "second": [(e["t_ms"], next(iter(e["data"]["result"]))) for e in A["resubscribe"]["second_stream"]],
              "mid_state": A["resubscribe"]["get_task_between"]["body"]["result"]["status"]["state"]},
    "mcp_tools_list": next(s["into_context"] for s in M["steps"] if s["call"] == "tools/list"),
    "ucp": UCP["ucp"],
}
js = "window.A2AD=" + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n"
assert "\u2014" not in js
open(os.path.join(H, "parts", "22_js_data.js"), "w", encoding="utf-8").write(js)
scen["push"]["steps"].sort(key=lambda s: s["t"])
print("22_js_data.js", len(js), "bytes;", {k: len(v["steps"]) for k, v in scen.items()})
