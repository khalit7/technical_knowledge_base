"""OpenHands Software Agent SDK 1.53.0, default coding preset (cli_mode: terminal, file_editor,
task_tracker + finish, think; default condenser), local workspace /work inside this container."""
import json, os, time
from openhands.sdk import LLM, Conversation
from openhands.tools.preset.default import get_default_agent
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
llm = LLM(model="openai/mlx-community/Qwen3-4B-Instruct-2507-4bit", base_url=os.environ["BASE"], api_key="local",
          usage_id="agent", temperature=0.0)
agent = get_default_agent(llm, cli_mode=True)
conv = Conversation(agent=agent, workspace="/work", max_iteration_per_run=int(os.environ.get("MAXIT", "40")))
t = time.time()
conv.send_message(TASK)
try:
    conv.run()
    err = None
except Exception as e:
    err = repr(e)[:400]
st = conv.state
events = []
for ev in st.events:
    try:
        events.append(json.loads(ev.model_dump_json()))
    except Exception as e:
        events.append({"kind": type(ev).__name__, "dump_error": str(e)[:200]})
json.dump({"status": str(st.execution_status), "error": err, "wall_s": round(time.time() - t, 1),
           "n_events": len(events), "events": events}, open("/out/ohs_events.json", "w"))
print("status", st.execution_status, "err", err)
