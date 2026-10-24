"""Client side of the compatibility experiment on mcp 2.3.0: python compat_client2.py MODE SERVER_CMD...
MODE: 2026-07-28 (modern-only client), auto (dual-era), legacy. Prints one JSON line: outcome."""
import asyncio, json, sys, time
from mcp import Client, StdioServerParameters
mode, cmd = sys.argv[1], sys.argv[2:]


async def main():
    t = time.perf_counter()
    try:
        async with Client(StdioServerParameters(command=cmd[0], args=cmd[1:]), mode=mode, read_timeout_seconds=4, cache=None) as c:
            r = await c.call_tool("list_checkpoints", {"run": "llama-7b-sft"})
            out = {"ok": not r.is_error, "version": c.protocol_version, "detail": (r.content[0].text if r.content else "")[:120]}
    except BaseException as e:
        while isinstance(e, BaseExceptionGroup) and len(e.exceptions) == 1:
            e = e.exceptions[0]
        out = {"ok": False, "version": None, "detail": f"{type(e).__name__}: {e}"[:300]}
    out["ms"] = round((time.perf_counter() - t) * 1000)
    print(json.dumps(out))

asyncio.run(main())
