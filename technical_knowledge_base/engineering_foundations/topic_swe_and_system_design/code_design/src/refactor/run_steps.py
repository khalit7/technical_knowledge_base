"""Run the characterization tests and the complexity metrics on every refactoring step.

Run from this folder (about 30 seconds):
  uv run --no-project --python 3.12 --with fastapi --with httpx --with pytest --with radon --with ruff python run_steps.py
Writes ../inputs/refactor_steps.json, which gen_data.py turns into the page's data.
"""
import ast, difflib, importlib.metadata as md, json, os, pathlib, platform, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
from datetime import date

from radon.complexity import cc_visit
from radon.metrics import mi_visit
from radon.raw import analyze

HERE = pathlib.Path(__file__).parent
S = HERE / "steps"
meta = json.loads((HERE / "steps_meta.json").read_text())
meta.append({"step": "bigbang", "title": "The same end state in one rewrite",
             "why": "Written for this page: the handler rewritten in one go as a MessageService class, without running the old tests until the end."})
RUFF_RULES = "C901,PLR0911,PLR0912,PLR0915"


def handler_src(src: str) -> str:
    tree = ast.parse(src)
    for n in tree.body:
        if isinstance(n, ast.AsyncFunctionDef) and n.name == "send_message":
            start = n.decorator_list[0].lineno if n.decorator_list else n.lineno
            return "\n".join(src.splitlines()[start - 1:n.end_lineno])
    raise SystemExit("send_message not found")


def tests(step: str) -> list[dict]:
    with tempfile.TemporaryDirectory() as d:
        x = pathlib.Path(d) / "r.xml"
        subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:warnings", "-p", "no:cacheprovider",
                        f"--junitxml={x}", "tests"], cwd=HERE, env={**os.environ, "STEP": step},
                       capture_output=True, text=True)
        out = []
        for tc in ET.parse(x).getroot().iter("testcase"):
            f = tc.find("failure")
            msg = ""
            if f is not None:
                msg = (f.get("message") or "").splitlines()[0][:160]
            if tc.find("skipped") is not None:
                continue                      # a test added in a later step
            out.append({"name": tc.get("name"), "ok": f is None, "msg": msg})
        return out


def ruff(path: pathlib.Path) -> list[dict]:
    r = subprocess.run(["ruff", "check", "--isolated", "--output-format", "json", "--select", RUFF_RULES,
                        "--config", "lint.mccabe.max-complexity=10", str(path)], capture_output=True, text=True)
    return [{"code": v["code"], "msg": v["message"], "line": v["location"]["row"]} for v in json.loads(r.stdout or "[]")]


rows, prev = [], None
for m in meta:
    step = m["step"] if m["step"] == "bigbang" else f"step{m['step']}"
    src = (S / f"{step}.py").read_text()
    h = handler_src(src)
    blocks = cc_visit(src)
    funcs = [b for b in blocks if b.letter in ("F", "M")]
    cc_h = next(b.complexity for b in blocks if b.name == "send_message")
    base = (S / "step0.py").read_text() if step == "bigbang" else prev
    diff = [] if base is None else list(difflib.unified_diff(base.splitlines(), src.splitlines(), lineterm="", n=1))[2:]
    t = tests(step)
    rows.append({**m, "file": f"steps/{step}.py", "handler": h,
                 "handler_lines": len(h.splitlines()), "handler_sloc": analyze(h).sloc,
                 "cc_handler": cc_h, "cc_max": max(b.complexity for b in funcs),
                 "cc_mean": round(sum(b.complexity for b in funcs) / len(funcs), 2), "n_funcs": len(funcs),
                 "mi": round(mi_visit(src, multi=True), 1), "module_sloc": analyze(src).sloc,
                 "ruff": [v for v in ruff(S / f"{step}.py")],
                 "tests": t, "passed": sum(x["ok"] for x in t), "total": len(t),
                 "diff": diff, "diff_add": sum(1 for d in diff if d.startswith("+") and not d.startswith("+++")),
                 "diff_del": sum(1 for d in diff if d.startswith("-") and not d.startswith("---"))})
    if step != "bigbang":
        prev = src
    print(step, rows[-1]["passed"], "/", rows[-1]["total"], "cc", cc_h, "lines", rows[-1]["handler_lines"],
          "ruff", [v["code"] for v in rows[-1]["ruff"]])

env = {"date": str(date.today()), "python": platform.python_version()}
for p in ("fastapi", "pydantic", "starlette", "pytest", "radon", "ruff", "httpx"):
    env[p] = md.version(p)
(HERE.parent / "inputs" / "refactor_steps.json").write_text(json.dumps({"env": env, "ruff_rules": RUFF_RULES, "steps": rows}, indent=1))
print(env)
