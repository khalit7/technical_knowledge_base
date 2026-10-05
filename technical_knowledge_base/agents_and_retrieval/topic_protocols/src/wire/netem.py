"""Userspace network emulator for the Wire Lab: a TCP proxy and a UDP proxy that add a fixed
one-way delay in each direction, and can simulate one lost packet.

No root is needed, which is the point: macOS gives no dummynet or tc without sudo.

TCP (--tcp LISTEN:UPSTREAM): bytes are forwarded in order, each chunk delayed by --delay-ms.
  A TCP proxy cannot drop a segment (the kernels on both sides would retransmit it invisibly),
  so a loss is simulated by what the receiving application sees under TCP's in-order delivery:
  with --hold-at-ms T --hold-ms H, the first server-to-client chunk read at least T ms after the
  first client byte (or the --hold-index-th server-to-client chunk) is held for H extra ms, and every byte behind it waits too. That is
  head-of-line blocking exactly as TCP produces it after a loss, with H standing for the time to
  detect and retransmit the lost segment.
UDP (--udp LISTEN:UPSTREAM): datagrams delayed by --delay-ms; with --drop-at-ms T the first
  server-to-client datagram arriving at least T ms after the first client datagram (or the
  --drop-index-th one) is really
  dropped, and QUIC's own loss recovery has to resend what it carried.
--match-bytes N picks the first server-to-client chunk or datagram of exactly N bytes instead: the
  encrypted size gives away which token it carries (sizes differ with the token's length), which
  makes the lost packet the same piece of data in every run.
Every chunk or datagram is logged to --log (JSON lines): t_ms, dir, bytes, held/dropped.
"""
import argparse, asyncio, json, time

T0 = None


def now_ms():
    return (time.perf_counter() - T0) * 1000 if T0 else 0.0


class Log:
    def __init__(self, path):
        self.f = open(path, "a") if path else None

    def __call__(self, **kw):
        if self.f:
            self.f.write(json.dumps(kw) + "\n"); self.f.flush()


async def tcp_pipe(reader, writer, delay, d, log, st, a):
    """Forward reader->writer, each chunk released at max(arrival + delay, previous release)."""
    global T0
    last = 0.0; loop = asyncio.get_running_loop()
    while True:
        data = await reader.read(65536)
        if not data:
            break
        if T0 is None and d == "c2s":
            T0 = time.perf_counter()
        arr = loop.time(); extra = 0.0; held = False
        if d == "s2c":
            st["n"] = st.get("n", 0) + 1
        hit = (len(data) == a.match_bytes) if a.match_bytes else (st.get("n") == a.hold_index) if a.hold_index else (T0 and now_ms() >= a.hold_at_ms)
        if d == "s2c" and a.hold_ms and not st["held"] and hit:
            st["held"] = True; held = True; extra = a.hold_ms / 1000
        rel = max(arr + delay + extra, last + 1e-6); last = rel
        log(t_ms=round(now_ms(), 3), epoch=time.time(), dir=d, idx=st.get("n") if d == "s2c" else None, bytes=len(data), held=held, release_ms=round(now_ms() + (rel - arr) * 1000, 3))
        loop.call_at(rel, lambda b=data: (writer.write(b)))
    await asyncio.sleep(delay + 0.01 + (a.hold_ms or 0) / 1000)
    try:
        writer.close()
    except Exception:
        pass


async def tcp_proxy(a, log):
    lh, lp, uh, up = parse(a.tcp)
    st = {"held": False}
    async def handle(cr, cw):
        sr, sw = await asyncio.open_connection(uh, up)
        for s in (cw.get_extra_info("socket"), sw.get_extra_info("socket")):
            import socket as so; s.setsockopt(so.IPPROTO_TCP, so.TCP_NODELAY, 1)
        await asyncio.gather(tcp_pipe(cr, sw, a.delay_ms / 1000, "c2s", log, st, a),
                             tcp_pipe(sr, cw, a.delay_ms / 1000, "s2c", log, st, a))
    srv = await asyncio.start_server(handle, lh, lp)
    async with srv:
        await srv.serve_forever()


class UpProto(asyncio.DatagramProtocol):
    def __init__(self, down, caddr, a, log, st):
        self.down, self.caddr, self.a, self.log, self.st = down, caddr, a, log, st

    def datagram_received(self, data, addr):
        loop = asyncio.get_running_loop(); dropped = False
        self.st["n"] = self.st.get("n", 0) + 1
        hit = (len(data) == self.a.match_bytes) if self.a.match_bytes else (self.st["n"] == self.a.drop_index) if self.a.drop_index else (self.a.drop_at_ms and T0 and now_ms() >= self.a.drop_at_ms)
        if hit and not self.st["dropped"]:
            self.st["dropped"] = True; dropped = True
        self.log(t_ms=round(now_ms(), 3), epoch=time.time(), dir="s2c", idx=self.st["n"], bytes=len(data), dropped=dropped)
        if not dropped:
            loop.call_later(self.a.delay_ms / 1000, self.down.sendto, data, self.caddr)


class DownProto(asyncio.DatagramProtocol):
    def __init__(self, a, log):
        self.a, self.log, self.ups, self.st = a, log, {}, {"dropped": False}

    def connection_made(self, tr):
        self.tr = tr

    def datagram_received(self, data, addr):
        global T0
        if T0 is None:
            T0 = time.perf_counter()
        loop = asyncio.get_running_loop()
        self.log(t_ms=round(now_ms(), 3), epoch=time.time(), dir="c2s", bytes=len(data), dropped=False)
        async def go():
            if addr not in self.ups:
                _, uh, up = None, *parse(self.a.udp)[2:]
                tr, _ = await loop.create_datagram_endpoint(lambda: UpProto(self.tr, addr, self.a, self.log, self.st), remote_addr=(uh, up))
                self.ups[addr] = tr
            await asyncio.sleep(self.a.delay_ms / 1000)
            self.ups[addr].sendto(data)
        loop.create_task(go())


def parse(spec):
    l, u = spec.split(":", 1)
    lh, lp = ("127.0.0.1", int(l)); uh, up = ("127.0.0.1", int(u))
    return lh, lp, uh, up


async def main(a):
    log = Log(a.log)
    if a.tcp:
        await tcp_proxy(a, log)
    else:
        lh, lp, _, _ = parse(a.udp)
        await asyncio.get_running_loop().create_datagram_endpoint(lambda: DownProto(a, log), local_addr=(lh, lp))
        await asyncio.Event().wait()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--tcp"); p.add_argument("--udp"); p.add_argument("--delay-ms", type=float, default=25)
    p.add_argument("--hold-at-ms", type=float, default=0); p.add_argument("--hold-ms", type=float, default=0)
    p.add_argument("--drop-at-ms", type=float, default=0)
    p.add_argument("--match-bytes", type=int, default=0); p.add_argument("--hold-index", type=int, default=0); p.add_argument("--drop-index", type=int, default=0); p.add_argument("--log")
    asyncio.run(main(p.parse_args()))
