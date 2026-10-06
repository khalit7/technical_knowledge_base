"""Turn the raw fsdk recordings (kept outside the repo) into redacted, compact repo copies.
Usage: python3 redact.py RAW_DIR WORK_DIR   (WORK_DIR held one task directory per run: WORK_DIR/<label>)
Writes recordings/<label>.json and recordings/s7_connectors.json.

Rules:
- the run's task directory becomes /work; the recording scratch area becomes /scratch; the home directory becomes
  /home/user; Claude Code's per-project folder name for the task directory becomes -work;
- the login name, the machine's git identity and any e-mail address become "user" / "user@example";
- the SDK's initialize response keeps only a whitelist (permission mode, hooks applied, session state, built-in agent
  names, a count of commands); account, models, pid and directories are dropped;
- the init record keeps model, permissionMode, tools, claude_code_version, cwd and mcp server names that we created;
  the built-in tool list of the bare run is kept as documented names plus a count of the rest;
- session ids, message uuids, request ids and tool ids become short labels; thinking keeps a marker, no signature;
- hook inputs lose transcript_path and session_id;
- texts longer than 2,500 characters are cut with a note; em-dashes become ", " (counted).
A final scan refuses to write if a home path, the login name, an e-mail address or a token prefix remains."""
import getpass, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "recordings")
RAW, WORK = sys.argv[1], sys.argv[2]
SCRATCH = os.path.dirname(os.path.dirname(os.path.abspath(WORK)))      # .../scratchpad/agents
HOME = os.path.expanduser("~")
USER = getpass.getuser()

def git_ident():
    out = []
    for k in ("user.name", "user.email"):
        try:
            v = subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
            if v: out.append(v)
        except Exception:
            pass
    return out
IDENT = git_ident()
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b")
EMD = "—"
emdash_count = 0

DOC_TOOLS = {"Read", "Edit", "Write", "Bash", "WebFetch", "WebSearch", "Skill", "Task", "Agent", "NotebookEdit",
             "ToolSearch", "TaskCreate", "TaskGet", "TaskList", "TaskUpdate", "TaskStop", "Monitor", "SendMessage",
             "EnterWorktree", "ExitWorktree", "Glob", "Grep"}

class Labels:
    def __init__(self, prefix):
        self.p, self.m = prefix, {}
    def __call__(self, v):
        if v is None: return None
        if v not in self.m: self.m[v] = f"{self.p}{len(self.m) + 1}"
        return self.m[v]

def scrub_text(s, label):
    global emdash_count
    if not isinstance(s, str): return s
    wd = os.path.join(WORK, label)
    for real in sorted({wd, os.path.realpath(wd)}, key=len, reverse=True):
        s = s.replace(real, "/work")
        s = s.replace(re.sub(r"[^A-Za-z0-9]", "-", real), "-work")
    for real in sorted({SCRATCH, os.path.realpath(SCRATCH)}, key=len, reverse=True):
        s = s.replace(real, "/scratch")
        s = s.replace(re.sub(r"[^A-Za-z0-9]", "-", real), "-scratch")
    s = s.replace(HOME, "/home/user")
    s = re.sub(r"/private/tmp/claude-\d+", "/tmp/claude", s)
    for v in IDENT:
        s = re.sub(re.escape(v), "user", s, flags=re.I)
    s = EMAIL.sub("user@example", s)
    s = re.sub(re.escape(USER), "user", s, flags=re.I)
    n = s.count(EMD)
    if n:
        emdash_count += n; s = s.replace(EMD, ", ")
    return s

def cut(s, n=2500):
    if isinstance(s, str) and len(s) > n:
        return s[:n] + f"\n[... cut: {len(s) - n} more characters]"
    return s

def deep(o, f):
    if isinstance(o, dict): return {k: deep(v, f) for k, v in o.items()}
    if isinstance(o, list): return [deep(v, f) for v in o]
    return f(o)

def block(b, L):
    """One content block (Python dataclass dict or TS API dict) to a compact form."""
    if "thinking" in b or b.get("type") in ("thinking", "redacted_thinking"):
        return {"k": "thinking"}
    if "text" in b and "tool_use_id" not in b and b.get("type", "text") == "text":
        return {"k": "text", "text": cut(b["text"])}
    if "name" in b and "input" in b:
        return {"k": "call", "id": L.tool(b.get("id")), "name": b["name"], "input": deep(b["input"], cut)}
    if "tool_use_id" in b:
        c = b.get("content")
        if isinstance(c, list):
            c = "\n".join(x.get("text", "") for x in c if isinstance(x, dict))
        return {"k": "result", "id": L.tool(b["tool_use_id"]), "text": cut(c if isinstance(c, str) else json.dumps(c)),
                "error": bool(b.get("is_error"))}
    return {"k": "other", "type": b.get("type")}

def usage_small(u):
    if not u: return None
    return {k: u.get(k) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens") if k in u} | (
        {"cache_1h": (u.get("cache_creation") or {}).get("ephemeral_1h_input_tokens"),
         "cache_5m": (u.get("cache_creation") or {}).get("ephemeral_5m_input_tokens")} if u.get("cache_creation") else {}) | (
        {"thinking": (u.get("output_tokens_details") or {}).get("thinking_tokens")} if u.get("output_tokens_details") else {})

def init_small(d, label):
    tools = d.get("tools") or []
    if label == "s3_bare":
        doc = [t for t in tools if t in DOC_TOOLS]
        tools_out = {"documented": doc, "count": len(tools), "others": len(tools) - len(doc)}
    else:
        tools_out = tools
    return {"model": d.get("model"), "permissionMode": d.get("permissionMode"), "tools": tools_out,
            "claude_code_version": d.get("claude_code_version"), "cwd": "/work",
            "mcp_servers": [s.get("name") for s in d.get("mcp_servers") or [] if s.get("name") == "repo"],
            "agents_count": len(d.get("agents") or []), "apiKeySource": d.get("apiKeySource")}

def convert_events(label, path):
    L = type("L", (), {})(); L.tool = Labels("t"); L.sess = Labels("session-"); L.msg = Labels("m")
    ev = []
    for line in open(path):
        d = json.loads(line); ty = d.get("_type"); t = d.get("_t")
        phase = d.get("phase")
        base = {"t": t} | ({"phase": phase} if phase else {})
        if ty == "callback":
            e = {k: v for k, v in d.items() if k not in ("_type", "_t", "phase")}
            if "usage" in e:      # context usage report: keep categories and per-tool tokens only
                u = e.pop("usage")
                e["categories"] = [{"name": c["name"], "tokens": c["tokens"]} for c in u.get("categories", [])]
                e["mcpTools"] = [{"name": x["name"], "tokens": x["tokens"]} for x in u.get("mcpTools", [])]
                e["totalTokens"], e["maxTokens"] = u.get("totalTokens"), u.get("maxTokens")
                e["autoCompactThreshold"] = u.get("autoCompactThreshold")
            if "input" in e: e["input"] = deep(e["input"], cut)
            ev.append(base | {"k": "cb"} | e); continue
        if ty in ("SystemMessage", "system") and (d.get("subtype") == "init"):
            data = d.get("data") or d
            ev.append(base | {"k": "init", "init": init_small(data, label), "session": L.sess(data.get("session_id"))}); continue
        if ty in ("SystemMessage", "system") and d.get("subtype") == "permission_denied":
            data = d.get("data") or d
            ev.append(base | {"k": "denied", "tool": data.get("tool_name"), "id": L.tool(data.get("tool_use_id")),
                              "subagent": bool(data.get("agent_id"))}); continue
        if ty in ("SystemMessage", "system", "RateLimitEvent", "rate_limit_event"):
            continue      # thinking-progress, session state, rate limits: not shown
        if ty.startswith("Task"):
            ev.append(base | {"k": "task", "sub": d.get("subtype"), "tool_use": L.tool(d.get("tool_use_id")),
                              "status": d.get("status"), "usage": d.get("usage")}); continue
        if ty in ("AssistantMessage", "assistant"):
            msg = d.get("message") or {}
            content = d.get("content") if "content" in d else msg.get("content", [])
            mid = d.get("message_id") or msg.get("id")
            u = d.get("usage") if "usage" in d else msg.get("usage")
            ev.append(base | {"k": "asst", "msg": L.msg(mid), "model": d.get("model") or msg.get("model"),
                              "parent": L.tool(d.get("parent_tool_use_id")), "blocks": [block(b, L) for b in content],
                              "usage": usage_small(u)}); continue
        if ty in ("UserMessage", "user"):
            msg = d.get("message") or {}
            content = d.get("content") if "content" in d else msg.get("content", [])
            if isinstance(content, str):
                ev.append(base | {"k": "user", "text": cut(content)}); continue
            ev.append(base | {"k": "tool_results", "parent": L.tool(d.get("parent_tool_use_id")),
                              "blocks": [block(b, L) for b in content]}); continue
        if ty in ("ResultMessage", "result"):
            mu = d.get("model_usage") or d.get("modelUsage") or {}
            ev.append(base | {"k": "result", "subtype": d.get("subtype"), "num_turns": d.get("num_turns"),
                "duration_ms": d.get("duration_ms"), "total_cost_usd": d.get("total_cost_usd"),
                "session": L.sess(d.get("session_id")), "usage": usage_small(d.get("usage")),
                "model_usage": {m: {k: v.get(k) for k in ("inputTokens", "outputTokens", "cacheReadInputTokens",
                                "cacheCreationInputTokens", "costUSD", "thinkingTokens", "contextWindow")} for m, v in mu.items()},
                "permission_denials": [{"tool": p.get("tool_name"), "id": L.tool(p.get("tool_use_id"))} for p in d.get("permission_denials") or []],
                "structured_output": d.get("structured_output"), "result": cut(d.get("result"))}); continue
    return ev

def summarize_wire(label, path):
    """Wire log: argv plus one row per stdin/stdout line (direction, type, subtype, short body)."""
    rows, argv = [], None
    R = Labels("r")
    for line in open(path):
        d = json.loads(line)
        if d["dir"] == "argv":
            argv = json.loads(d["line"]); continue
        try: j = json.loads(d["line"])
        except Exception: continue
        ty = j.get("type"); row = {"t": d["t"], "dir": d["dir"], "type": ty}
        if ty == "control_request":
            r = j["request"]; row["sub"] = r.get("subtype"); row["rid"] = R(j.get("request_id"))
            if r.get("subtype") == "initialize":
                row["body"] = {"subtype": "initialize", "hooks": r.get("hooks")}
            elif r.get("subtype") == "mcp_message":
                m = r.get("message") or {}
                row["body"] = {"server_name": r.get("server_name"), "method": m.get("method"),
                               "params": deep({k: v for k, v in (m.get("params") or {}).items() if k != "_meta"}, cut)}
            elif r.get("subtype") == "hook_callback":
                i = r.get("input") or {}
                row["body"] = {"callback_id": r.get("callback_id"), "hook_event_name": i.get("hook_event_name"),
                               "tool_name": i.get("tool_name"), "tool_input": deep(i.get("tool_input"), cut)}
            elif r.get("subtype") == "can_use_tool":
                row["body"] = {"tool_name": r.get("tool_name"), "display_name": r.get("display_name"),
                               "input": deep(r.get("input"), cut)}
            else:
                row["body"] = {"subtype": r.get("subtype")}
        elif ty == "control_response":
            resp = j.get("response") or {}; row["sub"] = resp.get("subtype"); row["rid"] = R(resp.get("request_id"))
            body = resp.get("response") or {}
            if "commands" in body:           # the initialize answer: whitelist only
                row["body"] = {"current_permission_mode": body.get("current_permission_mode"),
                               "hooks_applied": body.get("hooks_applied"), "session_state": body.get("session_state"),
                               "agents": [a.get("name") if isinstance(a, dict) else a for a in body.get("agents") or []],
                               "commands": f"{len(body.get('commands') or [])} slash commands and skills (names not kept)",
                               "dropped": "account, models, pid, directories, feature flags"}
                row["init"] = True
            elif "mcp_response" in body:
                mr = body["mcp_response"]; res = mr.get("result") or {}
                if "tools" in res:
                    row["body"] = {"tools": [{"name": x.get("name"), "inputSchema": x.get("inputSchema")} for x in res["tools"]]}
                elif "content" in res:
                    row["body"] = {"content": cut("\n".join(c.get("text", "") for c in res["content"]), 600)}
                else:
                    row["body"] = {"result": deep(res, lambda v: cut(v, 300))}
            else:
                row["body"] = deep(body, lambda v: cut(v, 300))
        elif ty in ("assistant", "user"):
            c = (j.get("message") or {}).get("content")
            if isinstance(c, str): row["what"] = "prompt"
            else:
                kinds = [b.get("type") for b in c or []]
                row["what"] = ",".join(kinds)
                names = [b.get("name") for b in c or [] if b.get("type") == "tool_use"]
                if names: row["names"] = names
        elif ty == "system":
            row["sub"] = j.get("subtype")
            if row["sub"] in ("session_state_changed", "thinking_tokens", "status"): continue
        elif ty == "result":
            row["sub"] = j.get("subtype")
        elif ty == "rate_limit_event":
            continue
        rows.append(row)
    return argv, rows

def meta(label):
    p = os.path.join(RAW, label + ".meta.json")
    return json.load(open(p)) if os.path.exists(p) else None

def scan(obj):
    s = json.dumps(obj)
    bad = ["/Us" + "ers/", "Us" + "ers-", USER, "gl" + "pat", "sk-" + "ant"] + IDENT
    hits = [b for b in bad if b and re.search(re.escape(b), s, re.I)]
    if EMAIL.search(s.replace("user@example", "")): hits.append("email")
    if UUID.search(s): hits.append("uuid")
    return hits

LABELS = ["s1_wire", "s2_deny", "s3_bare", "s4_session", "s5_subagent", "s6_structured", "s8_ts", "s9_rewind"]
WIRE_FULL = {"s1_wire", "s3_bare"}
os.makedirs(OUT, exist_ok=True)
for label in LABELS:
    rec = {"label": label, "meta": meta(label)}
    rec["events"] = convert_events(label, os.path.join(RAW, label + ".sdk.jsonl"))
    wp = os.path.join(RAW, label + ".wire.jsonl")
    if os.path.exists(wp):
        argv, rows = summarize_wire(label, wp)
        rec["argv"] = argv
        if label in WIRE_FULL: rec["wire"] = rows
    rec = deep(rec, lambda v: scrub_text(v, label))
    rec = json.loads(UUID.sub("id", json.dumps(rec)))
    hits = scan(rec)
    if hits: sys.exit(f"refusing to write {label}: {hits}")
    json.dump(rec, open(os.path.join(OUT, label + ".json"), "w"), indent=0, ensure_ascii=False)
    print(label, len(rec["events"]), "events", len(rec.get("wire") or []), "wire rows")
c = json.load(open(os.path.join(RAW, "s7_connectors.counts.json")))
if scan(c): sys.exit("refusing s7")
json.dump(c, open(os.path.join(OUT, "s7_connectors.json"), "w"), indent=1)
s = json.load(open(os.path.join(RAW, "sessions_fs.json")))
s = {k: v for k, v in s.items()}
s = json.loads(UUID.sub("<session-id>", json.dumps(s)))
s = {k: [x | {"file": re.sub(r"agent-[0-9a-f]+", "agent-<id>", x["file"])} for x in v] if isinstance(v, list) else v for k, v in s.items()}
if scan(s): sys.exit("refusing sessions")
json.dump(s, open(os.path.join(OUT, "session_files.json"), "w"), indent=1)
print("em-dashes replaced:", emdash_count)
json.dump({"emdash_replaced": emdash_count}, open(os.path.join(OUT, "_redaction.json"), "w"))
