"""Copy the raw runs (kept outside the repository) into src/recordings/, slimmed and redacted.

Usage: python3 redact.py RUNDIR
Keeps: what each memory system stored after every session, what it retrieved for every question, every answer,
and per-call usage (tokens, seconds, API-price equivalent) with replies; drops whole prompts that are the libraries'
own fixed text (Mem0's 34K-character extraction prompt is summarised by its sections). Scrubs: the home and run
directories (to /work), the login name, git identity (user.name, user.email) and any e-mail address, case-insensitively;
replaces em-dashes with ", ". Fails if anything sensitive remains.
"""
import glob, json, os, re, subprocess, sys, getpass

RUN = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "recordings")
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_protocols", "src"))
try:
    from private_patterns import alternation
    PRIV = re.compile(alternation(), re.I)
except Exception:
    PRIV = re.compile(r"(?!x)x")


def git(k):
    try:
        return subprocess.run(["git", "config", k], capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


SECRETS = [s for s in {getpass.getuser(), git("user.name"), git("user.email")} if s and len(s) > 2]
HOME = os.path.expanduser("~")
PATHS = sorted({RUN, os.path.dirname(RUN), os.path.realpath(RUN), HOME}, key=len, reverse=True)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def scrub_s(s):
    for p in PATHS:
        s = s.replace(p, "/work")
    for x in SECRETS:
        s = re.sub(re.escape(x), "[redacted]", s, flags=re.I)
    s = EMAIL.sub("[email]", s)
    s = PRIV.sub("[redacted]", s)
    return s.replace("\u2014", ", ")


def scrub(o):
    if isinstance(o, str):
        return scrub_s(o)
    if isinstance(o, list):
        return [scrub(x) for x in o]
    if isinstance(o, dict):
        return {k: scrub(v) for k, v in o.items()}
    return o


def jl(p):
    return [json.loads(l) for l in open(p)] if os.path.exists(p) else []


def claude_calls(p):
    out = []
    for r in jl(p):
        u = r.get("usage") or {}
        out.append({"tag": r["tag"], "model": (list(r.get("modelUsage") or {}) or [r.get("model")])[0], "s": r["s"],
                    "in": u.get("input_tokens"), "cache_w": u.get("cache_creation_input_tokens"), "cache_r": u.get("cache_read_input_tokens"),
                    "out": u.get("output_tokens"), "cost": r.get("cost"), "system_chars": r.get("system_chars"),
                    "user": r["user"][:6000], "reply": r["reply"][:3000], "is_error": r.get("is_error")})
    return out


def proxy_calls(p):
    out = []
    for r in jl(p):
        rq, rs = r.get("request") or {}, r.get("response") or {}
        if not isinstance(rs, dict):
            rs = {"raw": str(rs)[:300]}
        msg = ((rs.get("choices") or [{}])[0].get("message") or {}) if rs.get("choices") else {}
        u = rs.get("usage") or {}
        out.append({"s": round(r["t1"] - r["t0"], 2), "status": r.get("status"), "in": u.get("prompt_tokens"),
                    "cached": (u.get("prompt_tokens_details") or {}).get("cached_tokens"), "out": u.get("completion_tokens"),
                    "n_msgs": len(rq.get("messages") or []), "n_tools": len(rq.get("tools") or []),
                    "prompt_chars": sum(len(m.get("content") or "") if isinstance(m.get("content"), str) else len(json.dumps(m.get("content"))) for m in rq.get("messages") or []),
                    "reply": (msg.get("content") or "")[:1500],
                    "tool_calls": [(c.get("function") or {}).get("name", "") + " " + ((c.get("function") or {}).get("arguments") or "")[:400] for c in msg.get("tool_calls") or []],
                    "error": rs.get("error")})
    return out


def save(name, obj):
    obj = scrub(obj)
    json.dump(obj, open(os.path.join(OUT, name), "w"), indent=1, ensure_ascii=False)


# memory systems
if os.path.exists(f"{RUN}/mem0_haiku/mem0.json"):
    save("mem0_haiku.json", json.load(open(f"{RUN}/mem0_haiku/mem0.json")) | {"calls": claude_calls(f"{RUN}/mem0_haiku/llm_calls.jsonl")})
for w in ("haiku", "local"):
    p = f"{RUN}/gr_{w}/graphiti.json"
    if os.path.exists(p):
        d = json.load(open(p))
        d["llm"] = claude_calls(f"{RUN}/gr_{w}/llm_calls.jsonl") if w == "haiku" else proxy_calls(f"{RUN}/gr_local_proxy.jsonl")
        if os.path.exists(f"{RUN}/gr_{w}/nodes.json"):
            d["nodes"] = json.load(open(f"{RUN}/gr_{w}/nodes.json"))
        save(f"graphiti_{w}.json", d)
    p = f"{RUN}/paper_{w}.json"
    if os.path.exists(p):
        d = json.load(open(p))
        if w == "haiku":
            d["llm"] = claude_calls(f"{RUN}/paper_haiku_calls.jsonl")
        save(f"paper_{w}.json", d)
if os.path.exists(f"{RUN}/letta_local/letta.json"):
    save("letta_local.json", json.load(open(f"{RUN}/letta_local/letta.json")) | {"llm": proxy_calls(f"{RUN}/letta_proxy.jsonl")})
ans = {}
for p in sorted(glob.glob(f"{RUN}/ans/*.json")):
    d = json.load(open(p))
    ans[f"{d['system']}|{d['reader']}"] = d["answers"]
save("answers.json", ans)
save("answer_calls_haiku.json", claude_calls(f"{RUN}/answer_calls_haiku.jsonl"))

# leak check
bad = re.compile("|".join(["/" + "Us" + "ers/", "Us" + "ers-", "gl" + "pat", "sk" + "-ant", "/priv" + "ate/tmp", "scratch" + "pad"] + [re.escape(x) for x in SECRETS]), re.I)
n = 0
for f in glob.glob(os.path.join(OUT, "*.json")):
    t = open(f).read()
    for m in bad.finditer(t):
        print("LEAK", os.path.basename(f), t[max(0, m.start() - 40):m.end() + 40].replace("\n", " "))
        n += 1
    if "\u2014" in t:
        print("EMDASH", f); n += 1
    if EMAIL.search(t):
        print("EMAIL", f, EMAIL.search(t).group(0)[:3]); n += 1
print("files", len(glob.glob(os.path.join(OUT, "*.json"))), "leaks", n)
sys.exit(1 if n else 0)
