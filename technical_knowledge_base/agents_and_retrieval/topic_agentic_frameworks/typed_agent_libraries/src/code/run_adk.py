"""Structured output through Google ADK 2.11.0 (LlmAgent(output_schema=Triage, output_key='triage'), no tools)
against the local model via LiteLLM 1.104.0 and ftyped's locking proxy.
Usage: run_adk.py TAG TEMP OUTDIR"""
import asyncio, json, os, sys, time, urllib.request
import common
from common import Triage, CASES

TAG, TEMP, OUT = sys.argv[1], float(sys.argv[2]), sys.argv[3]
name = f"adk_output_schema_{TAG}"
wire = os.path.join(OUT, f"wire_{name}.jsonl")


def ctl(path, body):
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8291" + path, method="POST",
                                                  data=json.dumps(body).encode()))


from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

agent = LlmAgent(name="triage", model=LiteLlm(model="openai/" + common.MODEL, api_base=common.BASE_URL,
                                               api_key="local", max_tokens=1024),
                 instruction=common.INSTRUCTIONS, output_schema=Triage, output_key="triage")
svc = InMemorySessionService()
runner = Runner(app_name="so", agent=agent, session_service=svc)


async def one(c):
    s = await svc.create_session(app_name="so", user_id="u")
    final, events = None, []
    async for ev in runner.run_async(user_id="u", session_id=s.id,
                                     new_message=types.Content(role="user", parts=[types.Part(text=common.prompt(c))])):
        events.append({"author": ev.author, "final": ev.is_final_response(),
                       "state_delta": dict(ev.actions.state_delta) if ev.actions and ev.actions.state_delta else None})
        if ev.is_final_response() and ev.content and ev.content.parts:
            final = "".join(p.text or "" for p in ev.content.parts)
    s2 = await svc.get_session(app_name="so", user_id="u", session_id=s.id)
    return final, events, s2.state.get("triage")


ctl("/__temp", {"t": TEMP})
for c in CASES:
    ctl("/__log", {"file": wire})
    n0 = sum(1 for _ in open(wire)) if os.path.exists(wire) else 0
    t0 = time.time()
    obj, err, final, events, state = None, None, None, [], None
    try:
        final, events, state = asyncio.run(one(c))
        obj, err = common.try_parse(final or "")
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)[:300]
    dt = time.time() - t0
    calls = [json.loads(x) for x in open(wire).read().splitlines()[n0:]]
    usage = [x["response"].get("usage", {}) for x in calls if isinstance(x["response"], dict)]
    rec = {"lib": "adk", "mode": "output_schema", "run": TAG, "temperature": TEMP, "case": c["id"], "calls": len(calls),
           "retries": 0, "error": err, "seconds": round(dt, 1), "final_text": (final or "")[:1500],
           "state_has_triage": state is not None, "events": events,
           "prompt_tokens": [u.get("prompt_tokens") for u in usage],
           "completion_tokens": [u.get("completion_tokens") for u in usage],
           "obj": obj.model_dump() if obj is not None else None, **common.score(c, obj)}
    with open(os.path.join(OUT, name + ".jsonl"), "a") as f:
        f.write(json.dumps(rec) + "\n")
    print(name, c["id"], rec["valid"], rec["calls"], err, flush=True)
ctl("/__temp", {"t": None})
