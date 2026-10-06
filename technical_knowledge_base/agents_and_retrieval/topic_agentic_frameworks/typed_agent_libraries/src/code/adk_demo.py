"""Google ADK 2.11.0 on the local model via LiteLLM (through a locking proxy on PORT).
Usage: adk_demo.py PORT WHICH TAG TEMP OUTDIR    WHICH: task | transfer | card
task: the running example with the four shared tools (like the frameworks root's Same agent tab), max_llm_calls 15.
transfer: a coordinator with two sub_agents (ADK's transfer_to_agent).  card: to_a2a agent card, no model call."""
import asyncio, json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tools_impl as T
from google.adk.agents import LlmAgent
from google.adk.agents.run_config import RunConfig
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

PORT, WHICH, TAG, TEMP, OUT = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
M = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
wire = os.path.join(OUT, f"wire_adk_{WHICH}_{TAG}.jsonl")


def ctl(path, body):
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PORT}" + path, method="POST",
                                                  data=json.dumps(body).encode()))


def list_files() -> str:
    """List every file in the repository."""
    return T.list_files()


def read_file(path: str) -> str:
    """Return the text of one file."""
    return T.read_file(path)


def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text old with new in a file; old must occur exactly once."""
    return T.edit_file(path, old, new)


def run_tests() -> str:
    """Run the test suite and return its output."""
    return T.run_tests()


llm = LiteLlm(model="openai/" + M, api_base=f"http://127.0.0.1:{PORT}/v1", api_key="local", max_tokens=2048)
fixer = LlmAgent(name="fixer", model=llm, description="Fixes failing tests by editing code.",
                 instruction=T.SYSTEM, tools=[list_files, read_file, edit_file, run_tests])
res = {"which": WHICH, "tag": TAG, "temperature": TEMP}

if WHICH == "card":
    from google.adk.a2a.utils.agent_to_a2a import to_a2a
    from starlette.testclient import TestClient
    app = to_a2a(fixer, host="localhost", port=8001)
    with TestClient(app) as c:
        paths = ["/.well-known/agent-card.json", "/.well-known/agent.json"]
        for p in paths:
            r = c.get(p)
            res[p] = {"status": r.status_code, "body": r.json() if r.status_code == 200 else r.text[:200]}
    json.dump(res, open(os.path.join(OUT, f"adk_card.json"), "w"), indent=1)
    print(json.dumps(res)[:2000]); sys.exit()

if WHICH == "transfer":
    explainer = LlmAgent(name="explainer", model=llm, description="Answers questions about the code without changing it.",
                         instruction="You explain code. Never edit files.", tools=[list_files, read_file])
    root = LlmAgent(name="coordinator", model=llm, instruction="You route each request to the right specialist. Do not do the work yourself.",
                    sub_agents=[fixer, explainer])
else:
    root = fixer

svc = InMemorySessionService()
runner = Runner(app_name="demo", agent=root, session_service=svc)


async def go():
    s = await svc.create_session(app_name="demo", user_id="u")
    evs = []
    async for ev in runner.run_async(user_id="u", session_id=s.id, run_config=RunConfig(max_llm_calls=15),
                                     new_message=types.Content(role="user", parts=[types.Part(text=T.TASK)])):
        parts = []
        for p in (ev.content.parts if ev.content and ev.content.parts else []):
            if p.function_call:
                parts.append({"call": p.function_call.name, "args": dict(p.function_call.args or {})})
            elif p.function_response:
                parts.append({"result_of": p.function_response.name, "response": str(p.function_response.response)[:300]})
            elif p.text:
                parts.append({"text": p.text[:400]})
        evs.append({"author": ev.author, "final": ev.is_final_response(), "parts": parts,
                    "transfer": ev.actions.transfer_to_agent if ev.actions else None,
                    "state_delta": dict(ev.actions.state_delta) if ev.actions and ev.actions.state_delta else None})
    return evs


ctl("/__log", {"file": wire}); ctl("/__temp", {"t": TEMP})
t0 = time.time()
try:
    res["events"] = asyncio.run(go())
except Exception as e:
    res["error"] = type(e).__name__ + ": " + str(e)[:300]
res["seconds"] = round(time.time() - t0, 1)
res["requests"] = sum(1 for _ in open(wire)) if os.path.exists(wire) else 0
ctl("/__temp", {"t": None})
json.dump(res, open(os.path.join(OUT, f"adk_{WHICH}_{TAG}.json"), "w"), indent=1, default=str)
print(json.dumps(res, default=str)[:1200])
