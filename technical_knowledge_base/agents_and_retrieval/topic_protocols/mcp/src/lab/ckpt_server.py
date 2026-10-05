"""ckpt-tools: an MCP server an ML team might run to let an agent inspect and prune training checkpoints.
Official Python SDK (mcp 2.3.0). The checkpoint table is illustrative; nothing is deleted.
  python ckpt_server.py stdio                 serve on stdin/stdout
  python ckpt_server.py http PORT [json]      Streamable HTTP on 127.0.0.1:PORT/mcp (SSE replies, or JSON)
MCP_STATE_KEY: shared key that seals requestState, so any replica can open what another sealed."""
import os, sys
import anyio
from pydantic import BaseModel
from mcp.server import MCPServer
from mcp.server.mcpserver import Context
from mcp.server.caching import CacheHint
from mcp.server.request_state import RequestStateSecurity
from mcp_types import ElicitRequest, ElicitRequestFormParams, InputRequiredResult, ToolAnnotations

KEY = os.environ.get("MCP_STATE_KEY")
mcp = MCPServer("ckpt-tools", version="1.0.0",
                instructions="Inspect and prune training checkpoints. Deleting asks the user first.",
                cache_hints={"tools/list": CacheHint(ttl_ms=300_000, scope="public")},
                request_state_security=RequestStateSecurity(keys=[KEY.encode()]) if KEY else None)


class Checkpoint(BaseModel):
    name: str
    step: int
    val_loss: float
    size_gb: float


RUNS = {"llama-7b-sft": [Checkpoint(name=f"llama-7b-step-{s}", step=s, val_loss=l, size_gb=13.5)
                         for s, l in [(1000, 1.92), (2000, 1.71), (3000, 1.69)]]}


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True, openWorldHint=False))
def list_checkpoints(run: str) -> list[Checkpoint]:
    """List the saved checkpoints of a training run, oldest first, with validation loss."""
    return RUNS.get(run, [])


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True, openWorldHint=False))
async def evaluate_checkpoint(name: str, ctx: Context) -> dict:
    """Run the held-out eval on one checkpoint (three shards), reporting progress as it goes."""
    for i in range(3):
        await ctx.report_progress(i + 1, 3, f"shard {i + 1} of 3")
        await anyio.sleep(0.05)
    return {"name": name, "shards": 3, "val_loss": 1.69}


class Confirm(BaseModel):
    confirm: bool


@mcp.tool(annotations=ToolAnnotations(destructiveHint=True, idempotentHint=True))
async def delete_checkpoint(name: str, ctx: Context) -> str | InputRequiredResult:
    """Delete one checkpoint by name. Asks the user to confirm first; cannot be undone."""
    if ctx.protocol_version and ctx.protocol_version >= "2026-07-28":
        answer = (ctx.input_responses or {}).get("confirm")
        if answer is None:  # round 1: ask, and keep nothing in server memory
            return InputRequiredResult(
                input_requests={"confirm": ElicitRequest(params=ElicitRequestFormParams(
                    message=f"Delete checkpoint {name}? This cannot be undone.",
                    requested_schema={"type": "object", "properties": {"confirm": {"type": "boolean"}},
                                      "required": ["confirm"]}))},
                request_state=f"delete:{name}")  # the SDK seals this (AES-GCM) before it leaves
        ok = answer.action == "accept" and bool((answer.content or {}).get("confirm"))
    else:  # 2025-11-25 and earlier: a request back to the client over the session's open stream
        r = await ctx.elicit(f"Delete checkpoint {name}? This cannot be undone.", Confirm)
        ok = r.action == "accept" and r.data.confirm
    return f"deleted {name}" if ok else f"kept {name}"


@mcp.resource("ckpt://{run}/config")
def run_config(run: str) -> str:
    """The training config of a run (YAML)."""
    return f"run: {run}\nlr: 3.0e-4\nbatch_tokens: 4194304\nwarmup_steps: 200\n"


@mcp.prompt()
def pick_best(run: str) -> str:
    """Ask the model to choose the checkpoint to keep."""
    return f"List the checkpoints of {run} and recommend which to keep by validation loss."


if __name__ == "__main__":
    if sys.argv[1] == "stdio":
        mcp.run("stdio")
    else:
        mcp.run("streamable-http", host="127.0.0.1", port=int(sys.argv[2]),
                **({"json_response": True} if sys.argv[3:] == ["json"] else {}))
