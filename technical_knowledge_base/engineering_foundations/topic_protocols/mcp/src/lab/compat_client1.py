"""Client side of the compatibility experiment on the last 1.x SDK (mcp 1.30.0): a real legacy client."""
import asyncio, json, sys, time
from datetime import timedelta
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
cmd = sys.argv[1:]


async def main():
    t = time.perf_counter()
    try:
        async with stdio_client(StdioServerParameters(command=cmd[0], args=cmd[1:])) as (r, w):
            async with ClientSession(r, w, read_timeout_seconds=timedelta(seconds=4)) as s:
                init = await s.initialize()
                res = await s.call_tool("list_checkpoints", {"run": "llama-7b-sft"})
                out = {"ok": not res.isError, "version": init.protocolVersion, "detail": (res.content[0].text if res.content else "")[:120]}
    except BaseException as e:
        while isinstance(e, BaseExceptionGroup) and len(e.exceptions) == 1:
            e = e.exceptions[0]
        out = {"ok": False, "version": None, "detail": f"{type(e).__name__}: {e}"[:300]}
    out["ms"] = round((time.perf_counter() - t) * 1000)
    print(json.dumps(out))

asyncio.run(main())
