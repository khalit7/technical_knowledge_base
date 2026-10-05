"""Record every HTTP/2 frame of the running request, both directions, from the raw bytes on the TLS connection.

One TLS connection (ALPN h2) to the lab server carries: request 1 (the running request), request 2 (identical, to show
HPACK's dynamic table), then requests 3 and 4 at once (to show streams interleaving), then a clean close (GOAWAY).
The h2 library builds the frames; this script parses the bytes it actually sent and received (RFC 9113 section 4.1),
decodes header blocks with hpack_parse (representation and size of each field) and writes raw/h2_frames.json.
Usage: python frames_h2.py <ca.pem> <port> <out.json>
"""
import json, socket, ssl, struct, sys, time
import h2.config, h2.connection, h2.events
from hpack_parse import Parser

CA, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
BODY = open(__file__.rsplit("/", 1)[0] + "/../../../src/wire/request.json", "rb").read()
TYPES = {0: "DATA", 1: "HEADERS", 2: "PRIORITY", 3: "RST_STREAM", 4: "SETTINGS", 5: "PUSH_PROMISE", 6: "PING",
         7: "GOAWAY", 8: "WINDOW_UPDATE", 9: "CONTINUATION"}
SETTINGS = {1: "HEADER_TABLE_SIZE", 2: "ENABLE_PUSH", 3: "MAX_CONCURRENT_STREAMS", 4: "INITIAL_WINDOW_SIZE",
            5: "MAX_FRAME_SIZE", 6: "MAX_HEADER_LIST_SIZE", 8: "ENABLE_CONNECT_PROTOCOL", 9: "NO_RFC7540_PRIORITIES"}
PREFACE = b"PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"
T0 = time.perf_counter()
frames = []
dec = {"out": Parser(), "in": Parser()}
buf = {"out": bytearray(), "in": bytearray()}


def flags_of(t, f):
    names = []
    if t in (0, 1) and f & 1: names.append("END_STREAM")
    if t in (4, 6) and f & 1: names.append("ACK")
    if t in (1, 5, 9) and f & 4: names.append("END_HEADERS")
    if t in (0, 1) and f & 8: names.append("PADDED")
    if t == 1 and f & 0x20: names.append("PRIORITY")
    return names


def feed(direction, data):
    b = buf[direction]
    b += data
    if direction == "out" and b.startswith(PREFACE):
        frames.append(dict(t=round((time.perf_counter() - T0) * 1000, 2), dir="out", type="PREFACE", len=24,
                           hex=PREFACE.hex(), note="the 24-byte connection preface"))
        del b[:24]
    while len(b) >= 9:
        ln = int.from_bytes(b[0:3], "big"); t = b[3]; f = b[4]; sid = struct.unpack(">I", b[5:9])[0] & 0x7FFFFFFF
        if len(b) < 9 + ln:
            break
        payload = bytes(b[9:9 + ln]); head = bytes(b[:9])
        del b[:9 + ln]
        fr = dict(t=round((time.perf_counter() - T0) * 1000, 2), dir=direction, type=TYPES.get(t, str(t)), flags=flags_of(t, f),
                  stream=sid, len=ln, head_hex=head.hex())
        if t == 4:
            fr["settings"] = [[SETTINGS.get(int.from_bytes(payload[i:i + 2], "big"), str(int.from_bytes(payload[i:i + 2], "big"))),
                               int.from_bytes(payload[i + 2:i + 6], "big")] for i in range(0, ln, 6)]
            fr["payload_hex"] = payload.hex()
        elif t == 8:
            fr["increment"] = int.from_bytes(payload, "big") & 0x7FFFFFFF
        elif t == 1:
            fr["fields"] = dec[direction].parse(payload)
            fr["payload_hex"] = payload.hex()
        elif t == 0:
            fr["text"] = payload.decode("utf-8", "replace")
        elif t == 7:
            fr["last_stream"] = int.from_bytes(payload[:4], "big") & 0x7FFFFFFF
            fr["error_code"] = int.from_bytes(payload[4:8], "big")
        elif t == 3:
            fr["error_code"] = int.from_bytes(payload, "big")
        elif t == 6:
            fr["payload_hex"] = payload.hex()
        frames.append(fr)


ctx = ssl.create_default_context(cafile=CA)
ctx.set_alpn_protocols(["h2"])
raw = socket.create_connection(("127.0.0.1", PORT))
s = ctx.wrap_socket(raw, server_hostname="api.llm.test")
assert s.selected_alpn_protocol() == "h2", s.selected_alpn_protocol()
conn = h2.connection.H2Connection(config=h2.config.H2Configuration(client_side=True, header_encoding=None))
conn.initiate_connection()


def flush():
    d = conn.data_to_send()
    if d:
        feed("out", d); s.sendall(d)


def headers():
    return [(":method", "POST"), (":scheme", "https"), (":authority", "api.llm.test"), (":path", "/v1/messages"),
            ("content-type", "application/json"), ("x-api-key", "sk-wirelab-not-a-real-key"), ("content-length", str(len(BODY)))]


def send_req():
    sid = conn.get_next_available_stream_id()
    conn.send_headers(sid, headers())
    conn.send_data(sid, BODY, end_stream=True)
    return sid


def pump(open_ids):
    while open_ids:
        d = s.recv(65535)
        if not d:
            break
        feed("in", d)
        for ev in conn.receive_data(d):
            if isinstance(ev, h2.events.DataReceived):
                conn.acknowledge_received_data(ev.flow_controlled_length, ev.stream_id)
            if isinstance(ev, h2.events.StreamEnded):
                open_ids.discard(ev.stream_id)
        flush()


flush()
marks = []
for label in ["request 1", "request 2 (same headers, same connection)"]:
    marks.append([label, len(frames)])
    sid = send_req(); flush()
    pump({sid})
marks.append(["requests 3 and 4 at once", len(frames)])
a = send_req(); b = send_req(); flush()
pump({a, b})
marks.append(["close", len(frames)])
conn.close_connection(); flush()
try:
    s.settimeout(1)
    while True:
        d = s.recv(65535)
        if not d:
            break
        feed("in", d)
except Exception:
    pass
s.close()
json.dump({"recorded": time.strftime("%Y-%m-%d"), "server": "hypercorn 0.18.0 (lab_server.py) on 127.0.0.1, TLS 1.3, ALPN h2",
           "client": "h2 4.4.1 with hpack 4.2.0, raw bytes parsed by frames_h2.py", "marks": marks, "frames": frames},
          open(OUT, "w"), indent=1)
print(len(frames), "frames")
