"""Record every HTTP/3 frame of the running request, both directions, as bytes on each QUIC stream.

One QUIC connection (ALPN h3) to the lab server carries request 1, request 2 (same headers), then requests 3 and 4
at once, like frames_h2.py. Outgoing stream bytes are taken from QuicConnection.send_stream_data, incoming from the
StreamDataReceived events before aioquic's H3 layer sees them; this script then splits them into HTTP/3 frames
(RFC 9114 section 7.1: type and length as QUIC variable-length integers) and QPACK field lines (RFC 9204 section 4.5).
Usage: python frames_h3.py <ca.pem> <port> <out.json>
"""
import asyncio, json, os, sys, time
from aioquic.asyncio import connect
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.h3.connection import H3_ALPN, H3Connection
from aioquic.h3.events import DataReceived, HeadersReceived
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import StreamDataReceived

CA, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
BODY = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../src/wire/request.json"), "rb").read()
FT = {0: "DATA", 1: "HEADERS", 3: "CANCEL_PUSH", 4: "SETTINGS", 5: "PUSH_PROMISE", 7: "GOAWAY", 0xD: "MAX_PUSH_ID"}
ST = {0: "control stream", 1: "push stream", 2: "QPACK encoder stream", 3: "QPACK decoder stream"}
SET = {1: "QPACK_MAX_TABLE_CAPACITY", 6: "MAX_FIELD_SECTION_SIZE", 7: "QPACK_BLOCKED_STREAMS", 8: "ENABLE_CONNECT_PROTOCOL",
       0x33: "H3_DATAGRAM", 0xFFD277: "H3_DATAGRAM (draft)", 0x2B603742: "ENABLE_WEBTRANSPORT (draft)", 0xC671706A: "WEBTRANSPORT_MAX_SESSIONS (draft)"}
T0 = time.perf_counter()
frames, bufs, kinds = [], {}, {}


def varint(b, i):
    ln = 1 << (b[i] >> 6)
    v = b[i] & 0x3F
    for k in range(1, ln):
        v = (v << 8) | b[i + k]
    return v, i + ln


def qpack_lines(p):
    """Kinds and byte sizes of the field lines in one encoded field section."""
    ric, i = p[0], 1
    while p[i - 1] == 0xFF:
        i += 1
    i += 1  # base (one byte for small values)
    out = [dict(kind="prefix", note="required insert count %d, base" % ric, bytes=i)]
    def pint(i, prefix):
        m = (1 << prefix) - 1; v = p[i] & m; i += 1
        if v < m: return v, i
        s = 0
        while True:
            c = p[i]; i += 1; v += (c & 0x7F) << s; s += 7
            if not c & 0x80: return v, i
    def pstr(i, prefix):
        h = bool(p[i] & (1 << prefix)); n, i = pint(i, prefix); return n, i + n, h
    while i < len(p):
        s, b = i, p[i]
        if b & 0x80:
            idx, i = pint(i, 6); kind = "indexed, %s table #%d" % ("static" if b & 0x40 else "dynamic", idx)
        elif b & 0x40:
            idx, i = pint(i, 4); n, i, h = pstr(i, 7)
            kind = "literal value, name from %s table #%d, value %d bytes%s" % ("static" if b & 0x10 else "dynamic", idx, n, " (Huffman)" if h else "")
        elif b & 0x20:
            n1, i = pint(i, 3); i += n1; n2, i, h = pstr(i, 7); kind = "literal name and value"
        elif b & 0x10:
            idx, i = pint(i, 4); kind = "indexed, post-base #%d" % idx
        else:
            idx, i = pint(i, 3); n, i, h = pstr(i, 7); kind = "literal value, post-base name #%d" % idx
        out.append(dict(kind=kind, bytes=i - s))
    return out


def feed(direction, sid, data):
    key = (direction, sid)
    b = bufs.setdefault(key, bytearray())
    b += data
    uni = sid & 2
    if uni and key not in kinds:
        if not b:
            return
        t, n = varint(b, 0)
        kinds[key] = ST.get(t, "stream type %d" % t)
        frames.append(dict(t=ms(), dir=direction, stream=sid, type="STREAM TYPE", note=kinds[key], len=n))
        del b[:n]
    if uni and kinds.get(key, "").startswith("QPACK"):
        if b:
            frames.append(dict(t=ms(), dir=direction, stream=sid, type="QPACK instructions", len=len(b), hex=bytes(b).hex()))
            b.clear()
        return
    while b:
        try:
            t, i = varint(b, 0); ln, i = varint(b, i)
        except IndexError:
            return
        if len(b) < i + ln:
            return
        payload = bytes(b[i:i + ln])
        fr = dict(t=ms(), dir=direction, stream=sid, type=FT.get(t, "reserved 0x%x" % t), len=ln, head=i)
        if t == 4:
            j, st = 0, []
            while j < ln:
                k, j = varint(payload, j); v, j = varint(payload, j); st.append([SET.get(k, "reserved 0x%x" % k), v])
            fr["settings"] = st
        elif t == 1:
            fr["lines"] = qpack_lines(payload); fr["hex"] = payload.hex()
        elif t == 0:
            fr["text"] = payload.decode("utf-8", "replace")
        elif t == 7:
            fr["id"] = varint(payload, 0)[0]
        frames.append(fr)
        del b[:i + ln]


def ms():
    return round((time.perf_counter() - T0) * 1000, 2)


class Client(QuicConnectionProtocol):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        orig = self._quic.send_stream_data
        def spy(stream_id, data, end_stream=False):
            feed("out", stream_id, data); return orig(stream_id, data, end_stream)
        self._quic.send_stream_data = spy
        self.h3 = H3Connection(self._quic); self.ended = set(); self.ev = asyncio.Event(); self.headers = {}
    def quic_event_received(self, ev):
        if isinstance(ev, StreamDataReceived):
            feed("in", ev.stream_id, ev.data)
        for e in self.h3.handle_event(ev):
            if isinstance(e, HeadersReceived):
                self.headers[e.stream_id] = [(k.decode(), v.decode()) for k, v in e.headers]
            if isinstance(e, (DataReceived, HeadersReceived)) and e.stream_ended:
                self.ended.add(e.stream_id); self.ev.set()


async def main():
    cfg = QuicConfiguration(is_client=True, alpn_protocols=H3_ALPN, server_name="api.llm.test")
    cfg.load_verify_locations(CA)
    marks = []
    async with connect("127.0.0.1", PORT, configuration=cfg, create_protocol=Client) as c:
        def req():
            sid = c._quic.get_next_available_stream_id()
            c.h3.send_headers(sid, [(b":method", b"POST"), (b":scheme", b"https"), (b":authority", b"api.llm.test"),
                                    (b":path", b"/v1/messages"), (b"content-type", b"application/json"),
                                    (b"x-api-key", b"sk-wirelab-not-a-real-key"), (b"content-length", str(len(BODY)).encode())])
            c.h3.send_data(sid, BODY, end_stream=True); return sid
        async def wait(ids):
            while not ids <= c.ended:
                c.ev.clear(); await asyncio.wait_for(c.ev.wait(), 10)
        for label in ["request 1", "request 2 (same headers, same connection)"]:
            marks.append([label, len(frames)]); sid = req(); c.transmit(); await wait({sid})
        marks.append(["requests 3 and 4 at once", len(frames)])
        a = req(); b = req(); c.transmit(); await wait({a, b})
        marks.append(["close", len(frames)])
        resp_headers = c.headers
    json.dump({"recorded": time.strftime("%Y-%m-%d"), "server": "hypercorn 0.18.0 with aioquic 1.3.0 (lab_server.py), 127.0.0.1 UDP",
               "client": "aioquic 1.3.0 (pylsqpack), stream bytes parsed by frames_h3.py", "marks": marks, "frames": frames,
               "response_headers": {str(k): v for k, v in resp_headers.items()}}, open(OUT, "w"), indent=1)
    print(len(frames), "frames")

asyncio.run(main())
