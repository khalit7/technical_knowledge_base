"""MCP client over stdio (official Python SDK): python mcp_client.py MODE [TOOL ARGS_JSON]
Starts `python mcp_tools.py MODE` (or raw_mcp.py for MODE raw) as a subprocess, initializes, lists tools, optionally calls one, and prints
what the client got, or the error as the client raises it."""
import asyncio, json, sys
from mcp import ClientSession, StdioServerParameters, stdio_client


async def main():
    p = StdioServerParameters(command=sys.executable, args=["raw_mcp.py"] if sys.argv[1] == "raw" else ["mcp_tools.py", sys.argv[1]])
    async with stdio_client(p) as (r, w):
        async with ClientSession(r, w) as s:
            init = await asyncio.wait_for(s.initialize(), 10)
            print("initialized:", init.server_info.name, "protocol", init.protocol_version)
            tools = await s.list_tools()
            print("tools:", [t.name for t in tools.tools])
            if len(sys.argv) > 2:
                res = await asyncio.wait_for(s.call_tool(sys.argv[2], json.loads(sys.argv[3])), 5)
                print("result:", json.dumps([c.model_dump(exclude_none=True) for c in res.content])[:600])

try:
    asyncio.run(main())
except BaseException as e:
    while isinstance(e, BaseExceptionGroup) and len(e.exceptions) == 1:
        e = e.exceptions[0]
    print(f"{type(e).__module__}.{type(e).__qualname__}: {e}" if str(e) else f"{type(e).__module__}.{type(e).__qualname__} (after 5 s)")
