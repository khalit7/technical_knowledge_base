"""Pydantic AI 2.54.0: typed deps + an output validator that raises ModelRetry on content errors
(the fixed line must parse, must differ from every line already in the file, and the function must exist).
Tool output mode, local model, proxy 8293. Usage: run_validator.py TAG TEMP OUTDIR"""
import ast, json, os, sys, time, urllib.request
from dataclasses import dataclass
import common
from common import Triage, CASES
from pydantic_ai import Agent, RunContext, ModelRetry
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.messages import RetryPromptPart

TAG, TEMP, OUT = sys.argv[1], float(sys.argv[2]), sys.argv[3]
PORT = 8293
wire = os.path.join(OUT, f"wire_pai_validator_{TAG}.jsonl")


def ctl(path, body):
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PORT}" + path, method="POST", data=json.dumps(body).encode()))


@dataclass
class Case:                      # the typed dependency the tools and validators receive
    code: str
    test_output: str


model = OpenAIChatModel(common.MODEL, provider=OpenAIProvider(base_url=f"http://127.0.0.1:{PORT}/v1", api_key="local"))
agent = Agent(model, deps_type=Case, output_type=Triage, instructions=common.INSTRUCTIONS,
              model_settings={"max_tokens": 1024}, retries=2)


@agent.output_validator
def check(ctx: RunContext[Case], out: Triage) -> Triage:
    names = {n.name for n in ast.walk(ast.parse(ctx.deps.code)) if isinstance(n, ast.FunctionDef)}
    if out.function not in names:
        raise ModelRetry(f"There is no function named {out.function!r} in mod.py; it defines {sorted(names)}.")
    try:
        ast.parse(out.fixed_line.strip())
    except SyntaxError as e:
        raise ModelRetry(f"fixed_line is not valid Python on its own: {e.msg}. Give one complete line.")
    if out.fixed_line.strip() in [l.strip() for l in ctx.deps.code.splitlines()]:
        raise ModelRetry("fixed_line is identical to a line already in mod.py; give the corrected line.")
    return out


ctl("/__temp", {"t": TEMP})
for c in CASES:
    ctl("/__log", {"file": wire})
    n0 = sum(1 for _ in open(wire)) if os.path.exists(wire) else 0
    obj, err, retries, msgs = None, None, [], []
    try:
        r = agent.run_sync(common.prompt(c), deps=Case(c["code"], c["test_output"]))
        obj = r.output
        msgs = r.all_messages()
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)[:300]
    retries = [p.content if isinstance(p.content, str) else "validation errors" for m in msgs for p in getattr(m, "parts", []) if isinstance(p, RetryPromptPart)]
    calls = sum(1 for _ in open(wire)) - n0
    rec = {"lib": "pai", "mode": "tool+validator", "run": TAG, "case": c["id"], "calls": calls, "retry_texts": retries,
           "error": err, "obj": obj.model_dump() if obj else None, **common.score(c, obj)}
    with open(os.path.join(OUT, f"pai_validator_{TAG}.jsonl"), "a") as f:
        f.write(json.dumps(rec) + "\n")
    print("validator", TAG, c["id"], rec["valid"], calls, retries, err, flush=True)
ctl("/__temp", {"t": None})
