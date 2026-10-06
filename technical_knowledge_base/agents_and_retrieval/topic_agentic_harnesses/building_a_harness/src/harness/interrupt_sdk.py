#!/usr/bin/env python3
"""Interrupt Claude Code in the middle of its loop and see what the transcript holds afterwards.

Claude Agent SDK (claude-agent-sdk 0.2.163, which runs its bundled Claude Code) on the running example:
start the standard task; as soon as the model asks for its first tool call, interrupt; then send a
second message asking what it was doing. Records every message the SDK yields, as JSON lines.
Usage: interrupt_sdk.py REPO OUT.jsonl     (REPO: a fresh copy of the task repository)
Explicit options so nothing from the user's own setup loads: setting_sources=[], strict_mcp_config=True,
an explicit tool list and system prompt.
"""
import anyio, dataclasses, json, sys, time
from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, ResultMessage,
                              ToolUseBlock)

REPO, OUT = sys.argv[1], sys.argv[2]
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
FOLLOW = "I interrupted you. In one or two sentences: what was the last thing you asked to run, and did you get its result?"
T0 = time.time()


def rec(phase, m):
    d = dataclasses.asdict(m) if dataclasses.is_dataclass(m) else {"repr": repr(m)}
    with open(OUT, "a") as f:
        f.write(json.dumps({"t": round(time.time() - T0, 2), "phase": phase, "class": type(m).__name__, "msg": d},
                           default=str) + "\n")


async def main():
    opts = ClaudeAgentOptions(model="haiku", cwd=REPO, tools=["Read", "Edit", "Bash", "Glob", "Grep"],
                              system_prompt={"type": "preset", "preset": "claude_code",
                                             "append": "Never use the em-dash character."},
                              permission_mode="acceptEdits", allowed_tools=["Bash(python3 *)"],
                              setting_sources=[], strict_mcp_config=True, max_turns=12)
    async with ClaudeSDKClient(options=opts) as client:
        await client.query(TASK)
        interrupted = False
        async for m in client.receive_response():
            rec("task", m)
            if (not interrupted and isinstance(m, AssistantMessage)
                    and any(isinstance(b, ToolUseBlock) for b in m.content)):
                interrupted = True
                with open(OUT, "a") as f:
                    f.write(json.dumps({"t": round(time.time() - T0, 2), "phase": "task", "class": "HarnessEvent",
                                        "msg": {"event": "client.interrupt() called"}}) + "\n")
                await client.interrupt()
        await client.query(FOLLOW)
        async for m in client.receive_response():
            rec("follow", m)


anyio.run(main)
