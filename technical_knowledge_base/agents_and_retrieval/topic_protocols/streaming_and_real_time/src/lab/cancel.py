"""What the server does after the user presses Stop (the client closes the stream).

Usage: python cancel.py <base url>
Four runs against lab_server.py: abort during a 3 s "think" (before the first token) or after 0.5 s of
tokens (200 tokens, 20 ms apart), with a naive handler and a careful one (careful=1 checks every 20 ms
whether the connection is closing). The server log says how long it kept working and how many
events it wrote after nobody was listening.
"""
import asyncio, json, sys, time
import httpx

BASE = sys.argv[1]


async def abort_after(tag, q, secs):
    """Open the stream, read for `secs`, then close the connection."""
    async with httpx.AsyncClient(timeout=30) as c:
        await c.post(f"{BASE}/log/clear")
    c = httpx.AsyncClient(timeout=30)
    t0 = time.monotonic(); got = 0
    cm = c.stream("POST", f"{BASE}/v1/messages?tag={tag}&{q}", content=b"{}")
    r = await cm.__aenter__()

    async def reader():
        nonlocal got
        async for chunk in r.aiter_raw():
            got += chunk.count(b"\n\n")
    task = asyncio.create_task(reader())
    await asyncio.sleep(secs)
    task.cancel()
    await r.aclose(); await c.aclose()
    closed = round(time.monotonic() - t0, 3)
    await asyncio.sleep(4.5)
    async with httpx.AsyncClient() as c2:
        log = (await c2.get(f"{BASE}/log")).json()
    work = [x["work"] for x in log if x.get("tag") == tag and "work" in x]
    return {"tag": tag, "query": q, "client_closed_at_s": closed, "events_client_read": got,
            "server": work[0] if work else None}


async def main():
    out = []
    for careful in ("0", "1"):
        out.append(await abort_after(f"think_careful{careful}", f"think=3&n=200&gap=0.02&careful={careful}", 0.5))
        out.append(await abort_after(f"tokens_careful{careful}", f"think=0.1&n=200&gap=0.02&careful={careful}", 0.5))
    print(json.dumps(out, indent=1))

asyncio.run(main())
