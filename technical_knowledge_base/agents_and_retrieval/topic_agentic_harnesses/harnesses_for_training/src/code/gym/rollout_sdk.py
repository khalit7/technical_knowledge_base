"""One rollout of a harness (our prompt, our tools) on a task with Claude through the Claude Agent SDK.
The loop is the SDK's (Claude Code's); the system prompt and tools are ours, built-in tools off.
Usage: rollout_sdk.py TASK HARNESS ROLLOUT_ID OUT_DIR [model alias]"""
import anyio, dataclasses, json, os, sys, time
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, create_sdk_mcp_server, query, tool
from tasks import make_workspace
from env import Env
from harnesses import HARNESS, execute
from verify import reward

task, harness, rid, out_dir = sys.argv[1:5]
model = sys.argv[5] if len(sys.argv) > 5 else "haiku"
name = f"sdk-{model}_{harness}_{task}_{rid}"
ws = os.path.join(out_dir, "ws", name)
prompt = make_workspace(task, ws)
system, tools = HARNESS[harness]
env = Env(ws)
log = open(os.path.join(out_dir, name + ".jsonl"), "w")
def rec(d):
    log.write(json.dumps(d, default=str) + "\n"); log.flush()

def make(t):
    f = t["function"]
    schema = f["parameters"]
    @tool(f["name"], f["description"], schema)
    async def run(args, _n=f["name"]):
        out = await anyio.to_thread.run_sync(execute, env, _n, args, harness == "plain")
        rec({"_type": "tool_exec", "name": _n, "args": args, "output": out, "t": time.time()})
        return {"content": [{"type": "text", "text": out}]}
    return run

server = create_sdk_mcp_server("env", tools=[make(t) for t in tools])
names = [f"mcp__env__{t['function']['name']}" for t in tools]
opts = ClaudeAgentOptions(model=model, system_prompt=system, mcp_servers={"env": server}, tools=[],
                          allowed_tools=names, max_turns=16, setting_sources=[], strict_mcp_config=True, cwd=ws)
rec({"_type": "meta", "model_alias": model, "harness": harness, "task": task, "rollout": rid, "system": system,
     "tools": tools, "prompt": prompt, "loop": "claude-agent-sdk", "max_turns": 16})

async def main():
    t0 = time.time(); res = None
    try:
        async for m in query(prompt=prompt, options=opts):
            d = dataclasses.asdict(m) if dataclasses.is_dataclass(m) else {"repr": repr(m)}
            d["_type"] = type(m).__name__; d["t"] = time.time()
            rec(d)
            if isinstance(m, ResultMessage):
                res = m
    finally:
        env.close()
    rw = reward(task, ws)
    rec({"_type": "end", "wall_s": round(time.time() - t0, 1), "reward": rw})
    print(name, "reward", rw.get("binary"), rw.get("partial"), "cost", res and res.total_cost_usd)

anyio.run(main)
