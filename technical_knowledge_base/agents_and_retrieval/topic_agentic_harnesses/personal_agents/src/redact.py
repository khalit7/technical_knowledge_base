#!/usr/bin/env python3
"""Redact the resident-agent recordings into src/recordings/.

Usage: python3 redact.py RAW_DIR
RAW_DIR holds the raw runs (kept outside the repository): <label>.jsonl (the demo's own log) and
<label>.jsonl.raw (the claude -p stream-json records, or the local server's responses).
Each repo copy keeps the demo log, plus one "call" record per model call reduced to a whitelist
(model, claude_code_version, permission mode, tools passed, usage, cost). Paths become /work;
e-mail addresses, the machine's git identity and the user's login are scrubbed case-insensitively;
em-dashes become ", ". The script ends with a privacy grep and fails if anything is left."""
import glob, json, os, re, subprocess, sys

RAW = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "recordings")
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_protocols", "src"))
try:
    import private_patterns
    EXTRA = private_patterns.alternation()
except Exception:
    EXTRA = r"(?!x)x"


def git_identity():
    vals = []
    for k in ("user.name", "user.email"):
        try:
            v = subprocess.run(["git", "config", "--get", k], capture_output=True, text=True).stdout.strip()
        except Exception:
            v = ""
        if v:
            vals.append(v)
    return vals


SECRETS = [s for s in git_identity() + [os.environ.get("USER", ""), os.path.expanduser("~")] if len(s) > 2]
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
SCRATCH = re.compile(r"/(private/)?(tmp|var)/[^\s\"']*?/agents/hpers(/[^\s\"']*)?")


def scrub(s):
    s = SCRATCH.sub(lambda m: "/work" + (m.group(3) or ""), s)
    s = re.sub(r"/Users/[^\s\"'/]+", "/work", s)
    s = EMAIL.sub("[email removed]", s)
    for v in SECRETS:
        s = re.sub(re.escape(v), "[redacted]", s, flags=re.I)
    s = re.sub(EXTRA, "[redacted]", s, flags=re.I)
    return s.replace("\u2014", ", ")


def calls_from_raw(path):
    calls = []
    if not os.path.exists(path):
        return calls
    for line in open(path):
        if not line.strip():
            continue
        r = json.loads(line)
        if r.get("type") == "system" and r.get("subtype") == "init":
            calls.append({"model_alias": r.get("model"), "claude_code_version": r.get("claude_code_version"),
                          "permissionMode": r.get("permissionMode"), "tools": r.get("tools"), "cwd": "/work/empty"})
        elif r.get("type") == "result" and calls:
            u = r.get("usage", {})
            calls[-1].update(num_turns=r.get("num_turns"), duration_ms=r.get("duration_ms"),
                             total_cost_usd=r.get("total_cost_usd"),
                             usage={k: u.get(k) for k in ("input_tokens", "cache_creation_input_tokens",
                                                         "cache_read_input_tokens", "output_tokens")})
        elif r.get("object") == "chat.completion":
            calls.append({"model": r.get("model"), "usage": r.get("usage"), "finish_reason": r["choices"][0].get("finish_reason")})
    return calls


n_dash = 0
for p in sorted(glob.glob(os.path.join(RAW, "*.jsonl"))):
    label = os.path.basename(p)[:-6]
    text = open(p).read()
    n_dash += text.count("\u2014")
    recs = [json.loads(l) for l in text.splitlines() if l.strip()]
    calls = calls_from_raw(p + ".raw")
    i = 0
    for r in recs:
        if r["kind"] == "model" and i < len(calls):
            r["call"] = calls[i]; i += 1
    body = "\n".join(scrub(json.dumps(r, ensure_ascii=False)) for r in recs) + "\n"
    open(os.path.join(OUT, label + ".jsonl"), "w").write(body)

# privacy grep over everything written
bad = re.compile(r"/Users/|Users-|glpat|sk-ant|" + "|".join(re.escape(v) for v in SECRETS) + "|" + EXTRA, re.I)
left = []
for p in glob.glob(os.path.join(OUT, "*.jsonl")):
    for ln, l in enumerate(open(p), 1):
        if bad.search(l) or EMAIL.search(l) or "\u2014" in l:
            left.append(f"{os.path.basename(p)}:{ln}")
print(f"redacted {len(glob.glob(os.path.join(OUT, '*.jsonl')))} recordings; em-dashes replaced: {n_dash}; leaks: {len(left)}")
if left:
    print("\n".join(left[:20])); sys.exit(1)
