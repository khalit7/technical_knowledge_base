"""(section 6) What asyncio is built on: run under strace -f -e trace=epoll_create1,epoll_ctl,epoll_pwait,epoll_wait
A tiny server and client on a local socket pair; the event loop asks the kernel which sockets are ready."""
import asyncio


async def main():
    async def handle(r, w):
        data = await r.read(100)
        w.write(data.upper())
        await w.drain()
        w.close()

    srv = await asyncio.start_server(handle, "127.0.0.1", 0)
    port = srv.sockets[0].getsockname()[1]
    r, w = await asyncio.open_connection("127.0.0.1", port)
    w.write(b"batch ready")
    await w.drain()
    print((await r.read(100)).decode())
    w.close()
    srv.close()
    await srv.wait_closed()

asyncio.run(main())
