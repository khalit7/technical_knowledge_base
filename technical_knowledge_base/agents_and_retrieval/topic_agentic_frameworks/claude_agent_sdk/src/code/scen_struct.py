"""s6_structured: the same task with output_format (a JSON schema). The CLI adds a StructuredOutput tool;
ResultMessage.structured_output carries the parsed object."""
import anyio, sys
from claude_agent_sdk import ClaudeAgentOptions, PermissionResultAllow, ResultMessage, query
from common import TASK, SYSTEM, NO_EMDASH, repo_server, record, note, wire_options
model = sys.argv[1]
SCHEMA = {"type": "object", "additionalProperties": False,
          "required": ["changes", "tests_passing"],
          "properties": {
              "changes": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                          "required": ["file", "function", "bug", "fix"],
                          "properties": {"file": {"type": "string"}, "function": {"type": "string"},
                                         "bug": {"type": "string"}, "fix": {"type": "string"}}}},
              "tests_passing": {"type": "boolean"}}}
async def allow(name, args, ctx):
    note("permission", tool=name, decision="allow"); return PermissionResultAllow()
options = ClaudeAgentOptions(model=model, system_prompt=SYSTEM + NO_EMDASH, mcp_servers={"repo": repo_server()},
    tools=[], can_use_tool=allow, output_format={"type": "json_schema", "schema": SCHEMA},
    max_turns=20, setting_sources=[], strict_mcp_config=True, **wire_options())
async def one():
    yield {"type": "user", "message": {"role": "user", "content": TASK}}
async def main():
    async for m in query(prompt=one(), options=options):
        record(m)
        if isinstance(m, ResultMessage): print(m.subtype, m.total_cost_usd, m.structured_output)
anyio.run(main)
