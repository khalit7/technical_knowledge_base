"""Scenarios with our own four tools (in-process MCP server): s1_wire (hooks + permission callback,
everything allowed) and s2_deny (the callback makes tests/ read-only while the prompt asks for a new test)."""
import anyio, os, sys
from claude_agent_sdk import (ClaudeAgentOptions, HookMatcher, PermissionResultAllow,
                              PermissionResultDeny, ResultMessage, query)
from common import TASK, SYSTEM, NO_EMDASH, repo_server, record, note, wire_options

scen, model = sys.argv[1], sys.argv[2]
READ_ONLY = {"mcp__repo__list_files", "mcp__repo__read_file"}

async def pre_tool(inp, tool_use_id, ctx):
    name = inp["tool_name"]
    note("hook", event="PreToolUse", tool=name, input=inp.get("tool_input"))
    if name in READ_ONLY:   # read-only tools: the hook allows them, so the permission callback never sees them
        return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow",
                                       "permissionDecisionReason": "read-only tool"}}
    return {}

async def post_tool(inp, tool_use_id, ctx):
    note("hook", event="PostToolUse", tool=inp["tool_name"])
    return {}

async def can_use_tool(name, args, context):
    path = str(args.get("path", ""))
    if scen == "s2_deny" and name == "mcp__repo__edit_file" and path.lstrip("./").startswith("tests/"):
        msg = "tests/ is read-only for this agent. Describe the test you would add in your final reply instead."
        note("permission", tool=name, input=args, decision="deny", message=msg)
        return PermissionResultDeny(message=msg)
    note("permission", tool=name, input=args, decision="allow")
    return PermissionResultAllow()

prompt = TASK if scen == "s1_wire" else (
    "The tests in this repository fail. Find out why and fix the code so they pass. "
    "Then add a regression test for the apostrophe case to tests/test_core.py.")

options = ClaudeAgentOptions(
    model=model, system_prompt=SYSTEM + NO_EMDASH,
    mcp_servers={"repo": repo_server()}, tools=[],          # no built-in tools, only ours
    allowed_tools=[],                                        # nothing pre-approved: hook, then callback decide
    can_use_tool=can_use_tool,
    hooks={"PreToolUse": [HookMatcher(matcher=None, hooks=[pre_tool])],
           "PostToolUse": [HookMatcher(matcher=None, hooks=[post_tool])]},
    max_turns=20, setting_sources=[], strict_mcp_config=True, **wire_options())

async def prompts():   # can_use_tool needs streaming input: the prompt goes in as one stream message
    yield {"type": "user", "message": {"role": "user", "content": prompt}}

async def main():
    async for m in query(prompt=prompts(), options=options):
        record(m)
        if isinstance(m, ResultMessage): print(m.subtype, m.total_cost_usd)
anyio.run(main)
