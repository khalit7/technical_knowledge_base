"""Redact raw `claude -p --output-format stream-json --verbose --include-partial-messages` recordings
into repo copies.  Usage: python3 redact.py RAW_DIR RUNS_DIR OUT_DIR
RAW_DIR holds <label>.jsonl as recorded; RUNS_DIR/<label>/work was the task directory of that run.
Rules: the task-directory prefix becomes /work, any other path under the recording machine's scratch area
becomes /scratch; the init record keeps only a whitelist; memory and socket paths, session ids and uuids are
removed; message and tool ids become short stable labels; thinking signatures are dropped (the block stays,
empty, as it arrived); rate-limit events keep only their status; streamed content deltas are dropped (they
repeat the assistant records) while message_start and message_delta usage is kept; em-dashes become ", ".
The raw files never enter the repo.  A final scan fails if a home path, the user name or a token prefix remains."""
import json, os, re, sys, getpass

RAW, RUNS, OUT = sys.argv[1:4]
HOME = os.path.expanduser("~")
USER = getpass.getuser()
SCRATCH = os.path.dirname(os.path.dirname(os.path.abspath(RUNS)))  # .../scratchpad/agents
INIT_KEEP = ["type", "subtype", "model", "permissionMode", "tools", "claude_code_version", "cwd", "agents", "output_style", "mcp_servers"]
EM = chr(0x2014)  # the em-dash, written as a code point so this file contains none
FORBID = ["/Us" + "ers/", "Us" + "ers-", USER, "gl" + "pat", "sk-" + "ant", HOME]  # split so this file does not match its own scan

def scrub_str(s, work):
    s = s.replace(work, "/work")
    s = s.replace(os.path.realpath(work), "/work")
    s = s.replace(SCRATCH, "/scratch")
    s = s.replace(HOME, "/home/user")
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"\\]*", "/tmp/claude-task-output", s)  # background-task output files of the harness
    s = re.sub(r"\b%s\b" % re.escape(USER), "user", s)
    s = s.replace(" " + EM + " ", ", ").replace(EM, ", ")
    s = re.sub(r"\ba[0-9a-f]{16}\b", "a1", s)  # background agent ids
    s = re.sub(r"agentId: [0-9a-f]+", "agentId: a1", s)
    s = re.sub(r'"agentId": "[0-9a-f]+"', '"agentId": "a1"', s)
    return s

def scrub(o, work, ids):
    if isinstance(o, str):
        return scrub_str(o, work)
    if isinstance(o, list):
        return [scrub(x, work, ids) for x in o]
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if k in ("session_id", "uuid", "signature", "parent_uuid", "request_id"):
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
    ids, out, n_em = {}, [], 0
    for line in open(os.path.join(RAW, label + ".jsonl")):
        n_em += line.count(EM)
        o = json.loads(line)
        t = o.get("type")
        if t == "system" and o.get("subtype") == "init":
            o = {k: o[k] for k in INIT_KEEP if k in o}
            o["cwd"] = "/work"
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
        out.append(scrub(o, work, ids))
    text = "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in out)
    for f in FORBID:
        if f and f in text:
            raise SystemExit("FORBIDDEN string left in %s: %r" % (label, f[:6] + "..."))
    open(os.path.join(OUT, label + ".jsonl"), "w").write(text)
    # what the run left behind: the test runner's verdict afterwards and the diff against the original repo
    d = os.path.join(RUNS, label)
    meta = {}
    for k, f in (("post_tests", "post_tests.txt"), ("diff", "diff.txt"), ("meta", "meta.txt")):
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
        if f.endswith(".jsonl"):
            rep[f[:-6]] = redact(f[:-6])
    print(json.dumps({"redacted": len(rep), "em_dashes_replaced": rep}))
