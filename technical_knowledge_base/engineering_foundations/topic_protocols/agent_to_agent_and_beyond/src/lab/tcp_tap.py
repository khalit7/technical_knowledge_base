"""Raw TCP tap: forwards 127.0.0.1:LISTEN to 127.0.0.1:TARGET and keeps every byte per connection (module, used by transports.py)."""
import asyncio, time

class Tap:
    def __init__(self, listen, target):
        self.listen, self.target, self.conns, self.server, self.events = listen, target, [], None, []

    async def _pipe(self, r, w, buf, tag):
        try:
            while d := await r.read(65536):
                buf.append(d); self.events.append((time.perf_counter(), tag, d)); w.write(d); await w.drain()
        except Exception:
            pass
        finally:
            w.close()

    async def _handle(self, cr, cw):
        sr, sw = await asyncio.open_connection("127.0.0.1", self.target)
        c = {"up": [], "down": []}; self.conns.append(c)
        n = len(self.conns) - 1
        await asyncio.gather(self._pipe(cr, sw, c["up"], (n, "up")), self._pipe(sr, cw, c["down"], (n, "down")))

    async def start(self):
        self.server = await asyncio.start_server(self._handle, "127.0.0.1", self.listen)

    def reset(self):
        for c in self.conns:
            c["up"].clear(); c["down"].clear()
        self.events = []

    def totals(self):
        up = sum(len(b) for c in self.conns for b in c["up"]); down = sum(len(b) for c in self.conns for b in c["down"])
        return up, down, len(self.conns)

    def text(self):
        return [{"up": b"".join(c["up"]).decode(errors="replace"), "down": b"".join(c["down"]).decode(errors="replace")} for c in self.conns]

    def ordered(self):
        """Chunks in time order, consecutive chunks of one direction on one connection merged."""
        out = []
        for t, (n, d), b in sorted(self.events, key=lambda e: e[0]):
            if out and out[-1]["conn"] == n and out[-1]["dir"] == d:
                out[-1]["data"] += b.decode(errors="replace")
            else:
                out.append({"t": t, "conn": n, "dir": d, "data": b.decode(errors="replace")})
        t0 = out[0]["t"] if out else 0
        for o in out:
            o["t_ms"] = round((o.pop("t") - t0) * 1000, 2)
        return out

    def raw(self, t0=None):
        """Every read as it happened (not merged), for per-event timing."""
        ev = sorted(self.events, key=lambda e: e[0])
        t0 = t0 if t0 is not None else (ev[0][0] if ev else 0)
        return [{"t_ms": round((t - t0) * 1000, 2), "conn": n, "dir": d, "data": b.decode(errors="replace")} for t, (n, d), b in ev]
