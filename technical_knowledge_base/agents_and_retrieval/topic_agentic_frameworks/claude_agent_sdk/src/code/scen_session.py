"""s4_session: one ClaudeSDKClient session over two turns (state kept by the CLI process), a context-usage
query between turns, then two later processes: resume the session by id, and fork it into a new id."""
import anyio, json, sys
from claude_agent_sdk import (ClaudeAgentOptions, ClaudeSDKClient, PermissionResultAllow, ResultMessage, query)
from common import SYSTEM, NO_EMDASH, repo_server, record, note, wire_options
model = sys.argv[1]

async def allow(name, args, ctx):
    note("permission", tool=name, decision="allow"); return PermissionResultAllow()

def opts(**kw):
    return ClaudeAgentOptions(model=model, system_prompt=SYSTEM + NO_EMDASH, mcp_servers={"repo": repo_server()},
        tools=[], can_use_tool=allow, max_turns=20, setting_sources=[], strict_mcp_config=True, **wire_options(), **kw)

TURNS = ["Run the tests and tell me which ones fail and why. Do not change any file yet.",
         "Fix only the first failure you found. Leave the other one alone."]

async def one(prompt):     # a later process: string prompts cannot use can_use_tool, so stream one message
    yield {"type": "user", "message": {"role": "user", "content": prompt}}

async def main():
    sid = None
    async with ClaudeSDKClient(options=opts()) as client:
        for i, t in enumerate(TURNS, 1):
            await client.query(t)
            async for m in client.receive_response():
                record(m, {"phase": f"turn{i}"})
                if isinstance(m, ResultMessage): sid = m.session_id; print("turn", i, m.subtype, m.total_cost_usd)
            if i == 1:
                usage = await client.get_context_usage()
                note("context_usage", phase="after_turn1", usage=usage)
    async for m in query(prompt=one("Now fix the remaining failure and run the tests."), options=opts(resume=sid)):
        record(m, {"phase": "resume"})
        if isinstance(m, ResultMessage): print("resume", m.session_id == sid, m.subtype, m.total_cost_usd)
    async for m in query(prompt=one("In one sentence: which failures have been fixed so far in this conversation?"),
                         options=opts(resume=sid, fork_session=True)):
        record(m, {"phase": "fork"})
        if isinstance(m, ResultMessage): print("fork", m.session_id == sid, m.subtype, m.total_cost_usd)
anyio.run(main)
