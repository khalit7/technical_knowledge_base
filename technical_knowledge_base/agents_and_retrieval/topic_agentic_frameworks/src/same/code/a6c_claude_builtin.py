"""6c. Variant: Claude Code's built-in tools and prompt, no custom tools (the SDK as most people use it)."""
import anyio, os
from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query
import tools_impl as T

options = ClaudeAgentOptions(
    model=os.environ.get("CLAUDE_MODEL", "haiku"),
    system_prompt={"type": "preset", "preset": "claude_code", "append": T.SYSTEM},
    tools=["Read", "Edit", "Bash", "Glob", "Grep"],
    permission_mode="acceptEdits", allowed_tools=["Bash(python3 tests/test_core.py)"],
    max_turns=15, setting_sources=[], strict_mcp_config=True)

async def main():
    async for message in query(prompt=T.TASK, options=options):
        T.record(message)                       # recording only, for the page
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
