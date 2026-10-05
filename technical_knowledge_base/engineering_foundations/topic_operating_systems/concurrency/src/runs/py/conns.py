"""Section 9: 2,000 open connections, served by one thread each or by one asyncio event loop.
Each connection is one end of a Unix socket pair; the other end plays the client. The server side waits for a
byte and echoes it. We measure memory and threads while all 2,000 wait, then one round in which every client
sends a byte and waits for the echo. Usage: python3 conns.py <threads|asyncio> [connections]"""
import asyncio, os, socket, sys, threading, time

mode, K = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 2000


def status():
    d = dict(l.split(":", 1) for l in open("/proc/self/status"))
    return int(d["VmRSS"].split()[0]) // 1024, int(d["VmSize"].split()[0]) // 1024, int(d["Threads"])


pairs = [socket.socketpair() for _ in range(K)]
base_rss = status()[0]
t0 = time.perf_counter()
if mode == "threads":
    def serve(s):
        while True:
            b = s.recv(1)
            if not b:
                return
            s.sendall(b)
    ts = [threading.Thread(target=serve, args=(srv,), daemon=True) for srv, _ in pairs]
    for t in ts:
        t.start()
    setup = time.perf_counter() - t0
    time.sleep(0.5)
    rss, vsz, nthr = status()
    t1 = time.perf_counter()
    for _, cli in pairs:
        cli.sendall(b"x")
    for _, cli in pairs:
        cli.recv(1)
    rnd = time.perf_counter() - t1
else:
    async def main():
        loop = asyncio.get_running_loop()

        async def serve(s):
            s.setblocking(False)
            while True:
                b = await loop.sock_recv(s, 1)
                if not b:
                    return
                await loop.sock_sendall(s, b)
        tasks = [asyncio.create_task(serve(srv)) for srv, _ in pairs]
        await asyncio.sleep(0)
        setup = time.perf_counter() - t0
        await asyncio.sleep(0.5)
        rss, vsz, nthr = status()
        t1 = time.perf_counter()
        for _, cli in pairs:
            cli.setblocking(False)
            cli.send(b"x")
        for _, cli in pairs:
            await loop.sock_recv(cli, 1)
        rnd = time.perf_counter() - t1
        for _, cli in pairs:
            cli.close()
        await asyncio.gather(*tasks, return_exceptions=True)
        return setup, rss, vsz, nthr, rnd
    setup, rss, vsz, nthr, rnd = asyncio.run(main())
print(f"mode {mode} connections {K} threads {nthr} rss_MiB {rss} rss_added_MiB {rss - base_rss} vsz_MiB {vsz} "
      f"setup_ms {setup * 1e3:.0f} round_ms {rnd * 1e3:.1f}")
