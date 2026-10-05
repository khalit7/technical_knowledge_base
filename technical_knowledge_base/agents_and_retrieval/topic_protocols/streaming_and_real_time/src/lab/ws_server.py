"""WebSocket side of the lab, with the `websockets` library (asyncio server).

Usage: python ws_server.py <port> [origin-checked port]
  ws://127.0.0.1:<port>/tokens   the running answer as 7 text messages (same JSON as the SSE events),
                                 then echoes whatever the client sends until it closes
  ws://127.0.0.1:<port>/idle     sends message_start, then is silent for 6 s, then the rest
  same paths on the second port, which only accepts Origin: https://chat.example (403 otherwise)
Automatic pings are off (ping_interval=None) so the recordings show only what the scripts send.
"""
import asyncio, contextlib, sys
from websockets.asyncio.server import serve

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from lab_server import schedule


async def handler(ws):
    path = ws.request.path.split("?")[0]
    sched = schedule()
    loop = asyncio.get_running_loop(); t0 = loop.time()
    for k, (off, name, data) in enumerate(sched):
        if path == "/idle" and k == 1:
            await asyncio.sleep(6)
            t0 = loop.time() - off
        d = off - (loop.time() - t0)
        if d > 0:
            await asyncio.sleep(d)
        await ws.send(data)
    async for m in ws:          # echo until the client closes
        await ws.send(m)


async def main():
    port = int(sys.argv[1])
    servers = [serve(handler, "127.0.0.1", port, ping_interval=None, compression=None)]
    if len(sys.argv) > 2:
        servers.append(serve(handler, "127.0.0.1", int(sys.argv[2]), ping_interval=None, compression=None,
                             origins=["https://chat.example"]))
    async with contextlib.AsyncExitStack() as st:
        for s in servers:
            await st.enter_async_context(s)
        await asyncio.Future()

asyncio.run(main())
