"""OpenAI Agents SDK 0.23.1 mechanisms on the local model (through a locking proxy on PORT).
Usage: oai_demo.py PORT WHICH TAG TEMP OUTDIR   WHICH: handoff | guard_par | guard_seq | session | tracing
Runs in the current directory (a fresh copy of the task repo for handoff)."""
import asyncio, json, os, sys, time, logging, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tools_impl as T
from pydantic import BaseModel
from openai import AsyncOpenAI
from agents import (Agent, Runner, OpenAIChatCompletionsModel, function_tool, set_tracing_disabled,
                    input_guardrail, GuardrailFunctionOutput, InputGuardrailTripwireTriggered, SQLiteSession, ModelSettings)
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

PORT, WHICH, TAG, TEMP, OUT = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
M = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
wire = os.path.join(OUT, f"wire_oai_{WHICH}_{TAG}.jsonl")


def ctl(path, body):
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PORT}" + path, method="POST",
                                                  data=json.dumps(body).encode()))


ctl("/__log", {"file": wire}); ctl("/__temp", {"t": TEMP})
if WHICH != "tracing":
    set_tracing_disabled(True)
model = OpenAIChatCompletionsModel(model=M, openai_client=AsyncOpenAI(base_url=f"http://127.0.0.1:{PORT}/v1", api_key="local"))
ms = ModelSettings(max_tokens=1024)


@function_tool
def list_files() -> str:
    """List every file in the repository."""
    return T.list_files()


@function_tool
def read_file(path: str) -> str:
    """Return the text of one file."""
    return T.read_file(path)


@function_tool
def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text old with new in a file; old must occur exactly once."""
    return T.edit_file(path, old, new)


@function_tool
def run_tests() -> str:
    """Run the test suite and return its output."""
    return T.run_tests()


fixer = Agent(name="fixer", handoff_description="Fixes failing tests by editing code.",
              instructions=T.SYSTEM, model=model, model_settings=ms,
              tools=[list_files, read_file, edit_file, run_tests])
res = {"which": WHICH, "tag": TAG, "temperature": TEMP}
t0 = time.time()

if WHICH == "handoff":
    explainer = Agent(name="explainer", handoff_description="Answers questions about the code without changing it.",
                      instructions="You explain code. Never edit files.", model=model, model_settings=ms,
                      tools=[list_files, read_file])
    triage = Agent(name="triage", model=model, model_settings=ms, handoffs=[fixer, explainer],
                   instructions=RECOMMENDED_PROMPT_PREFIX + "\n\nYou route each request to the right specialist. Do not do the work yourself.")
    try:
        r = Runner.run_sync(triage, T.TASK, max_turns=20)
        res["last_agent"] = r.last_agent.name
        res["items"] = [type(i).__name__ + (":" + getattr(getattr(i, "raw_item", None), "name", "") if hasattr(getattr(i, "raw_item", None), "name") else "") for i in r.new_items]
        res["final"] = str(r.final_output)[:500]
    except Exception as e:
        res["error"] = type(e).__name__ + ": " + str(e)[:300]

elif WHICH in ("guard_par", "guard_seq"):
    class Topic(BaseModel):
        about_this_repository: bool
        reason: str
    checker = Agent(name="topic_check", model=model, model_settings=ms, output_type=Topic,
                    instructions="Decide whether the user's request is about fixing or understanding the code in this Python repository.")

    @input_guardrail(run_in_parallel=(WHICH == "guard_par"))
    async def on_topic(ctx, agent, inp):
        r = await Runner.run(checker, inp, context=ctx.context)
        return GuardrailFunctionOutput(output_info=r.final_output.model_dump(),
                                       tripwire_triggered=not r.final_output.about_this_repository)
    guarded = fixer.clone(input_guardrails=[on_topic])
    out = []
    for prompt in ["Write a short poem about the sea.", T.TASK]:
        n0 = sum(1 for _ in open(wire)) if os.path.exists(wire) else 0
        try:
            r = Runner.run_sync(guarded, prompt, max_turns=12)
            out.append({"prompt": prompt, "tripped": False, "final": str(r.final_output)[:300]})
        except InputGuardrailTripwireTriggered as e:
            out.append({"prompt": prompt, "tripped": True,
                        "info": e.guardrail_result.output.output_info})
        except Exception as e:
            out.append({"prompt": prompt, "error": type(e).__name__ + ": " + str(e)[:300]})
        out[-1]["requests"] = sum(1 for _ in open(wire)) - n0
    res["cases"] = out

elif WHICH == "session":
    db = os.path.join(OUT, f"session_{TAG}.sqlite")
    if os.path.exists(db):
        os.remove(db)
    s = SQLiteSession("demo", db)
    chat = Agent(name="assistant", instructions="Answer briefly.", model=model, model_settings=ms)
    a = Runner.run_sync(chat, "Remember this: the release codename is Kestrel. Reply only OK.", session=s)
    b = Runner.run_sync(chat, "What is the release codename?", session=s)
    items = asyncio.run(s.get_items())
    import sqlite3
    con = sqlite3.connect(db)
    res["tables"] = {t: [r[1] for r in con.execute(f"pragma table_info({t})")] for (t,) in con.execute("select name from sqlite_master where type='table'")}
    res["rows"] = {t: con.execute(f"select count(*) from {t}").fetchone()[0] for t in res["tables"]}
    res["answers"] = [a.final_output, b.final_output]
    res["stored_items"] = [{k: (v if k != "content" else str(v)[:120]) for k, v in it.items()} for it in items]

elif WHICH == "tracing":
    os.environ.pop("OPENAI_API_KEY", None)
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s",
                        handlers=[logging.FileHandler(os.path.join(OUT, f"tracing_{TAG}.log"))])
    chat = Agent(name="assistant", instructions="Answer briefly.", model=model, model_settings=ms)
    r = Runner.run_sync(chat, "Say hello in three words.")
    res["final"] = r.final_output
    from agents.tracing import get_trace_provider
    get_trace_provider().force_flush() if hasattr(get_trace_provider(), "force_flush") else None

res["seconds"] = round(time.time() - t0, 1)
res["requests"] = sum(1 for _ in open(wire)) if os.path.exists(wire) else 0
ctl("/__temp", {"t": None})
with open(os.path.join(OUT, f"oai_{WHICH}_{TAG}.json"), "w") as f:
    json.dump(res, f, indent=1, default=str)
print(json.dumps(res, default=str)[:1500])
