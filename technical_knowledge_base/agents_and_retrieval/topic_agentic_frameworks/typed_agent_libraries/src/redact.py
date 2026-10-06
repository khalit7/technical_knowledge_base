"""Copy this page's recordings from the scratch area into src/recordings/, redacted.

Usage: python3 redact.py SCRATCH_DIR     (the agent's scratch folder holding so/, demo/ and the raw Claude runs)

Redaction (the raw files stay in the scratch area, never in the repo):
- the scratch path, the home folder and the login name are replaced by /scratch, ~ and user;
- git identity (user.name, user.email) and any e-mail address are replaced, case-insensitively;
- machine-specific patterns from topic_protocols/src/.private_patterns (git-ignored) are replaced;
- Claude stream-json: the init record is reduced to model, permissionMode, tools, claude_code_version and
  cwd (/work); session ids and uuids become short labels; thinking signatures are dropped;
- em-dashes written by a model are replaced by ", " and counted (redaction.json).
"""
import getpass, glob, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "recordings")
SCR = os.path.abspath(sys.argv[1])
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_protocols", "src"))
try:
    import private_patterns
    PRIV = private_patterns.alternation()
except Exception:
    PRIV = r"(?!x)x"


def git(k):
    try:
        return subprocess.run(["git", "config", k], capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


SUBS = []
for real in sorted({SCR, os.path.realpath(SCR), os.path.dirname(SCR), os.path.realpath(os.path.dirname(SCR))}, key=len, reverse=True):
    SUBS.append((re.escape(real), "/scratch"))
SUBS += [(re.escape(os.path.expanduser("~")), "~"), (re.escape(SCR.replace("/", "-")), "scratch")]
for k in ("user.name", "user.email"):
    v = git(k)
    if v:
        SUBS.append((re.escape(v), "user"))
SUBS += [(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "user@example.com"),
         (r"\b" + re.escape(getpass.getuser()) + r"\b", "user"), (PRIV, "[private]")]
EM = chr(0x2014)
stats = {"emdash_replaced": 0, "files": 0}


def clean(text):
    for pat, rep in SUBS:
        text = re.sub(pat, rep, text, flags=re.I)
    n = text.count(EM) + text.count("\\u2014")
    stats["emdash_replaced"] += n
    return text.replace(EM, ", ").replace("\\u2014", ", ")


def claude_jsonl(src, dst):
    labels = {}

    def lab(v):
        labels.setdefault(v, f"id{len(labels) + 1}")
        return labels[v]
    out = []
    for line in open(src):
        if not line.strip().startswith("{"):
            continue
        r = json.loads(line)
        if r.get("type") == "system" and r.get("subtype") == "init":
            r = {"type": "system", "subtype": "init", "model": r.get("model"), "permissionMode": r.get("permissionMode"),
                 "tools": r.get("tools"), "claude_code_version": r.get("claude_code_version"), "cwd": "/work"}
        for k in ("session_id", "uuid", "parent_tool_use_id", "request_id"):
            if r.get(k):
                r[k] = lab(r[k])
        m = r.get("message")
        if isinstance(m, dict):
            if m.get("id"):
                m["id"] = lab(m["id"])
            for b in m.get("content", []) if isinstance(m.get("content"), list) else []:
                b.pop("signature", None)
                for k in ("id", "tool_use_id"):
                    if b.get(k):
                        b[k] = lab(b[k])
        out.append(json.dumps(r, ensure_ascii=False))
    open(dst, "w").write(clean("\n".join(out) + "\n"))


def plain(src, dst):
    open(dst, "w").write(clean(open(src).read()))


os.makedirs(OUT, exist_ok=True)
for sub in ("local", "claude", "demo"):
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)
for f in sorted(glob.glob(os.path.join(SCR, "so", "out", "*.jsonl")) + [os.path.join(SCR, "so", "outlines.jsonl")]):
    if os.path.basename(f).startswith("claude_"):
        plain(f, os.path.join(OUT, "claude", os.path.basename(f)))
    else:
        plain(f, os.path.join(OUT, "local", os.path.basename(f)))
    stats["files"] += 1
for f in sorted(glob.glob(os.path.join(SCR, "..", "recordings", "ftyped", "claude", "*.jsonl"))):
    claude_jsonl(f, os.path.join(OUT, "claude", "raw_" + os.path.basename(f)))
    stats["files"] += 1
for f in sorted(glob.glob(os.path.join(SCR, "demo", "out", "*")) + glob.glob(os.path.join(SCR, "demo", "runs", "*.tests.txt"))
                + glob.glob(os.path.join(SCR, "demo", "runs", "*.diff")) + [os.path.join(SCR, "demo", "smol_exec.json")]):
    if f.endswith(".sqlite"):
        continue
    plain(f, os.path.join(OUT, "demo", os.path.basename(f)))
    stats["files"] += 1
json.dump(stats, open(os.path.join(OUT, "redaction.json"), "w"), indent=1)

# Proof: nothing private left.
bad = re.compile("/" + "Users" + "/|" + "Users" + "-|gl" + "pat|sk" + "-ant|" + re.escape(getpass.getuser()) + "|" + PRIV, re.I)
hits = [p for p in glob.glob(os.path.join(OUT, "**", "*"), recursive=True) if os.path.isfile(p) and bad.search(open(p, errors="replace").read())]
print(json.dumps(stats), "private hits:", hits)
sys.exit(1 if hits else 0)
