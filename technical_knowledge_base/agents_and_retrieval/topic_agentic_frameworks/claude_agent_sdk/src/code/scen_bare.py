"""s3_bare: query() with what the SDK uses when you pass nothing, written out explicitly:
empty system prompt (system_prompt=None sends --system-prompt ""), Claude Code's default tool set,
permission mode "default" and no permission callback. Only isolation is added (no settings, no outside MCP)."""
import anyio, sys
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query
from common import TASK, NO_EMDASH, record, wire_options
model = sys.argv[1]
options = ClaudeAgentOptions(
    model=model,
    system_prompt=NO_EMDASH.strip(),          # the default is "" ; our only line is the em-dash rule
    tools={"type": "preset", "preset": "claude_code"},   # the default tool set, said explicitly
    permission_mode="default",                # the default
    max_turns=20, setting_sources=[], strict_mcp_config=True, **wire_options())
async def main():
    async for m in query(prompt=TASK, options=options):
        record(m)
        if isinstance(m, ResultMessage): print(m.subtype, m.total_cost_usd, m.permission_denials if hasattr(m,'permission_denials') else '')
anyio.run(main)
