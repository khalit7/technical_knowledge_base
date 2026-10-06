"""s9_rewind: file checkpointing. Built-in tools fix the bugs; then rewind_files() to the prompt's checkpoint
puts the files back. Test results are taken by this script before and after the rewind."""
import anyio, subprocess, sys
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, ResultMessage, UserMessage
from common import TASK, SYSTEM, NO_EMDASH, record, note, wire_options
model = sys.argv[1]
def tests():
    p = subprocess.run(["python3", "tests/test_core.py"], capture_output=True, text=True)
    return p.stdout.strip().splitlines()[-1]
options = ClaudeAgentOptions(model=model, system_prompt=SYSTEM + NO_EMDASH,
    tools=["Read", "Edit", "Bash"], permission_mode="acceptEdits", allowed_tools=["Bash(python3 tests/test_core.py)"],
    enable_file_checkpointing=True, extra_args={"replay-user-messages": None},
    max_turns=20, setting_sources=[], strict_mcp_config=True, **wire_options())
async def main():
    note("tests", phase="before", result=tests())
    checkpoint = None
    async with ClaudeSDKClient(options=options) as client:
        await client.query(TASK)
        async for m in client.receive_response():
            record(m)
            if isinstance(m, UserMessage) and m.uuid and checkpoint is None: checkpoint = m.uuid
            if isinstance(m, ResultMessage): print(m.subtype, m.total_cost_usd)
        note("tests", phase="after_agent", result=tests())
        await client.rewind_files(checkpoint)
        note("rewind", checkpoint="first user message")
        note("tests", phase="after_rewind", result=tests())
    print("checkpoint found:", checkpoint is not None)
anyio.run(main)
