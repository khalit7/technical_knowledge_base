"""The legacy-only column: the same list_checkpoints tool on the last 1.x Python SDK (mcp 1.30.0, protocol 2025-11-25)."""
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("legacy-only")


@mcp.tool()
def list_checkpoints(run: str) -> str:
    """List checkpoints of a run."""
    return "llama-7b-step-1000, llama-7b-step-2000, llama-7b-step-3000"


if __name__ == "__main__":
    mcp.run("stdio")
