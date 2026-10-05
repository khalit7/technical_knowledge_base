"""A real HTTP fan-out against a local server, standard library only.
The server answers GET /delay/<ms> after <ms> milliseconds (like a slow model API).
The client opens a TCP connection per request with asyncio.open_connection."""
import asyncio, time

async def handle(reader, writer):              # one coroutine per incoming connection
    request_line = (await reader.readline()).decode()
    while (await reader.readline()) not in (b"\r\n", b""):
        pass                                   # skip headers
    ms = int(request_line.split()[1].rsplit("/", 1)[1])
    await asyncio.sleep(ms / 1000)
    body = f"slept {ms} ms".encode()
    writer.write(b"HTTP/1.1 200 OK\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s" % (len(body), body))
    await writer.drain()
    writer.close()

async def get(port, path):
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    writer.write(f"GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode())
    await writer.drain()
    raw = await reader.read()                  # read until the server closes
    writer.close()
    await writer.wait_closed()
    return raw.split(b"\r\n\r\n", 1)[1].decode()

async def main():
    server = await asyncio.start_server(handle, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    delays = [100] * 20                        # 20 calls of 100 ms each

    t0 = time.perf_counter()
    for d in delays:
        await get(port, f"/delay/{d}")         # one after another
    print(f"sequential, 20 calls      {time.perf_counter() - t0:6.3f} s")

    t0 = time.perf_counter()
    bodies = await asyncio.gather(*(get(port, f"/delay/{d}") for d in delays))
    print(f"gather, 20 at once        {time.perf_counter() - t0:6.3f} s   {bodies[0]!r}")

    limit = asyncio.Semaphore(5)               # at most 5 in flight: be polite to the API
    async def polite(d):
        async with limit:
            return await get(port, f"/delay/{d}")
    t0 = time.perf_counter()
    await asyncio.gather(*(polite(d) for d in delays))
    print(f"gather, at most 5 at once {time.perf_counter() - t0:6.3f} s")

    t0 = time.perf_counter()
    async with asyncio.TaskGroup() as tg:      # 3.11+: same speed, and cancels siblings on failure
        tasks = [tg.create_task(get(port, f"/delay/{d}")) for d in delays]
    print(f"TaskGroup, 20 at once     {time.perf_counter() - t0:6.3f} s   {len(tasks)} results")

    t0 = time.perf_counter()
    try:
        async with asyncio.timeout(0.25):      # one slow call (2 s) with a 250 ms budget
            await get(port, "/delay/2000")
    except TimeoutError:
        print(f"timeout after             {time.perf_counter() - t0:6.3f} s")

    server.close()
    await server.wait_closed()

asyncio.run(main())
