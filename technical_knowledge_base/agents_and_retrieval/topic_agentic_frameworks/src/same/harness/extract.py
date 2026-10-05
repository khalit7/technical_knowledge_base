"""Build the redacted, compacted recordings for the page from the raw runs.
Raw files stay in the scratchpad; this writes <SRC>/same/data/runs.json and copies the agent code.
Usage: python3 extract.py <page src dir>"""
import getpass, json, os, re, shutil, sys

HERE = os.environ.get("AFSAME_DIR", os.path.dirname(os.path.abspath(__file__)))  # where runs/ and code/ live
SRC = sys.argv[1]
OUT = os.path.join(SRC, "same")
os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
os.makedirs(os.path.join(OUT, "code"), exist_ok=True)
SCRATCH = os.path.dirname(os.path.dirname(HERE))  # .../scratchpad
HOME = os.path.expanduser("~")
EMDASH = "—"
emdash_count = [0]


def red(s, label=None):
    if not isinstance(s, str):
        return s
    if label:
        s = s.replace(os.path.join(HERE, "runs", label, "repo"), "/work")
    s = s.replace(os.path.join(HERE, "fwenv"), "/venv").replace(HERE, "/afsame").replace(SCRATCH, "/scratch").replace(HOME, "~")
    s = re.sub(r"/private/tmp/claude-\d+/[^\s\"']*", "/scratch/...", s)
    s = re.sub(r"\b" + re.escape(getpass.getuser()) + r"\b", "user", s)
    if EMDASH in s:
        emdash_count[0] += s.count(EMDASH)
        s = s.replace(EMDASH, ", ")
    return s


def deep(o, label):
    if isinstance(o, dict):
        return {k: deep(v, label) for k, v in o.items()}
    if isinstance(o, list):
        return [deep(v, label) for v in o]
    return red(o, label)


def cut(s, n=2500):
    if isinstance(s, str) and len(s) > n:
        return s[:n] + f"\n[... {len(s) - n} more characters cut for the page; full text in the raw recording]"
    return s


def text_of(content):
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict))
    return content or ""


def local_run(label):
    d = os.path.join(HERE, "runs", label)
    meta = json.load(open(os.path.join(d, "meta.json")))
    reqs = [json.loads(l) for l in open(os.path.join(d, "requests.jsonl"))]
    calls = []
    for r in reqs:
        u = (r["response"] or {}).get("usage", {}) if isinstance(r["response"], dict) else {}
        calls.append({"s": round(r["t1"] - r["t0"], 2), "in": u.get("prompt_tokens"), "out": u.get("completion_tokens"),
                      "n": len(r["request"].get("messages", []))})
    last = reqs[-1]
    msgs = list(last["request"]["messages"])
    ch = (last["response"] or {}).get("choices") if isinstance(last["response"], dict) else None
    if ch:
        msgs.append(ch[0]["message"])
    tr = []
    for m in msgs:
        e = {"role": m["role"], "text": cut(text_of(m.get("content")))}
        if m["role"] == "system":
            e["text"] = "[system prompt: shown in full under What was sent]"
        if m.get("tool_calls"):
            e["calls"] = [{"name": t["function"]["name"], "args": cut(t["function"]["arguments"], 1500)} for t in m["tool_calls"]]
        tr.append(e)
    first = reqs[0]["request"]
    fr = {"params": {k: v for k, v in first.items() if k not in ("messages", "tools")},
          "messages": [{"role": m["role"], "text": text_of(m.get("content"))} for m in first["messages"]],
          "tools": first.get("tools", []), "prompt_tokens": calls[0]["in"],
          "bytes": len(json.dumps(first))}
    diff = open(os.path.join(d, "diff.txt")).read()
    out = {"label": label, "meta": meta, "calls": calls, "transcript": tr, "first": fr, "diff": diff,
           "stdout": cut(open(os.path.join(d, "stdout.txt")).read(), 800),
           "error": cut(open(os.path.join(d, "stderr.txt")).read().strip().splitlines()[-1] if open(os.path.join(d, "stderr.txt")).read().strip() else "", 400)}
    return deep(out, label)


INIT_KEEP = ("model", "permissionMode", "tools", "claude_code_version")


def claude_run(label):
    d = os.path.join(HERE, "runs", label)
    meta = json.load(open(os.path.join(d, "meta.json")))
    tr, calls, init, result = [], [], {}, {}
    ids = {}
    def lab(i):
        return ids.setdefault(i, f"call_{len(ids) + 1}")
    for l in open(os.path.join(d, "sdk.jsonl")):
        m = json.loads(l); t = m["_type"]
        if t == "SystemMessage" and m.get("subtype") == "init":
            init = {k: m["data"].get(k) for k in INIT_KEEP}
            init["cwd"] = "/work"
        elif t == "AssistantMessage":
            u = m.get("usage") or {}
            for b in m["content"]:
                if "thinking" in b:
                    tr.append({"role": "assistant", "thinking": True})
                elif "name" in b:
                    tr.append({"role": "assistant", "calls": [{"name": b["name"].replace("mcp__repo__", ""), "id": lab(b["id"]),
                               "args": cut(json.dumps(b["input"]), 1500)}]})
                elif "text" in b:
                    tr.append({"role": "assistant", "text": cut(b["text"])})
            calls.append({"in": u.get("input_tokens"), "cw": u.get("cache_creation_input_tokens"),
                          "cr": u.get("cache_read_input_tokens"), "out": u.get("output_tokens")})
        elif t == "UserMessage" and isinstance(m.get("content"), list):
            for b in m["content"]:
                if "tool_use_id" in b:
                    tr.append({"role": "tool", "id": lab(b["tool_use_id"]), "text": cut(text_of(b.get("content")) if isinstance(b.get("content"), list) else str(b.get("content")))})
        elif t == "ResultMessage":
            u = m["usage"]
            result = {"num_turns": m["num_turns"], "duration_ms": m["duration_ms"], "total_cost_usd": round(m["total_cost_usd"], 4),
                      "input_tokens": u["input_tokens"], "cache_creation_input_tokens": u["cache_creation_input_tokens"],
                      "cache_read_input_tokens": u["cache_read_input_tokens"], "output_tokens": u["output_tokens"],
                      "thinking_tokens": (u.get("output_tokens_details") or {}).get("thinking_tokens"),
                      "stop_reason": m.get("stop_reason"), "subtype": m.get("subtype")}
    # Streaming splits one API response into several AssistantMessages with the same usage; keep distinct ones.
    dedup = []
    for c in calls:
        if not dedup or c != dedup[-1]:
            dedup.append(c)
    out = {"label": label, "meta": meta, "init": init, "calls": dedup, "transcript": tr, "result": result,
           "diff": open(os.path.join(d, "diff.txt")).read()}
    return deep(out, label)


labels = sorted(os.listdir(os.path.join(HERE, "runs")))
data = {"local": {}, "claude": {}}
for l in labels:
    if l.startswith("x_") or not os.path.exists(os.path.join(HERE, "runs", l, "meta.json")):
        continue  # discarded: leaked the account's connectors (see notes)
    if l.startswith("a6"):
        data["claude"][l] = claude_run(l)
    else:
        data["local"][l] = local_run(l)
data["emdash_replaced"] = emdash_count[0]
json.dump(data, open(os.path.join(OUT, "data", "runs.json"), "w"), indent=0)
for f in os.listdir(os.path.join(HERE, "code")):
    if f.endswith(".py"):
        shutil.copy(os.path.join(HERE, "code", f), os.path.join(OUT, "code", f))
s = open(os.path.join(OUT, "data", "runs.json")).read()
import getpass as _gp
sys.path.insert(0, os.path.join(SRC, "..", "..", "topic_protocols", "src"))
try:
    from private_patterns import PATTERNS  # git-ignored machine-specific patterns, if present
except Exception:
    PATTERNS = []
bad = [p for p in ["/Users/", "Users-", _gp.getuser(), "glpat", "sk-ant"] if p in s] + [p for p in PATTERNS if re.search(p, s)]
print("runs:", len(data["local"]), "local,", len(data["claude"]), "claude; bytes", len(s), "; emdash replaced", emdash_count[0], "; forbidden:", bad)
