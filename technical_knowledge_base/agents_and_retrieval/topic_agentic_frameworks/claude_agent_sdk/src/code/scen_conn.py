"""s7_connectors: COUNTS ONLY. With strict_mcp_config False vs True (setting_sources=[] both times), how many
MCP servers and tools reach the model, and how many input tokens the one call costs. Nothing else is kept:
no message, tool name or server name is written anywhere."""
import anyio, json, os, sys
os.environ.setdefault("ROOT_CODE", "../../src/same/code")
from common import repo_server
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, SystemMessage, query
model = sys.argv[1]
async def run(strict, with_server):
    o = ClaudeAgentOptions(model=model, system_prompt="Reply with the single word OK. Never use the em-dash character.",
                           tools=[], max_turns=1, setting_sources=[], strict_mcp_config=strict,
                           mcp_servers=({"repo": repo_server()} if with_server else {}))
    c = {"strict_mcp_config": strict, "own_sdk_server": with_server}
    async for m in query(prompt="Reply OK.", options=o):
        if isinstance(m, SystemMessage) and m.subtype == "init":
            d = m.data
            c["mcp_servers"] = len(d.get("mcp_servers") or [])
            c["mcp_servers_connected"] = sum(1 for s in d.get("mcp_servers") or [] if s.get("status") == "connected")
            c["tools"] = len(d.get("tools") or [])
            c["mcp_tools"] = sum(1 for t in d.get("tools") or [] if t.startswith("mcp__"))
        if isinstance(m, ResultMessage):
            u = m.usage or {}
            c["input_total"] = u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)
            c.update(input_tokens=u.get("input_tokens"), cache_creation=u.get("cache_creation_input_tokens"),
                     cache_read=u.get("cache_read_input_tokens"), output=u.get("output_tokens"),
                     cost_usd=m.total_cost_usd, subtype=m.subtype, num_turns=m.num_turns, duration_ms=m.duration_ms)
    return c
async def main():
    out = [await run(False, False), await run(True, False), await run(False, True), await run(True, True)]
    json.dump(out, open(sys.argv[2], "w"), indent=1); print(json.dumps(out))
anyio.run(main)
