"""Shared pieces for the fsdk recordings: the four task tools as an in-process MCP server,
a message recorder, and the task text. The tool bodies are the frameworks root's (same/code/tools_impl.py)."""
import dataclasses, json, os, sys, time
sys.path.insert(0, os.environ["ROOT_CODE"])
import tools_impl as T
from claude_agent_sdk import tool, create_sdk_mcp_server

TASK, SYSTEM = T.TASK, T.SYSTEM
NO_EMDASH = " Never use the em-dash character."
BUNDLED = os.path.join(os.path.dirname(__import__("claude_agent_sdk").__file__), "_bundled", "claude")

def text(s, err=False):
    d = {"content": [{"type": "text", "text": s}]}
    if err: d["is_error"] = True
    return d

@tool("list_files", "List every file in the repository.", {})
async def list_files(args): return text(T.list_files())
@tool("read_file", "Return the text of one file.", {"path": str})
async def read_file(args): return text(T.read_file(args["path"]))
@tool("edit_file", "Replace the exact text old with new in a file; old must occur exactly once.",
      {"path": str, "old": str, "new": str})
async def edit_file(args): return text(T.edit_file(args["path"], args["old"], args["new"]))
@tool("run_tests", "Run the test suite and return its output.", {})
async def run_tests(args): return text(T.run_tests())

def repo_server():
    return create_sdk_mcp_server("repo", tools=[list_files, read_file, edit_file, run_tests])
TOOL_NAMES = [f"mcp__repo__{n}" for n in ("list_files", "read_file", "edit_file", "run_tests")]

T0 = time.time()
def record(message, extra=None):
    path = os.environ.get("SDK_LOG")
    if not path: return
    d = dataclasses.asdict(message) if dataclasses.is_dataclass(message) else {"repr": repr(message)}
    d["_type"] = type(message).__name__
    d["_t"] = round(time.time() - T0, 3)
    if extra: d.update(extra)
    with open(path, "a") as f: f.write(json.dumps(d, default=str) + "\n")

def note(kind, **kw):
    """Append an event from our own callbacks (hook or permission) to $SDK_LOG."""
    path = os.environ.get("SDK_LOG")
    if not path: return
    with open(path, "a") as f:
        f.write(json.dumps({"_type": "callback", "kind": kind, "_t": round(time.time() - T0, 3), **kw}, default=str) + "\n")

def wire_options():
    """cli_path and env so the CLI runs through wire.py (logs stdin/stdout)."""
    return dict(cli_path=os.environ["WIRE_PY"]) if os.environ.get("WIRE_LOG") else {}
