"""Minimal HTTP/3 client (aioquic) for the Wire Lab request.
Prints the response and a JSON timing line; writes a qlog (QUIC event log) if --qlog DIR is given.
Usage: python h3_client.py --ca ca.pem [--qlog DIR] [--port 8443] [--runs N] [--resume [--early]] [--json] [--out f.json]
--resume: after each cold connection, reconnect with its session ticket; --early: send the request as 0-RTT early data.
"""
import argparse, asyncio, json, ssl, time, os
from aioquic.asyncio import connect
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.h3.connection import H3_ALPN, H3Connection
from aioquic.h3.events import HeadersReceived, DataReceived
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.logger import QuicFileLogger

HERE = os.path.dirname(os.path.abspath(__file__))

class Client(QuicConnectionProtocol):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.h3 = H3Connection(self._quic); self.done = asyncio.Event(); self.t0 = None
        self.headers = None; self.chunks = []
    def quic_event_received(self, ev):
        for e in self.h3.handle_event(ev):
            now = time.perf_counter()
            if isinstance(e, HeadersReceived):
                self.headers = (now, e.headers)
            elif isinstance(e, DataReceived):
                if e.data: self.chunks.append((now, e.data))
                if e.stream_ended: self.done.set()

TICKETS = []


async def once(a, ticket=None, label="cold"):
    cfg = QuicConfiguration(is_client=True, alpn_protocols=H3_ALPN, server_name="api.llm.test")
    if ticket: cfg.session_ticket = ticket
    cfg.load_verify_locations(a.ca)
    if a.qlog: os.makedirs(a.qlog, exist_ok=True); cfg.quic_logger = QuicFileLogger(a.qlog)
    body = open(os.path.join(HERE, "request.json"), "rb").read()
    t0 = time.perf_counter()
    async with connect("127.0.0.1", a.port, configuration=cfg, create_protocol=Client,
                       session_ticket_handler=TICKETS.append, wait_connected=not (ticket and a.early)) as c:
        t_conn = time.perf_counter()
        sid = c._quic.get_next_available_stream_id()
        c.h3.send_headers(sid, [(b":method", b"POST"), (b":scheme", b"https"), (b":authority", b"api.llm.test:8443"),
            (b":path", b"/v1/messages"), (b"content-type", b"application/json"), (b"x-api-key", b"sk-wirelab-not-a-real-key"),
            (b"content-length", str(len(body)).encode())])
        c.h3.send_data(sid, body, end_stream=True); c.transmit()
        await asyncio.wait_for(c.done.wait(), 10)
        hdr_t, hdrs = c.headers
        if not a.json:
            print("\n".join(f"{k.decode()}: {v.decode()}" for k, v in hdrs)); print()
            print(b"".join(d for _, d in c.chunks).decode(), end="")
        ms = lambda t: round((t - t0) * 1000, 3)
        buf = b""; first = last = None
        for t, d in c.chunks:
            buf += d; n = buf.count(b'"type":"text_delta"')
            if n and first is None: first = ms(t)
            if n == 5 and last is None: last = ms(t)
        tls = c._quic.tls
        r = {"proto": "h3", "label": label, "connect_ms": ms(t_conn), "headers_ms": ms(hdr_t), "first_token_ms": first, "last_token_ms": last,
             "chunks_ms": [ms(t) for t, _ in c.chunks], "total_ms": ms(time.perf_counter()),
             "resumed": bool(getattr(tls, "session_resumed", False)), "early_data_accepted": bool(getattr(tls, "early_data_accepted", False))}
        print(json.dumps(r)); return r


async def main(a):
    out = []
    for i in range(a.runs):
        out.append(await once(a))
        if a.resume:
            out.append(await once(a, TICKETS[-1] if TICKETS else None, "resumed" + ("+0rtt" if a.early else "")))
    if a.out: json.dump({"runs": out}, open(a.out, "w"), indent=1)

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--ca", required=True); p.add_argument("--qlog"); p.add_argument("--port", type=int, default=8443)
    p.add_argument("--runs", type=int, default=1); p.add_argument("--resume", action="store_true"); p.add_argument("--early", action="store_true")
    p.add_argument("--json", action="store_true", help="print only the JSON timing lines"); p.add_argument("--out")
    asyncio.run(main(p.parse_args()))
