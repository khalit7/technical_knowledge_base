"""Head-of-line blocking experiment: three copies of the Wire Lab request, sent 10 ms apart,
over HTTP/1.1 (one keep-alive connection: requests wait their turn), HTTP/2 (three streams on
one TCP connection) or HTTP/3 (three streams on one QUIC connection). Records when each token of
each answer reaches the application. Run it through netem.py to add delay and one loss.

Usage: python hol_client.py --proto h1|h2|h3 --port P --ca ca.pem --out file.json [--qlog DIR]
"""
import argparse, asyncio, json, os, select, ssl, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wire_client import Conn, make_ctx, BODY

N, STAGGER = 3, 0.010
HDRS = lambda port: [(":method", "POST"), (":scheme", "https"), (":authority", "api.llm.test:%d" % port), (":path", "/v1/messages"),
                     ("content-type", "application/json"), ("x-api-key", "sk-wirelab-not-a-real-key"), ("content-length", str(len(BODY)))]


class Tok:
    """Per-request token arrival times, from the decrypted SSE bytes."""
    def __init__(self, t0):
        self.t0, self.buf, self.times, self.sent = t0, {i: b"" for i in range(N)}, {i: [] for i in range(N)}, {}
    def feed(self, i, data):
        self.buf[i] += data
        n = self.buf[i].count(b'"type":"text_delta"')
        while len(self.times[i]) < n:
            self.times[i].append(round((time.perf_counter() - self.t0) * 1000, 3))
    def done(self, i):
        return b"message_stop" in self.buf[i]


def run_tcp(a):
    import h2.connection, h2.config, h2.events
    a.tls, a.sni = None, "api.llm.test"
    ctx = make_ctx(a); c = Conn(a, ctx); t0 = time.perf_counter(); tk = Tok(t0)
    ms = lambda: round((time.perf_counter() - t0) * 1000, 3)
    setup = {"tcp_ms": c.ev["tcp_ms"], "tls_ms": c.ev["tls_ms"], "alpn": c.ev["alpn"]}
    if a.proto == "h1":
        for i in range(N):
            tk.sent[i] = ms()
            req = (b"POST /v1/messages HTTP/1.1\r\nHost: api.llm.test\r\ncontent-type: application/json\r\n"
                   b"x-api-key: sk-wirelab-not-a-real-key\r\ncontent-length: " + str(len(BODY)).encode() + b"\r\n\r\n" + BODY)
            c.write(req)
            while not tk.buf[i].endswith(b"\r\n0\r\n\r\n"):
                tk.feed(i, c.read())
        return setup, tk
    h = h2.connection.H2Connection(h2.config.H2Configuration(client_side=True, header_encoding="utf-8"))
    h.initiate_connection(); c.write(h.data_to_send())
    sids, nxt = {}, 0; t_next = time.perf_counter()
    while not all(tk.done(i) for i in range(N)):
        now = time.perf_counter()
        if nxt < N and now >= t_next:
            sid = h.get_next_available_stream_id(); sids[sid] = nxt; tk.sent[nxt] = ms()
            h.send_headers(sid, HDRS(a.port)); h.send_data(sid, BODY, end_stream=True); c.write(h.data_to_send())
            nxt += 1; t_next = now + STAGGER; continue
        try:
            d = c.tls.read(65536)
        except ssl.SSLWantReadError:
            wait = max(0, t_next - time.perf_counter()) if nxt < N else 5
            r, _, _ = select.select([c.sock], [], [], wait)
            if r: c.recv()
            continue
        for e in h.receive_data(d):
            if isinstance(e, h2.events.DataReceived):
                h.acknowledge_received_data(e.flow_controlled_length, e.stream_id); tk.feed(sids[e.stream_id], e.data)
        o = h.data_to_send()
        if o: c.write(o)
    return setup, tk


async def run_h3(a):
    from aioquic.asyncio import connect
    from aioquic.asyncio.protocol import QuicConnectionProtocol
    from aioquic.h3.connection import H3_ALPN, H3Connection
    from aioquic.h3.events import DataReceived
    from aioquic.quic.configuration import QuicConfiguration
    from aioquic.quic.logger import QuicFileLogger
    holder = {}
    class P(QuicConnectionProtocol):
        def __init__(s, *x, **k):
            super().__init__(*x, **k); s.h3 = H3Connection(s._quic); s.ev = asyncio.Event()
        def quic_event_received(s, ev):
            for e in s.h3.handle_event(ev):
                if isinstance(e, DataReceived) and e.data:
                    holder["tk"].feed(holder["sids"][e.stream_id], e.data)
                    if all(holder["tk"].done(i) for i in range(N)): s.ev.set()
    cfg = QuicConfiguration(is_client=True, alpn_protocols=H3_ALPN, server_name="api.llm.test"); cfg.load_verify_locations(a.ca)
    if a.qlog: os.makedirs(a.qlog, exist_ok=True); cfg.quic_logger = QuicFileLogger(a.qlog)
    t_start = time.perf_counter()
    async with connect("127.0.0.1", a.port, configuration=cfg, create_protocol=P) as c:
        t0 = time.perf_counter(); tk = Tok(t0); holder["tk"] = tk; holder["sids"] = {}
        setup = {"quic_handshake_ms": round((t0 - t_start) * 1000, 3), "alpn": "h3"}
        for i in range(N):
            sid = c._quic.get_next_available_stream_id(); holder["sids"][sid] = i; tk.sent[i] = round((time.perf_counter() - t0) * 1000, 3)
            c.h3.send_headers(sid, [(k.encode(), v.encode()) for k, v in HDRS(a.port)]); c.h3.send_data(sid, BODY, end_stream=True); c.transmit()
            await asyncio.sleep(STAGGER)
        await asyncio.wait_for(c.ev.wait(), 15)
        setup["stream_ids"] = {str(k): v for k, v in holder["sids"].items()}
    return setup, tk


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--proto", required=True); p.add_argument("--port", type=int, required=True); p.add_argument("--ca", required=True)
    p.add_argument("--host", default="127.0.0.1"); p.add_argument("--out"); p.add_argument("--qlog"); p.add_argument("--label", default="")
    a = p.parse_args()
    setup, tk = asyncio.run(run_h3(a)) if a.proto == "h3" else run_tcp(a)
    out = {"proto": a.proto, "label": a.label, "setup": setup, "sent_ms": tk.sent, "token_ms": tk.times, "epoch_t0": time.time() - (time.perf_counter() - tk.t0)}
    if a.out: json.dump(out, open(a.out, "w"), indent=1)
    print(json.dumps({"proto": a.proto, "sent": tk.sent, "tokens": tk.times}))


if __name__ == "__main__":
    main()
