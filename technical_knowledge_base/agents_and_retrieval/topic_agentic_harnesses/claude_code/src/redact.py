"""Redact raw `claude -p --output-format stream-json --verbose --include-partial-messages` recordings into repo copies.
Usage: python3 redact.py RAW_DIR RUNS_DIR OUT_DIR [label ...]
RAW_DIR holds <label>.jsonl (and <label>.times, arrival time of each line) as recorded; RUNS_DIR/<label>/work was the
task directory of that run. Adapted from the parent root's src/trace/redact.py, with these rules:
- the task directory becomes /work; its parent becomes /run; anything else under the recording machine's scratch area
  becomes /scratch; the home directory becomes /home/user; Claude Code's per-project state folder name (the task path
  with every non-alphanumeric character turned into '-') becomes -work;
- the init record keeps a whitelist (model, permissionMode, tools, version, cwd, agents); session ids, uuids, request ids
  and thinking signatures are removed; message and tool ids become short labels (m1, t1, ...); UUID-shaped strings
  inside text become "session";
- rate-limit events keep only their status; streamed content deltas are dropped (they repeat the assistant records)
  while message_start and message_delta usage is kept; status and thinking-progress system records are dropped;
- each kept record gets "_t", its arrival time in seconds since the run started;
- em-dashes become ", ".
The raw files never enter the repo. A final scan fails if a home path, the user name or a token prefix remains."""
import json, os, re, sys, getpass

RAW, RUNS, OUT = sys.argv[1:4]
ONLY = sys.argv[4:]
HOME = os.path.expanduser("~")
USER = getpass.getuser()
SCRATCH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(RUNS))))  # .../scratchpad
INIT_KEEP = ["type", "subtype", "model", "permissionMode", "tools", "claude_code_version", "cwd", "agents", "output_style"]
EM = chr(0x2014)
FORBID = ["/Us" + "ers/", "Us" + "ers-", USER, "gl" + "pat", "sk-" + "ant", HOME]
UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b")

def enc(p):
    return re.sub(r"[^A-Za-z0-9]", "-", p)

def scrub_str(s, work):
    real = os.path.realpath(work)
    for w in (real, work):
        s = s.replace(enc(w), "-work")
        s = s.replace(w, "/work")
        s = s.replace(os.path.dirname(w), "/run")
    s = s.replace(os.path.realpath(SCRATCH), "/scratch").replace(SCRATCH, "/scratch")
    s = s.replace(HOME, "/home/user")
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"\\]*", "/tmp/(redacted path)", s)
    s = re.sub(r"\b%s\b" % re.escape(USER), "user", s)
    s = UUID.sub("session", s)
    s = s.replace(" " + EM + " ", ", ").replace(EM, ", ")
    s = re.sub(r"\ba[0-9a-f]{16}\b", "a1", s)
    return s

def scrub(o, work, ids):
    if isinstance(o, str):
        return scrub_str(o, work)
    if isinstance(o, list):
        return [scrub(x, work, ids) for x in o]
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if k in ("session_id", "uuid", "signature", "parent_uuid", "request_id", "transcript_path", "memory_paths"):
                continue
            if k in ("id", "tool_use_id", "parent_tool_use_id") and isinstance(v, str) and re.match(r"^(msg_|toolu_|srvtoolu_)", v):
                pre = "m" if v.startswith("msg_") else "t"
                ids.setdefault(v, pre + str(sum(1 for x in ids.values() if x[0] == pre) + 1))
                r[k] = ids[v]; continue
            r[k] = scrub(v, work, ids)
        return r
    return o

def redact(label):
    work = os.path.join(RUNS, label, "work")
    if not os.path.isdir(work):  # runs that reused another run's directory
        work = os.path.join(RUNS, label.replace("2", "1"), "work")
    ids, out, n_em = {}, [], 0
    tp = os.path.join(RAW, label + ".times")
    times = [float(x) for x in open(tp)] if os.path.exists(tp) else None
    for i, line in enumerate(open(os.path.join(RAW, label + ".jsonl"))):
        n_em += line.count(EM)
        o = json.loads(line)
        t = o.get("type")
        if t == "system" and o.get("subtype") == "init":
            o = {k: o[k] for k in INIT_KEEP if k in o}
            o["cwd"] = "/work"
        elif t == "system" and o.get("subtype") in ("status", "thinking_tokens"):
            continue
        elif t == "rate_limit_event":
            o = {"type": t, "status": o.get("rate_limit_info", {}).get("status")}
        elif t == "stream_event":
            e = o.get("event", {})
            if e.get("type") == "message_start":
                o = {"type": "stream_event", "event": {"type": "message_start", "message": {"id": e["message"]["id"], "model": e["message"].get("model"), "usage": e["message"].get("usage")}}, "parent_tool_use_id": o.get("parent_tool_use_id")}
            elif e.get("type") == "message_delta":
                o = {"type": "stream_event", "event": e, "parent_tool_use_id": o.get("parent_tool_use_id")}
            else:
                continue
        o = scrub(o, work, ids)
        if times:
            o["_t"] = round(times[i], 2)
        out.append(o)
    text = "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in out)
    for f in FORBID:
        if f and f in text:
            raise SystemExit("FORBIDDEN string left in %s: %r" % (label, f[:6] + "..."))
    open(os.path.join(OUT, label + ".jsonl"), "w").write(text)
    d = os.path.join(RUNS, label)
    meta = {}
    for k, f in (("post_tests", "post_tests.txt"), ("diff", "diff.txt"), ("meta", "meta.txt"), ("hook_log", "work/.claude/hook_log.jsonl")):
        fp = os.path.join(d, f)
        meta[k] = scrub_str(open(fp).read(), work) if os.path.exists(fp) else None
    mt = json.dumps(meta, ensure_ascii=False, indent=1)
    for f in FORBID:
        if f and f in mt:
            raise SystemExit("FORBIDDEN string left in %s meta" % label)
    open(os.path.join(OUT, label + ".meta.json"), "w").write(mt)
    return n_em

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    rep = {}
    for f in sorted(os.listdir(RAW)):
        if f.endswith(".jsonl") and (not ONLY or f[:-6] in ONLY):
            rep[f[:-6]] = redact(f[:-6])
    print(json.dumps({"redacted": len(rep), "em_dashes_replaced": {k: v for k, v in rep.items() if v}}))
