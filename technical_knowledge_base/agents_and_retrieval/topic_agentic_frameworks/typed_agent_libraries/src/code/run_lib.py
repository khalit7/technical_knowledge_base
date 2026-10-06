"""Structured output through a library, against the local model behind ftyped's locking proxy.
Usage: run_lib.py LIB MODE TAG TEMP OUTDIR
  LIB pai: MODE tool | native | prompted   (Pydantic AI 2.54.0 output modes, library defaults otherwise)
  LIB oai: MODE output_type                (OpenAI Agents SDK 0.23.1, Agent(output_type=Triage))
Writes OUTDIR/LIB_MODE_TAG.jsonl (one record per case) and the proxy log OUTDIR/wire_LIB_MODE_TAG.jsonl."""
import json, os, sys, time, traceback, urllib.request
import common
from common import Triage, CASES

LIB, MODE, TAG, TEMP, OUT = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
name = f"{LIB}_{MODE}_{TAG}"
wire = os.path.join(OUT, f"wire_{name}.jsonl")


def ctl(path, body):
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8291" + path, method="POST",
                                                  data=json.dumps(body).encode()))


ctl("/__temp", {"t": TEMP})

if LIB == "pai":
    from pydantic_ai import Agent, NativeOutput, PromptedOutput, ToolOutput
    from pydantic_ai.models.openai import OpenAIChatModel
    from pydantic_ai.providers.openai import OpenAIProvider
    from pydantic_ai.messages import RetryPromptPart
    model = OpenAIChatModel(common.MODEL, provider=OpenAIProvider(base_url=common.BASE_URL, api_key="local"))
    ot = {"tool": ToolOutput(Triage), "native": NativeOutput(Triage), "prompted": PromptedOutput(Triage)}[MODE]
    agent = Agent(model, instructions=common.INSTRUCTIONS, output_type=ot, model_settings={"max_tokens": 1024})
elif LIB == "oai":
    from agents import Agent, Runner, OpenAIChatCompletionsModel, set_tracing_disabled
    from openai import AsyncOpenAI
    set_tracing_disabled(True)
    from agents import ModelSettings
    model = OpenAIChatCompletionsModel(model=common.MODEL,
                                       openai_client=AsyncOpenAI(base_url=common.BASE_URL, api_key="local"))
    agent = Agent(name="triage", instructions=common.INSTRUCTIONS, model=model, output_type=Triage,
                  model_settings=ModelSettings(max_tokens=1024))

for c in CASES:
    ctl("/__log", {"file": wire})
    n0 = sum(1 for _ in open(wire)) if os.path.exists(wire) else 0
    t0 = time.time()
    obj, err, retries = None, None, 0
    try:
        if LIB == "pai":
            r = agent.run_sync(common.prompt(c))
            obj = r.output
            retries = sum(1 for m in r.all_messages() for p in getattr(m, "parts", []) if isinstance(p, RetryPromptPart))
        else:
            r = Runner.run_sync(agent, common.prompt(c))
            obj = r.final_output
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)[:300]
    dt = time.time() - t0
    lines = open(wire).read().splitlines()[n0:]
    calls = [json.loads(x) for x in lines]
    usage = [x["response"].get("usage", {}) for x in calls if isinstance(x["response"], dict)]
    rec = {"lib": LIB, "mode": MODE, "run": TAG, "temperature": TEMP, "case": c["id"], "calls": len(calls),
           "retries": retries, "error": err, "seconds": round(dt, 1),
           "prompt_tokens": [u.get("prompt_tokens") for u in usage],
           "completion_tokens": [u.get("completion_tokens") for u in usage],
           "obj": obj.model_dump() if obj is not None else None, **common.score(c, obj)}
    with open(os.path.join(OUT, name + ".jsonl"), "a") as f:
        f.write(json.dumps(rec) + "\n")
    print(name, c["id"], rec["valid"], rec["calls"], err, flush=True)
ctl("/__temp", {"t": None})
