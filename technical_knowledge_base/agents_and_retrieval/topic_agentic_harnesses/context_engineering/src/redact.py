"""Redact raw Claude Code stream-json recordings into the repo copies in src/recordings/.
Usage: python3 redact.py HCTX_DIR LABEL [LABEL ...]
HCTX_DIR is the scratch folder of these runs: raw/<label>.jsonl is the recording, w_<label> was its task
directory (cache_* runs share w_cache, ctx_* runs use w_<label without ctx_>).
Rules (the same as the Trace and context lab's redact.py, plus compaction metadata):
- the task directory becomes /work, other scratch paths /scratch, the harness's task-output files /tmp/claude-task-output;
- the init record keeps a whitelist (model, permissionMode, tools, claude_code_version, cwd); its agents, skills and
  slash-command lists, memory and socket paths are dropped;
- session ids, every *uuid* key (including compact_boundary's preserved-segment uuids), signatures and request ids are
  removed; message and tool ids become short labels (m1, t1, ...);
- rate-limit events keep only their status; thinking_tokens progress events are dropped;
- tool results over 4,000 characters (the generated log and code filler) keep their first 1,500 characters in the repo
  copy, with hctx_full_chars giving the length the model received;
- em-dashes become ", " (counted and reported);
- the recording machine's git identity (a model once copied it into a `git config` command) and any e-mail address become placeholders.
A final scan fails if a home path, the user name or a token prefix remains."""
import json, os, re, sys, getpass, subprocess

HCTX, LABELS = sys.argv[1], sys.argv[2:]
HOME = os.path.expanduser("~")
USER = getpass.getuser()
SCRATCH = os.path.dirname(os.path.abspath(HCTX))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings")
INIT_KEEP = ["type", "subtype", "model", "permissionMode", "tools", "claude_code_version", "cwd"]
EM = chr(0x2014)
CUT = 4000  # tool results longer than this (generated log and code filler) are cut in the repo copy
CUT_NOTE = "\n[... %d more characters of generated filler cut from this repo copy; the model received all of it ...]"
def _git(k):
    try:
        return subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""
GIT_NAME, GIT_EMAIL = _git("user.name"), _git("user.email")  # read at run time, never written here
FORBID = ["/Us" + "ers/", "Us" + "ers-", USER, "gl" + "pat", "sk-" + "ant", HOME] + [x for x in (GIT_NAME, GIT_EMAIL) if x]

def workdir(label):
    if label.startswith("cache_"):
        return os.path.join(HCTX, "w_cache")
    if label.startswith("ctx_"):
        return os.path.join(HCTX, "w_" + label[4:])
    if label == "ctx0":
        return os.path.join(HCTX, "w_ctx0")
    return os.path.join(HCTX, "w_" + label)

def scrub_str(s, work):
    for w in (work, os.path.realpath(work)):
        s = s.replace(w, "/work")
    s = s.replace(SCRATCH, "/scratch").replace(os.path.realpath(SCRATCH), "/scratch")
    s = s.replace(HOME, "/home/user")
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"\\]*", "/tmp/claude-task-output", s)
    s = re.sub(r"/tmp/claude-\d+/[^\s\"\\]*", "/tmp/claude-task-output", s)
    if GIT_EMAIL:
        s = s.replace(GIT_EMAIL, "user@example.com")
    if GIT_NAME:
        s = s.replace(GIT_NAME, "A User")
    s = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}", lambda m: m.group(0) if m.group(0).endswith("anthropic.com") or m.group(0) == "user@example.com" else "user@example.com", s)
    s = re.sub(r"(?i)\b%s\w*( [A-Z][a-z]+)?" % re.escape(USER), "A User", s)
    s = s.replace(" " + EM + " ", ", ").replace(EM, ", ")
    s = re.sub(r"\ba[0-9a-f]{16}\b", "a1", s)
    s = re.sub(r"agentId: [0-9a-f]+", "agentId: a1", s)
    return s

def scrub(o, work, ids):
    if isinstance(o, str):
        return scrub_str(o, work)
    if isinstance(o, list):
        return [scrub(x, work, ids) for x in o]
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if k in ("session_id", "signature", "request_id") or "uuid" in k.lower():
                continue
            if k in ("id", "tool_use_id", "parent_tool_use_id") and isinstance(v, str) and re.match(r"^(msg_|toolu_|srvtoolu_)", v):
                pre = "m" if v.startswith("msg_") else "t"
                ids.setdefault(v, pre + str(sum(1 for x in ids.values() if x[0] == pre) + 1))
                r[k] = ids[v]; continue
            r[k] = scrub(v, work, ids)
        return r
    return o

def cut_long(v):
    """tool_use_result repeats the tool output in structured form: cut its long strings the same way."""
    if isinstance(v, str) and len(v) > CUT:
        return v[:1500] + CUT_NOTE % (len(v) - 1500)
    if isinstance(v, list):
        return [cut_long(x) for x in v]
    if isinstance(v, dict):
        return {k: cut_long(x) for k, x in v.items()}
    return v

def redact(label):
    work = workdir(label)
    ids, out, n_em = {}, [], 0
    for line in open(os.path.join(HCTX, "raw", label + ".jsonl")):
        n_em += line.count(EM)
        o = json.loads(line)
        t, st = o.get("type"), o.get("subtype")
        if t == "system" and st == "thinking_tokens":
            continue
        if t == "system" and st == "init":
            o = {k: o[k] for k in INIT_KEEP if k in o}
            o["cwd"] = "/work"
            if "agents" in o:
                o["agents"] = [a for a in o["agents"] if isinstance(a, str)]
        elif t == "rate_limit_event":
            o = {"type": t, "status": (o.get("rate_limit_info") or {}).get("status")}
        o = scrub(o, work, ids)
        if o.get("type") == "user" and isinstance((o.get("message") or {}).get("content"), list):
            for c in o["message"]["content"]:
                if c.get("type") == "tool_result":
                    cc = c.get("content")
                    if isinstance(cc, str) and len(cc) > CUT:
                        c["content"] = cc[:1500] + CUT_NOTE % (len(cc) - 1500)
                        c["hctx_full_chars"] = len(cc)
                    elif isinstance(cc, list):
                        for x in cc:
                            if x.get("type") == "text" and len(x.get("text", "")) > CUT:
                                n = len(x["text"]); x["text"] = x["text"][:1500] + CUT_NOTE % (n - 1500); x["hctx_full_chars"] = n
        if "tool_use_result" in o:
            o["tool_use_result"] = cut_long(o["tool_use_result"])
        out.append(json.dumps(o, ensure_ascii=False))
    text = "\n".join(out) + "\n"
    for f in FORBID:
        if f and f.lower() in text.lower():
            raise SystemExit(f"{label}: forbidden string remains")
    if EM in text:
        raise SystemExit(f"{label}: em-dash remains")
    open(os.path.join(OUT, label + ".jsonl"), "w").write(text)
    return n_em

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for lab in LABELS:
        print(lab, "em-dashes replaced:", redact(lab))
