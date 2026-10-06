"""One rollout of a harness on a task with the local model (OpenAI-compatible mlx_lm.server).
Usage: rollout_local.py TASK HARNESS ROLLOUT_ID OUT_DIR"""
import json, os, sys, time
from openai import OpenAI
from tasks import make_workspace
from env import Env
from harnesses import HARNESS, execute
from verify import reward

MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
BASE = os.environ.get("HTRAIN_BASE", "http://127.0.0.1:8090/v1")
MAX_CALLS, MAX_TOKENS, TEMP, TOP_P = 16, 768, 0.7, 0.8

task, harness, rid, out_dir = sys.argv[1:5]
name = f"local_{harness}_{task}_{rid}"
ws = os.path.join(out_dir, "ws", name)
prompt = make_workspace(task, ws)
system, tools = HARNESS[harness]
client = OpenAI(base_url=BASE, api_key="local", timeout=900)
log = open(os.path.join(out_dir, name + ".jsonl"), "w")
def rec(**k):
    log.write(json.dumps(k) + "\n"); log.flush()

rec(type="meta", model=MODEL, backend="mlx_lm.server 0.32.0", harness=harness, task=task, rollout=rid,
    temperature=TEMP, top_p=TOP_P, max_tokens=MAX_TOKENS, max_calls=MAX_CALLS, system=system, tools=tools, prompt=prompt)
msgs = [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
env = Env(ws)
stop, t0 = "max_calls", time.time()
try:
    for i in range(MAX_CALLS):
        t = time.time()
        try:
            r = client.chat.completions.create(model=MODEL, messages=msgs, tools=tools, temperature=TEMP,
                                               top_p=TOP_P, max_tokens=MAX_TOKENS)
        except Exception as e:
            rec(type="error", call=i, error=repr(e)[:400]); stop = "infra_error"; break
        m = r.choices[0].message
        calls = [{"id": c.id, "name": c.function.name, "arguments": c.function.arguments} for c in (m.tool_calls or [])]
        rec(type="call", call=i, wall_s=round(time.time() - t, 2), finish=r.choices[0].finish_reason,
            prompt_tokens=r.usage.prompt_tokens, completion_tokens=r.usage.completion_tokens,
            content=m.content, tool_calls=calls)
        am = {"role": "assistant", "content": m.content or ""}
        if calls:
            am["tool_calls"] = [{"id": c["id"], "type": "function", "function": {"name": c["name"], "arguments": c["arguments"]}} for c in calls]
        msgs.append(am)
        if not calls:
            stop = "no_tool_call"; break
        for c in calls:
            try:
                args = json.loads(c["arguments"] or "{}")
            except Exception:
                args = None
            out = execute(env, c["name"], args, plain=(harness == "plain")) if isinstance(args, dict) else "error: arguments are not valid JSON"
            rec(type="tool", call=i, id=c["id"], name=c["name"], args=args, output=out)
            msgs.append({"role": "tool", "tool_call_id": c["id"], "content": out})
finally:
    env.close()
rw = reward(task, ws)
rec(type="end", stop=stop, calls=sum(1 for m in msgs if m["role"] == "assistant"), wall_s=round(time.time() - t0, 1), reward=rw)
print(name, stop, "reward", rw.get("binary"), rw.get("partial"))
