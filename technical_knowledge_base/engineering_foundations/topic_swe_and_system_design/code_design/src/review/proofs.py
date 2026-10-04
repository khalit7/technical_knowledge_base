"""Run the evidence behind the Review lab: each flagged diff is applied to the real code and executed.

Run from this folder (about 20 seconds):
  uv run --no-project --python 3.12 --with fastapi --with httpx --with pydantic --with pytest python proofs.py
Writes ../inputs/review_proofs.json.
"""
import asyncio, importlib.util, json, pathlib, sqlite3, subprocess, sys, time, types, warnings
from datetime import date

import httpx

HERE = pathlib.Path(__file__).parent
LLM = HERE.parent / "llmcall"
STEPS = HERE.parent / "refactor" / "steps"
out = {"date": str(date.today()), "python": sys.version.split()[0]}


def load(path: pathlib.Path, src: str | None = None, name: str = "m"):
    m = types.ModuleType(name)
    m.__file__ = str(path)
    sys.modules[name] = m
    exec(compile(src if src is not None else path.read_text(), str(path), "exec"), m.__dict__)
    return m


# 1. "retry everything": catch Exception instead of httpx.TransportError, then run the real unit test file
after_src = (LLM / "after.py").read_text()
old = "            except httpx.TransportError as e:          # connection refused, timeout, reset\n"
assert after_src.count(old) == 1
patched = after_src.replace(old, "            except Exception as e:  # be safe\n")
# the 4xx path raises inside the try only if raise_for_status is moved in; the realistic diff wraps the whole body
old2 = ("            else:\n                if r.status_code != 429 and r.status_code < 500:\n"
        "                    r.raise_for_status()               # a 4xx bug of ours: fail loudly, do not retry\n"
        "                    content: str = r.json()[\"choices\"][0][\"message\"][\"content\"]\n"
        "                    return content\n                last = f\"HTTP {r.status_code}\"\n")
assert patched.count(old2) == 1
new2 = ("                if r.status_code != 429 and r.status_code < 500:\n"
        "                    r.raise_for_status()               # a 4xx bug of ours: fail loudly, do not retry\n"
        "                    content: str = r.json()[\"choices\"][0][\"message\"][\"content\"]\n"
        "                    return content\n                last = f\"HTTP {r.status_code}\"\n")
patched = patched.replace(old2, "").replace(
    "                r = self.client.post(self.url, json=body, headers={\"Authorization\": f\"Bearer {self.key}\"})\n",
    "                r = self.client.post(self.url, json=body, headers={\"Authorization\": f\"Bearer {self.key}\"})\n" + new2)
tmp = HERE / "_tmp_r1"
tmp.mkdir(exist_ok=True)
(tmp / "after.py").write_text(patched)
(tmp / "test_after.py").write_text((LLM / "test_after.py").read_text())
r = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "-p", "no:warnings", "test_after.py"],
                   cwd=tmp, capture_output=True, text=True)
lines = r.stdout.strip().splitlines()
out["r1_retry_everything"] = {"summary": lines[-1], "failed": [l.split("::")[1].split(" ")[0] for l in lines if l.startswith("FAILED")]}
for f in tmp.iterdir():
    if f.is_file():
        f.unlink()
import shutil; shutil.rmtree(tmp, ignore_errors=True)

# 2. mutable default argument
src2 = '''
def add_tags(summary: dict, tags: list[str] = []) -> dict:
    tags.append("auto")
    return {**summary, "tags": tags}
a = add_tags({"title": "first"})
b = add_tags({"title": "second"})
'''
ns = {}
exec(src2, ns)
out["r2_mutable_default"] = {"first": ns["a"]["tags"], "second": ns["b"]["tags"], "same_object": ns["a"]["tags"] is ns["b"]["tags"]}

# 6. SQL built with an f-string
c = sqlite3.connect(":memory:")
c.executescript("create table messages(chat_id text, role text, content text, created_at integer);"
                "insert into messages values('c1','user','mine',1),('c2','user','someone else''s secret',2);")
evil = "x' or '1'='1"
rows_f = c.execute(f"select role, content from messages where chat_id='{evil}' order by created_at").fetchall()
rows_p = c.execute("select role, content from messages where chat_id=? order by created_at", (evil,)).fetchall()
out["r6_sql_injection"] = {"chat_id": evil, "fstring_rows": len(rows_f), "fstring_contents": [r[1] for r in rows_f],
                           "param_rows": len(rows_p)}

# 7. a blocking call inside an async handler: 10 concurrent requests
from fastapi import FastAPI
app = FastAPI()
@app.get("/async-sleep")
async def a_sleep():
    await asyncio.sleep(0.2)
    return {}
@app.get("/blocking-sleep")
async def b_sleep():
    time.sleep(0.2)          # the diff under review: a synchronous call (here a sleep; in the diff, requests.post)
    return {}
async def burst(path, n=10):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as cl:
        t = time.perf_counter()
        await asyncio.gather(*[cl.get(path) for _ in range(n)])
        return time.perf_counter() - t
out["r7_blocking_in_async"] = {"n": 10, "each_s": 0.2, "async_total_s": round(asyncio.run(burst("/async-sleep")), 2),
                               "blocking_total_s": round(asyncio.run(burst("/blocking-sleep")), 2)}

# 8. renaming a public keyword argument without a deprecation period
after = load(LLM / "after.py", name="after")
renamed = after_src.replace("def render_transcript(messages: Sequence[Message], max_chars: int = 8000) -> str:",
                            "def render_transcript(messages: Sequence[Message], limit: int = 8000) -> str:").replace(
                            "    return text[-max_chars:]", "    return text[-limit:]")
m8 = load(LLM / "after.py", renamed, name="after_renamed")
try:
    m8.render_transcript([], max_chars=100)
    err8 = None
except TypeError as e:
    err8 = str(e)
out["r8_breaking_rename"] = {"caller": "render_transcript(msgs, max_chars=100)", "error": err8}

# 10. a test that tests the mock: passes even when parse_summary is broken
test10 = '''
from unittest.mock import patch
import after
def test_summarize_chat_parses():
    with patch("after.parse_summary") as p:
        p.return_value = after.Summary(title="t", summary="s")
        class M:
            def complete(self, s, u): return "{}"
        class S:
            def messages(self, c): return [after.Message("user", "hi")]
            def save_summary(self, c, s): pass
        after.summarize_chat("c", store=S(), model=M())
        p.assert_called_once()
'''
broken = after_src.replace('    start, end = reply.find("{"), reply.rfind("}")\n',
                           '    raise NotImplementedError  # parse_summary is broken\n    start, end = reply.find("{"), reply.rfind("}")\n')
tmp = HERE / "_tmp_r10"
tmp.mkdir(exist_ok=True)
(tmp / "after.py").write_text(broken)
(tmp / "test_mocked.py").write_text(test10)
r = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "-p", "no:warnings", "test_mocked.py"],
                   cwd=tmp, capture_output=True, text=True)
out["r10_test_the_mock"] = {"parse_summary": "raises NotImplementedError", "mocked_test": r.stdout.strip().splitlines()[-1]}
shutil.rmtree(tmp, ignore_errors=True)

(HERE.parent / "inputs" / "review_proofs.json").write_text(json.dumps(out, indent=1))
print(json.dumps(out, indent=1))
