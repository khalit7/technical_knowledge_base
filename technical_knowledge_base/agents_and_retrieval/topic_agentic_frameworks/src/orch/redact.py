"""Copy the orchestration lab's raw recordings into the repo, redacted.
Usage: python3 redact.py <raw recordings dir> <task work root>
The raw files stay in the scratchpad. Each JSONL record is reduced: the init record to a
whitelist, ids to short stable labels, thinking signatures dropped (the fact that thinking
happened and its token counts are kept), rate-limit events dropped (they describe the
subscription, not the run), machine paths replaced by /work or /scratch, the account
name in `ls -l` output replaced by `user`, em-dashes replaced by ", "."""
import json, os, re, sys, shutil

RAW, WORKROOT = sys.argv[1], sys.argv[2].rstrip("/")
SCRATCH = os.path.dirname(os.path.dirname(os.path.dirname(WORKROOT)))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings")
INIT_KEEP = ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version")
DROP = {"session_id", "uuid", "request_id", "memory_paths", "messaging_socket_path", "wire_tool_inputs",
        "wire_ingest_context", "tool_use_result", "tool_result_meta", "diagnostics", "signature"}
EMDASH = chr(0x2014)
ACCOUNT = os.path.basename(os.path.expanduser("~"))  # the recording machine's account name, never written into the repo
counts = {"emdash": 0}


class Labels:
    def __init__(self):
        self.m = {}

    def __call__(self, kind, v):
        k = (kind, v)
        if k not in self.m:
            self.m[k] = f"{kind}{sum(1 for x in self.m if x[0] == kind) + 1}"
        return self.m[k]


def scrub_str(s):
    s = re.sub(re.escape(WORKROOT) + r"/[A-Za-z0-9_\-]+", "/work", s)
    s = s.replace(SCRATCH, "/scratch")
    s = re.sub(r"/private/tmp/[^\s\"'\\]*", "/tmp/redacted", s)
    s = re.sub(r"/Users/[^/\s\"']+", "/home/user", s)
    s = re.sub(r"(?<=\s)" + re.escape(ACCOUNT) + r"(?=\s)", "user", s)
    n = s.count(EMDASH)
    if n:
        counts["emdash"] += n
        s = s.replace(EMDASH, ", ")
    return s


def scrub(o, L):
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if k in DROP:
                continue
            if k in ("id", "tool_use_id", "parent_tool_use_id") and isinstance(v, str):
                r[k] = L("msg" if v.startswith("msg_") else "tool", v)
                continue
            r[k] = scrub(v, L)
        return r
    if isinstance(o, list):
        return [scrub(x, L) for x in o]
    if isinstance(o, str):
        return scrub_str(o)
    return o


def redact_jsonl(src, dst):
    L = Labels()
    out = []
    for line in open(src):
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        t = r.get("type")
        if t == "rate_limit_event":
            continue
        if t == "system" and r.get("subtype") == "init":
            r = {k: r[k] for k in INIT_KEEP if k in r}
            r["cwd"] = "/work"
        elif t == "system" and r.get("subtype") == "thinking_tokens":
            continue  # running estimates; the per-message usage keeps the real counts
        out.append(json.dumps(scrub(r, L), ensure_ascii=False))
    with open(dst, "w") as f:
        f.write("\n".join(out) + "\n")


def main():
    os.makedirs(OUT, exist_ok=True)
    for x in os.listdir(OUT):  # baseline.json (written by code/ from the task repo, no model) is kept
        if os.path.isdir(os.path.join(OUT, x)):
            shutil.rmtree(os.path.join(OUT, x))
    for run in sorted(os.listdir(RAW)):
        d = os.path.join(RAW, run)
        if not os.path.isdir(d):
            continue
        os.makedirs(os.path.join(OUT, run))
        for fn in sorted(os.listdir(d)):
            s, t = os.path.join(d, fn), os.path.join(OUT, run, fn)
            if fn.endswith(".jsonl") and fn not in ("events.jsonl",):
                redact_jsonl(s, t)
            elif fn.endswith(".json") or fn == "events.jsonl":
                if fn.endswith(".json"):
                    txt = scrub_str(json.dumps(json.load(open(s)), ensure_ascii=False, indent=1))
                else:
                    txt = scrub_str(open(s).read())
                if fn == "events.jsonl":  # process ids are machine details
                    txt = re.sub(r'"pid": \d+', '"pid": 0', txt)
                    txt = re.sub(r'"pid": \d+', '"pid": 0', txt)
                open(t, "w").write(txt)
    bad = []
    for root, _, files in os.walk(OUT):
        for fn in files:
            txt = open(os.path.join(root, fn)).read()
            for pat in ("/Users/", "Users-", ACCOUNT, "glpat", "sk-ant", EMDASH, "\\" + "u2014", "claude-502"):
                if pat in txt:
                    bad.append((fn, pat))
    print("em-dashes replaced:", counts["emdash"])
    json.dump(dict(emdash_replaced=counts["emdash"]), open(os.path.join(OUT, "redaction.json"), "w"))
    print("leaks:", bad if bad else "none")
    sys.exit(1 if bad else 0)


main()
