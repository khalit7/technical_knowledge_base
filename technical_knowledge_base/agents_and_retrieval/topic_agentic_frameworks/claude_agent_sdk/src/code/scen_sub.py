"""s5_subagent: built-in tools plus one programmatic subagent (AgentDefinition) on a cheaper model.
The main agent (Sonnet) must delegate test runs to the Haiku test-runner; cost splits per model in modelUsage."""
import anyio, sys
from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions, ResultMessage, query
from common import TASK, NO_EMDASH, record, wire_options
model = sys.argv[1]
runner = AgentDefinition(
    description="Runs the test suite and reports which tests fail, with their assertion messages. "
                "Use it every time the tests must be run.",
    prompt="Run `python3 tests/test_core.py` with Bash and report the failing tests and their messages, "
           "nothing else. Never edit files." + NO_EMDASH,
    tools=["Bash"], model="haiku", background=False, maxTurns=4)
options = ClaudeAgentOptions(
    model=model,
    system_prompt={"type": "preset", "preset": "claude_code",
                   "append": "Delegate every test run to the test-runner agent; do not run tests yourself." + NO_EMDASH},
    tools=["Read", "Edit", "Bash", "Agent"], agents={"test-runner": runner},
    permission_mode="acceptEdits", allowed_tools=["Bash(python3 tests/test_core.py)"],
    max_turns=20, setting_sources=[], strict_mcp_config=True, **wire_options())
async def main():
    async for m in query(prompt=TASK, options=options):
        record(m)
        if isinstance(m, ResultMessage): print(m.subtype, m.total_cost_usd)
anyio.run(main)
