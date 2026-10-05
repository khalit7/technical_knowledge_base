"""Copy this tab's raw recordings (two claude -p runs, 6 Oct 2026) into src/read/recordings/, redacted.
Usage: python3 redact.py <raw dir> <task work dir>
Init record reduced to a whitelist; ids to short labels; signatures, session ids, uuids,
memory and socket paths dropped; rate-limit and thinking-estimate records dropped (the
per-message usage keeps real counts); machine paths replaced; em-dashes replaced by ", ".
Fails if any private string remains."""
import json, os, re, sys

RAW, WORK = sys.argv[1], sys.argv[2].rstrip("/")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings")
INIT_KEEP = ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version")
DROP = {"session_id", "uuid", "request_id", "memory_paths", "messaging_socket_path", "signature",
        "tool_use_result", "diagnostics"}
EM = chr(0x2014)
ACCOUNT = os.path.basename(os.path.expanduser("~"))
n_em = 0


def s_str(s):
    global n_em
    s = s.replace(WORK, "/work")
    s = re.sub(r"/private/tmp/[^\s\"'\\]*", "/tmp/redacted", s)
    s = re.sub(r"/Users/[^/\s\"']+", "/home/user", s)
    n_em += s.count(EM)
    return s.replace(EM, ", ")


def scrub(o, L):
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if k in DROP:
                continue
            if k in ("id", "tool_use_id", "parent_tool_use_id") and isinstance(v, str):
                r[k] = L.setdefault(v, ("msg" if v.startswith("msg_") else "tool") + str(len(L) + 1))
                continue
            r[k] = scrub(v, L)
        return r
    if isinstance(o, list):
        return [scrub(x, L) for x in o]
    return s_str(o) if isinstance(o, str) else o


os.makedirs(OUT, exist_ok=True)
for fn in sorted(os.listdir(RAW)):
    if not fn.endswith(".jsonl"):
        continue
    L, out = {}, []
    for line in open(os.path.join(RAW, fn)):
        if not line.strip():
            continue
        r = json.loads(line)
        t, st = r.get("type"), r.get("subtype")
        if t == "rate_limit_event" or (t == "system" and st == "thinking_tokens"):
            continue
        if t == "system" and st == "init":
            r = {k: r[k] for k in INIT_KEEP if k in r}
            r["cwd"] = "/work"
        out.append(json.dumps(scrub(r, L), ensure_ascii=False))
    open(os.path.join(OUT, fn), "w").write("\n".join(out) + "\n")
bad = []
for fn in os.listdir(OUT):
    txt = open(os.path.join(OUT, fn)).read()
    for p in ("/Users/", "Users-", ACCOUNT, "glpat", "sk-ant", EM, "\\u2014", "claude-502"):
        if p in txt:
            bad.append((fn, p))
json.dump({"emdash_replaced": n_em}, open(os.path.join(OUT, "redaction.json"), "w"))
print("em-dashes replaced:", n_em, "leaks:", bad or "none")
sys.exit(1 if bad else 0)
