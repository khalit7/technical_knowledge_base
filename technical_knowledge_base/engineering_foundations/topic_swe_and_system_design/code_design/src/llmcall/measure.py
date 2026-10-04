"""Run before.py and after.py through the same seven situations and measure what each does.

Run from this folder (about 20 seconds; no network: every HTTP call goes to a scripted fake):
  uv run --no-project --python 3.12 --with pydantic --with httpx --with pytest --with radon --with ruff --with mypy python measure.py
Writes ../inputs/llmcall.json.
"""
import importlib.metadata as md, json, os, pathlib, sqlite3, subprocess, sys, tempfile, time
from datetime import date

import httpx
from radon.complexity import cc_visit
from radon.raw import analyze

import before, after

HERE = pathlib.Path(__file__).parent
OK = '{"title": "Prompt caching", "summary": "Put the static part of the prompt first."}'
def reply(content):
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

SCEN = [
    ("good", "The model replies with clean JSON", [reply(OK)], True),
    ("prose", "JSON wrapped in prose (\"Sure! {...}\")", [reply("Sure! " + OK + " Hope this helps.")], True),
    ("notjson", "The model refuses (no JSON at all)", [reply("I cannot summarise this.")] * 3, True),
    ("missing", "JSON without the summary field", [reply('{"title": "x"}')], True),
    ("ratelimit", "429 rate limited, then OK", [httpx.Response(429), reply(OK)], True),
    ("ourbug", "400: our request is wrong (bad model name)", [httpx.Response(400, json={"error": "unknown model"})] * 3, True),
    ("empty", "The chat has no messages", [reply(OK)], False),
]

def fresh_db(with_msgs):
    f = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name
    c = sqlite3.connect(f)
    c.executescript("create table chats(id text primary key, title text, summary text);"
                    "create table messages(chat_id text, role text, content text, created_at integer);"
                    "insert into chats values('c1', null, null);")
    if with_msgs:
        c.executemany("insert into messages values('c1',?,?,?)", [("user", "How do I cache prompts?", 1),
                                                                  ("assistant", "Put the static part first.", 2)])
    c.commit()
    return f, c

def saved(c):
    return c.execute("select title from chats where id='c1'").fetchone()[0] is not None

def run_before(responses, with_msgs):
    f, c = fresh_db(with_msgs)
    it, calls, slept = iter(responses), [], []
    def fake_post(url, **kw):
        calls.append(1)
        r = next(it)
        r.request = httpx.Request("POST", url)
        return r
    before.httpx.post, before.time.sleep = fake_post, slept.append
    os.environ["LLM_KEY"] = "k"
    try:
        out = before.summarize("c1", f)
        res = "returns None" if out is None else "returns a dict"
    except Exception as e:
        res = "raises " + type(e).__name__
    return {"result": res, "calls": len(calls), "slept_s": sum(slept), "saved": saved(c)}

def run_after(responses, with_msgs):
    f, c = fresh_db(with_msgs)
    it, calls, slept = iter(responses), [], []
    def handler(req):
        calls.append(1)
        return next(it)
    model = after.HttpChatModel("https://llm.example.com/v1/chat/completions", "k", sleep=slept.append,
                                client=httpx.Client(transport=httpx.MockTransport(handler)))
    try:
        after.summarize_chat("c1", store=after.SqliteChatStore(c), model=model)
        res = "returns a Summary"
    except Exception as e:
        res = "raises " + type(e).__name__
    return {"result": res, "calls": len(calls), "slept_s": sum(slept), "saved": saved(c)}

rows = []
for key, label, responses, msgs in SCEN:
    rows.append({"key": key, "label": label, "before": run_before(list(responses), msgs),
                 "after": run_after(list(responses), msgs)})
    print(key, rows[-1]["before"], rows[-1]["after"])

def static(name):
    src = (HERE / f"{name}.py").read_text()
    blocks = [b for b in cc_visit(src) if b.letter in ("F", "M")]
    mypy = subprocess.run([sys.executable, "-m", "mypy", "--strict", "--no-incremental", "--ignore-missing-imports",
                           f"{name}.py"], cwd=HERE, capture_output=True, text=True).stdout
    mypy_errs = [l for l in mypy.splitlines() if ": error:" in l]
    ruff = subprocess.run(["ruff", "check", "--isolated", "--output-format", "json", "--select",
                           "C901,PLR0911,PLR0912,PLR2004,BLE001,S113,ANN001,ANN201",
                           "--config", "lint.mccabe.max-complexity=10", f"{name}.py"], cwd=HERE, capture_output=True, text=True)
    rv = json.loads(ruff.stdout or "[]")
    return {"sloc": analyze(src).sloc, "functions": len(blocks), "cc_max": max(b.complexity for b in blocks),
            "cc_by_func": {b.name if b.letter == "F" else b.classname + "." + b.name: b.complexity for b in blocks},
            "mypy_strict_errors": len(mypy_errs), "mypy_sample": [l.split(": error: ")[1] for l in mypy_errs[:6]],
            "ruff": [{"code": v["code"], "msg": v["message"], "line": v["location"]["row"]} for v in rv]}

t0 = time.perf_counter()
pt = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "test_after.py"], cwd=HERE,
                    capture_output=True, text=True).stdout.strip().splitlines()[-1]
env = {"date": str(date.today()), "python": sys.version.split()[0]}
for p in ("pydantic", "httpx", "mypy", "ruff", "radon", "pytest"):
    env[p] = md.version(p)
out = {"env": env, "scenarios": rows, "static": {"before": static("before"), "after": static("after")},
       "unit_tests": pt, "before_src": (HERE / "before.py").read_text(), "after_src": (HERE / "after.py").read_text()}
(HERE.parent / "inputs" / "llmcall.json").write_text(json.dumps(out, indent=1))
print(json.dumps(out["static"], indent=1)); print(pt)
