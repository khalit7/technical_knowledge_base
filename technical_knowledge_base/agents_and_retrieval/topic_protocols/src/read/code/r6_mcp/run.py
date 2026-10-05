"""One tool call through host, client and server, every HTTP exchange recorded byte for byte.
A logging TCP proxy sits between the MCP client (in this 'host' process) and server.py, so the log is
exactly what crossed the wire. The host then builds the next request it would send to the model, in the
Messages API shape, to show where the tool's text lands: inside the model's context.
No model is called. Usage: python run.py <server_port> <proxy_port> <out.json>"""
import asyncio, json, subprocess, sys, time, os
from mcp import Client

SP, PP, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
log = []


async def pipe(r, w, direction, buf):
    while True:
        d = await r.read(65536)
        if not d:
            break
        buf.append((direction, d)); w.write(d); await w.drain()
    w.close()


async def handle(cr, cw):
    sr, sw = await asyncio.open_connection("127.0.0.1", SP)
    buf = []
    await asyncio.gather(pipe(cr, sw, "client->server", buf), pipe(sr, cw, "server->client", buf))
    log.append(b"".join(d for k, d in buf if k == "client->server").decode(errors="replace"))
    log.append(b"".join(d for k, d in buf if k == "server->client").decode(errors="replace"))


async def main():
    srv = subprocess.Popen([sys.executable, os.path.join(os.path.dirname(__file__), "server.py"), str(SP)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    proxy = await asyncio.start_server(handle, "127.0.0.1", PP)
    for _ in range(50):
        try:
            r, w = await asyncio.open_connection("127.0.0.1", SP); w.close(); break
        except OSError:
            await asyncio.sleep(0.1)
    user = "Summarise the release notes at https://docs.llm.test/notes"
    async with Client(f"http://127.0.0.1:{PP}/mcp") as client:
        tools = await client.list_tools()
        res = await client.call_tool("fetch_page", {"url": "https://docs.llm.test/notes"})
    text = res.content[0].text
    # What the host sends to the model next (Messages API shape): the tool's text becomes part of the context.
    next_request = {"model": "any-model", "max_tokens": 1024,
                    "tools": [{"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools.tools],
                    "messages": [{"role": "user", "content": user},
                                 {"role": "assistant", "content": [{"type": "tool_use", "id": "toolu_01", "name": "fetch_page", "input": {"url": "https://docs.llm.test/notes"}}]},
                                 {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "toolu_01", "content": text}]}]}
    await asyncio.sleep(0.3)
    proxy.close(); srv.terminate()
    import mcp
    json.dump({"sdk": "mcp (Python) " + __import__("importlib.metadata").metadata.version("mcp"), "http": log, "host_next_model_request": next_request},
              open(OUT, "w"), indent=1)
    for x in log:
        print("-----"); print(x[:1500])


asyncio.run(main())
