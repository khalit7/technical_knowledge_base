"""The same evaluation job exposed the MCP way: team B publishes its building blocks as tools and team A's agent drives
them step by step. Official Python SDK (mcp 2.3.0). Scripted: the scores are the same made-up numbers as eval_agent.py.
  python mcp_eval_server.py PORT     Streamable HTTP on 127.0.0.1:PORT/mcp"""
import sys
import anyio
from mcp.server import MCPServer
from mcp_types import ToolAnnotations

mcp = MCPServer("team-b-eval-tools", version="1.4.0", instructions="Building blocks for evaluating a checkpoint.")
SHARDS = {"gsm-mini": [0.58, 0.63, 0.61], "mmlu-mini": [0.71, 0.69, 0.74]}


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
def list_suites() -> list[str]:
    """List the held-out suites team B can run."""
    return list(SHARDS)


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
async def load_checkpoint(checkpoint: str) -> dict:
    """Load a checkpoint onto team B's eval workers; returns a handle for run_shard."""
    await anyio.sleep(0.05)
    return {"handle": f"h-{checkpoint}", "shards_per_suite": 3}


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
async def run_shard(handle: str, suite: str, shard: int) -> dict:
    """Run one shard (1-based) of a suite on a loaded checkpoint; returns that shard's accuracy."""
    await anyio.sleep(0.15)
    return {"suite": suite, "shard": shard, "accuracy": SHARDS[suite][shard - 1]}


if __name__ == "__main__":
    mcp.run("streamable-http", host="127.0.0.1", port=int(sys.argv[1]))
