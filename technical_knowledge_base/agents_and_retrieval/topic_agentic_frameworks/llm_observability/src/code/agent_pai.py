"""The same agent written with Pydantic AI and its built-in OpenTelemetry instrumentation (instrument=True,
defaults otherwise), against the replay server. Env as agent.py (BASE_URL, MODEL, WORK, OUT, LF_OTLP, LF_AUTH)."""
import json, os, sys, time

OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tools_impl import TASK, SYSTEM, list_files, read_file, edit_file, run_tests  # noqa: E402
from agent_common import USER, setup_tracing  # noqa: E402

prov = setup_tracing(OUT)
from pydantic_ai import Agent  # noqa: E402
from pydantic_ai.models.openai import OpenAIChatModel  # noqa: E402
from pydantic_ai.providers.openai import OpenAIProvider  # noqa: E402
from pydantic_ai.settings import ModelSettings  # noqa: E402

model = OpenAIChatModel(os.environ["MODEL"], provider=OpenAIProvider(base_url=os.environ["BASE_URL"], api_key="local"))
agent = Agent(model, system_prompt=SYSTEM, name="textstats-fixer",
              model_settings=ModelSettings(temperature=0, max_tokens=1024))
Agent.instrument_all(True)  # documented switch; defaults otherwise
for f in (list_files, read_file, edit_file, run_tests):
    agent.tool_plain(f)

os.chdir(os.environ["WORK"])
t0 = time.time()
r = agent.run_sync(USER)
tests = run_tests()
res = {"mode": "pydantic_ai", "final": r.output, "turns": len([m for m in r.all_messages() if m.kind == "response"]),
       "wall_s": round(time.time() - t0, 2), "tests_tail": tests[-200:]}
prov.shutdown()
json.dump(res, open(os.path.join(OUT, "result.json"), "w"), indent=1)
print(json.dumps(res))
