"""Copy this page's raw recordings into the repo, redacted and slimmed.
usage: python3 redact.py <fmulti dir> <repo src/recordings dir>

Each JSONL record is reduced: the init record to a whitelist; ids to short stable labels; thinking
signatures dropped (the fact that thinking happened and its token counts are kept); rate-limit events
dropped; machine paths replaced by /work; git identity and e-mail addresses removed; em-dashes replaced
by ", ". Slimming: file contents that the model read (tool results of Read) and module text pasted into
fan-out prompts are replaced by a placeholder with their size, because the corpus is regenerated
exactly by code/gen_audit.py (seed fixed); everything the model WROTE is kept in full.
"""
import gzip, json, os, re, shutil, subprocess, sys

FM, OUT = sys.argv[1].rstrip("/"), sys.argv[2]
SCRATCH = os.path.dirname(os.path.dirname(FM))
EMDASH = chr(0x2014)
ACCOUNT = os.path.basename(os.path.expanduser("~"))
INIT_KEEP = ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version", "agents")
DROP = {"session_id", "uuid", "request_id", "memory_paths", "messaging_socket_path", "wire_tool_inputs",
        "wire_ingest_context", "tool_result_meta", "diagnostics", "signature", "slash_commands", "skills",
        "plugins", "mcp_servers", "output_style", "apiKeySource", "fast_mode_state"}


def git_identity():
    out = []
    for k in ("user.name", "user.email"):
        try:
            v = subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
            if v:
                out.append(v)
        except Exception:
            pass
    return out


GIT = git_identity()
counts = {"emdash": 0, "slimmed_chars": 0}


class Labels:
    def __init__(self):
        self.m = {}

    def __call__(self, kind, v):
        k = (kind, v)
        if k not in self.m:
            self.m[k] = f"{kind}{sum(1 for x in self.m if x[0] == kind) + 1}"
        return self.m[k]


def scrub_str(s):
    s = re.sub(re.escape(FM) + r"/work/[A-Za-z0-9_\-]+(/[A-Za-z])?(?=[/\s\"'\\]|$)", "/work", s)
    s = s.replace(FM, "/scratch").replace(SCRATCH, "/scratch")
    s = re.sub(r"/private/tmp/[^\s\"'\\]*", "/tmp/redacted", s)
    s = re.sub(r"/Us" r"ers/[^/\s\"']+", "/home/user", s)
    for g in GIT:
        s = re.sub(re.escape(g), "redacted", s, flags=re.I)
    s = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "redacted@example.com", s)
    s = re.sub(r"(?<![A-Za-z0-9])" + re.escape(ACCOUNT) + r"(?![A-Za-z0-9])", "user", s, flags=re.I)
    n = s.count(EMDASH)
    if n:
        counts["emdash"] += n
        s = s.replace(EMDASH, ", ")
    return s


def slim_text(s):
    """Module text pasted into a fan-out prompt: keep the headers, drop the bodies."""
    if "===== fleetops/" not in s:
        return s
    parts = re.split(r"(===== fleetops/[a-z_]+\.py =====\n)", s)
    out = [parts[0]]
    for i in range(1, len(parts), 2):
        body = parts[i + 1] if i + 1 < len(parts) else ""
        counts["slimmed_chars"] += len(body)
        out.append(parts[i] + f"[module text omitted in the repo copy: {len(body)} chars, {body.count(chr(10))} lines; "
                              f"regenerate with code/gen_audit.py]\n\n")
    return "".join(out)


def scrub(o, L, read_ids):
    if isinstance(o, dict):
        r = {}
        if o.get("type") == "tool_result" and o.get("tool_use_id") in read_ids:
            c = o.get("content")
            txt = c if isinstance(c, str) else json.dumps(c)
            counts["slimmed_chars"] += len(txt)
            o = dict(o)
            o["content"] = f"[file content omitted in the repo copy: {len(txt)} chars, {txt.count(chr(10))} lines]"
        for k, v in o.items():
            if k in DROP:
                continue
            if k == "tool_use_result":
                continue
            if k in ("id", "tool_use_id", "parent_tool_use_id") and isinstance(v, str):
                r[k] = L("msg" if v.startswith("msg_") else "tool", v)
                continue
            r[k] = scrub(v, L, read_ids)
        return r
    if isinstance(o, list):
        return [scrub(x, L, read_ids) for x in o]
    if isinstance(o, str):
        return scrub_str(slim_text(o))
    return o


def redact_jsonl(src, dst):
    L = Labels()
    recs = [json.loads(l) for l in open(src) if l.strip()]
    read_ids = set()
    for r in recs:
        if r.get("type") == "assistant":
            for c in (r.get("message") or {}).get("content") or []:
                if c.get("type") == "tool_use" and c.get("name") == "Read":
                    read_ids.add(c.get("id"))
    out = []
    for r in recs:
        t = r.get("type")
        if t == "rate_limit_event":
            continue
        if t == "system" and r.get("subtype") == "init":
            r = {k: r[k] for k in INIT_KEEP if k in r}
            r["cwd"] = "/work"
        elif t == "system" and r.get("subtype") == "thinking_tokens":
            continue
        out.append(json.dumps(scrub(r, L, read_ids), ensure_ascii=False))
    with gzip.open(dst + ".gz", "wt", compresslevel=9) as f:  # gzip keeps the repository small; read with gzip.open
        f.write("\n".join(out) + "\n")


def main():
    raw = os.path.join(FM, "raw")
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    for run in sorted(os.listdir(raw)):
        d = os.path.join(raw, run)
        if not os.path.isdir(d) or run.startswith("calib") or (run.startswith(("audit_", "write_", "wopen_")) and not os.path.exists(os.path.join(d, "summary.json"))):
            continue
        os.makedirs(os.path.join(OUT, run))
        for fn in sorted(os.listdir(d)):
            s, t = os.path.join(d, fn), os.path.join(OUT, run, fn)
            if fn.endswith(".jsonl"):
                redact_jsonl(s, t)
            elif fn.endswith(".json"):
                open(t, "w").write(scrub_str(slim_text(json.dumps(json.load(open(s)), ensure_ascii=False, indent=1))))
    bad = []
    pats = ["/Us" + "ers/", "Us" + "ers-", ACCOUNT, "glp" + "at", "sk" + "-ant", EMDASH, "\\u2014", "claude-" + "502"] + GIT
    for root, _, files in os.walk(OUT):
        for fn in files:
            pth = os.path.join(root, fn)
            txt = gzip.open(pth, "rt").read() if fn.endswith(".gz") else open(pth).read()
            for p in pats:
                if p and p.lower() in txt.lower():
                    bad.append((fn, p if p not in GIT else "git identity"))
            if re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", txt.replace("redacted@example.com", "")):
                bad.append((fn, "email"))
    json.dump(dict(emdash_replaced=counts["emdash"], slimmed_chars=counts["slimmed_chars"]),
              open(os.path.join(OUT, "redaction.json"), "w"))
    print("em-dashes replaced:", counts["emdash"], "slimmed chars:", counts["slimmed_chars"])
    print("leaks:", bad[:20] if bad else "none")
    sys.exit(1 if bad else 0)


main()
