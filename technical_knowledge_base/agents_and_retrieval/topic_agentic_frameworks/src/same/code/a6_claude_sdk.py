"""6. Claude Agent SDK: the Claude Code harness as a library, our four tools as an in-process MCP server."""
import anyio, os
from claude_agent_sdk import (ClaudeAgentOptions, ResultMessage, create_sdk_mcp_server, query, tool)
import tools_impl as T

def text(s):                          # MCP tool results are content blocks.
    return {"content": [{"type": "text", "text": s}]}

# Tool definitions: name, description, input schema given as {arg: type}.
@tool("list_files", "List every file in the repository.", {})
async def list_files(args):
    return text(T.list_files())

@tool("read_file", "Return the text of one file.", {"path": str})
async def read_file(args):
    return text(T.read_file(args["path"]))

@tool("edit_file", "Replace the exact text old with new in a file; old must occur exactly once.",
      {"path": str, "old": str, "new": str})
async def edit_file(args):
    return text(T.edit_file(args["path"], args["old"], args["new"]))

@tool("run_tests", "Run the test suite and return its output.", {})
async def run_tests(args):
    return text(T.run_tests())

repo = create_sdk_mcp_server("repo", tools=[list_files, read_file, edit_file, run_tests])
options = ClaudeAgentOptions(
    model=os.environ.get("CLAUDE_MODEL", "haiku"),
    system_prompt=T.SYSTEM,
    mcp_servers={"repo": repo},
    tools=[],                                   # no built-in tools: only ours
    allowed_tools=[f"mcp__repo__{n}" for n in ("list_files", "read_file", "edit_file", "run_tests")],
    max_turns=15, setting_sources=[], strict_mcp_config=True)

# The loop, state and stopping live in the Claude Code process the SDK starts.
async def main():
    async for message in query(prompt=T.TASK, options=options):
        T.record(message)                       # recording only, for the page
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
