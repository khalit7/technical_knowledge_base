"""Copy this page's raw results from the scratchpad into src/, scrubbed.
Usage: python3 redact.py <scratchpad>/agents
Reads  <agents>/flg/out/e1..e7 json files and <agents>/recordings/flg/e6/*.jsonl (raw, kept in the scratchpad).
Writes src/data/*.json and src/recordings/e6/*.jsonl, and fails if any private string survives.
Recordings: init record reduced to a whitelist, ids replaced by short labels, signatures, rate-limit events,
uuids and session ids dropped, every path to the work folder replaced by /work, em-dashes replaced by ", "."""
import json, os, re, sys, glob, getpass

HERE = os.path.dirname(os.path.abspath(__file__))
AG = sys.argv[1].rstrip("/")
LOGIN = getpass.getuser()
EMD = "\u2014"
stats = dict(emdash=0, paths=0)

PATH_RES = [
    (re.compile(r"/private/tmp/claude-\d+/[^\s\"'\\]*?/flg/work/(?:A|B|e7)"), "/work"),
    (re.compile(r"/private/tmp/claude-\d+/[^\s\"'\\]*"), "/scratch"),
    (re.compile(r"/tmp/claude-\d+/[^\s\"'\\]*"), "/scratch"),
    (re.compile(r"/Users/[^/\s\"']+"), "/home/user"),
    (re.compile(r"/tmp/cc-socks/\S+"), "/socket"),
]
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def scrub_s(s):
    for rx, rep in PATH_RES:
        s, n = rx.subn(rep, s); stats["paths"] += n
    s = EMAIL.sub("user@example.com", s)
    s = re.sub(re.escape(LOGIN), "user", s, flags=re.I)
    if EMD in s:
        stats["emdash"] += s.count(EMD); s = s.replace(EMD, ", ")
    return s


def scrub(o):
    if isinstance(o, str):
        return scrub_s(o)
    if isinstance(o, list):
        return [scrub(x) for x in o]
    if isinstance(o, dict):
        return {scrub_s(k): scrub(v) for k, v in o.items()}
    return o


INIT_KEEP = ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version")
RESULT_KEEP = ("type", "subtype", "is_error", "num_turns", "duration_ms", "duration_api_ms", "stop_reason", "result", "total_cost_usd", "usage", "modelUsage")


def redact_recording(src, dst, labels):
    out = []
    for line in open(src):
        if not line.strip():
            continue
        r = json.loads(line)
        t = r.get("type")
        if t == "rate_limit_event":
            continue
        if t == "system" and r.get("subtype") == "init":
            r = {k: r[k] for k in INIT_KEEP if k in r}; r["cwd"] = "/work"
        elif t == "system":
            r = {k: v for k, v in r.items() if k not in ("session_id", "uuid")}
        elif t == "result":
            r = {k: r[k] for k in RESULT_KEEP if k in r}
            for m in (r.get("modelUsage") or {}).values():
                m.pop("provider", None)
        else:
            r = {k: v for k, v in r.items() if k not in ("session_id", "uuid", "request_id", "parent_tool_use_id")}
            msg = r.get("message") or {}
            if "id" in msg:
                msg["id"] = labels.setdefault(msg["id"], f"msg_{len(labels)+1}")
            for c in msg.get("content") or []:
                if isinstance(c, dict):
                    c.pop("signature", None)
        out.append(json.dumps(scrub(r)))
    open(dst, "w").write("\n".join(out) + "\n")


def main():
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    rec_dst = os.path.join(HERE, "recordings", "e6"); os.makedirs(rec_dst, exist_ok=True)
    for f in ("e1_supersteps", "e1b_checks", "e2_crash", "e3_storage", "e4_interrupts", "e5_more", "e7_agent", "e7_agent_check_path"):
        p = os.path.join(AG, "flg", "out", f + ".json")
        if os.path.exists(p):
            json.dump(scrub(json.load(open(p))), open(os.path.join(HERE, "data", f + ".json"), "w"), indent=1)
    labels = {}
    for src in sorted(glob.glob(os.path.join(AG, "recordings", "flg", "e6", "*.jsonl"))):
        name = os.path.basename(src)
        if name.endswith("_events.jsonl"):
            pids, rows = {}, []
            t0 = None
            for l in open(src):
                e = json.loads(l)
                t0 = t0 if t0 is not None else e["t"]
                e["t"] = round(e["t"] - t0, 3)
                pid = e.pop("pid"); e["process"] = pids.setdefault(pid, len(pids) + 1)
                rows.append(json.dumps(scrub(e)))
            open(os.path.join(rec_dst, name), "w").write("\n".join(rows) + "\n")
        else:
            redact_recording(src, os.path.join(rec_dst, name), labels)
    # leak check over everything written
    bad = re.compile(r"/Users/|Users-|glpat|sk-ant|" + re.escape(LOGIN), re.I)
    leaks = []
    for root, _, files in os.walk(os.path.join(HERE)):
        if "/parts" in root:
            continue
        for fn in files:
            if fn.endswith((".json", ".jsonl")):
                txt = open(os.path.join(root, fn)).read()
                if bad.search(txt) or EMAIL.search(txt.replace("user@example.com", "")):
                    leaks.append(fn)
    print("em-dashes replaced:", stats["emdash"], "paths replaced:", stats["paths"])
    if leaks:
        raise SystemExit("LEAK in " + ", ".join(leaks))
    print("no private strings found")


if __name__ == "__main__":
    main()
