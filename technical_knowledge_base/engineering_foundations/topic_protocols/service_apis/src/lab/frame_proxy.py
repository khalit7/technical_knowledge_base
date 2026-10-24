"""A logging TCP proxy for cleartext HTTP/2 (h2c), the way gRPC talks inside a cluster without TLS:
python frame_proxy.py LISTEN_PORT TARGET_PORT OUT.jsonl
Every byte is forwarded unchanged; on the side, each direction is parsed into HTTP/2 frames (hyperframe) and
header blocks are decoded with a separate HPACK decoder per direction (hpack), as the receiving peer would.
One JSON line per frame: ms since the connection opened, direction, type, stream, flags, length, and details
(decoded headers, DATA bytes in hex, SETTINGS, WINDOW_UPDATE, PING, GOAWAY with its debug text).
No sudo and no packet capture: this sees exactly what the two programs exchanged over the socket."""
import json, socket, sys, threading, time
from hyperframe.frame import Frame, HeadersFrame, ContinuationFrame, DataFrame, SettingsFrame, WindowUpdateFrame, PingFrame, GoAwayFrame, RstStreamFrame
from hpack import Decoder

LP, TP, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
lock = threading.Lock()
conn_no = [0]
PREFACE = b"PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n"
SET = {1: "HEADER_TABLE_SIZE", 2: "ENABLE_PUSH", 3: "MAX_CONCURRENT_STREAMS", 4: "INITIAL_WINDOW_SIZE", 5: "MAX_FRAME_SIZE", 6: "MAX_HEADER_LIST_SIZE", 8: "ENABLE_CONNECT_PROTOCOL", 0xfe03: "grpc: allow true binary metadata (0xfe03)"}


def emit(rec):
    with lock, open(OUT, "a") as f:
        f.write(json.dumps(rec) + "\n")


def parser(direction, cid, t0):
    buf = bytearray(); dec = Decoder(); dec.max_allowed_table_size = 1 << 20
    state = {"pre": direction == "c>s", "hb": b"", "hf": None}

    def feed(data):
        nonlocal buf
        buf += data
        if state["pre"]:
            if len(buf) < 24:
                return
            emit(dict(conn=cid, ms=round((time.time() - t0) * 1000, 2), dir=direction, type="PREFACE", len=24, hex=bytes(buf[:24]).hex(" ")))
            del buf[:24]; state["pre"] = False
        while len(buf) >= 9:
            f, ln = Frame.parse_frame_header(memoryview(buf[:9]))
            if len(buf) < 9 + ln:
                return
            f.parse_body(memoryview(bytes(buf[9:9 + ln])))
            del buf[:9 + ln]
            rec = dict(conn=cid, ms=round((time.time() - t0) * 1000, 2), dir=direction, type=f.type.__name__ if False else type(f).__name__.replace("Frame", "").upper(),
                       stream=f.stream_id, flags=sorted(f.flags), len=ln)
            if isinstance(f, (HeadersFrame, ContinuationFrame)):
                state["hb"] += f.data
                if "END_HEADERS" in f.flags:
                    hdrs = dec.decode(state["hb"]); state["hb"] = b""
                    rec["headers"] = [[k, v] for k, v in hdrs]
                    rec["hpack_bytes"] = len(f.data)
            elif isinstance(f, DataFrame):
                rec["hex"] = f.data.hex(" ")
            elif isinstance(f, SettingsFrame):
                rec["settings"] = {SET.get(k, str(k)): v for k, v in f.settings.items()}
            elif isinstance(f, WindowUpdateFrame):
                rec["increment"] = f.window_increment
            elif isinstance(f, PingFrame):
                rec["opaque"] = f.opaque_data.hex()
            elif isinstance(f, GoAwayFrame):
                rec.update(last_stream=f.last_stream_id, error=f.error_code, debug=f.additional_data.decode(errors="replace"))
            elif isinstance(f, RstStreamFrame):
                rec["error"] = f.error_code
            emit(rec)
    return feed


def pipe(src, dst, feed):
    try:
        while True:
            d = src.recv(65536)
            if not d:
                break
            feed(d); dst.sendall(d)
    except OSError:
        pass
    finally:
        for s in (src, dst):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def handle(c):
    with lock:
        conn_no[0] += 1; cid = conn_no[0]
    u = socket.create_connection(("127.0.0.1", TP)); t0 = time.time()
    for s in (c, u):
        s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    emit(dict(conn=cid, ms=0, dir="--", type="TCP_OPEN"))
    a = threading.Thread(target=pipe, args=(c, u, parser("c>s", cid, t0)), daemon=True)
    b = threading.Thread(target=pipe, args=(u, c, parser("s>c", cid, t0)), daemon=True)
    a.start(); b.start(); a.join(); b.join()
    emit(dict(conn=cid, ms=round((time.time() - t0) * 1000, 2), dir="--", type="TCP_CLOSE"))


ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
ls.bind(("127.0.0.1", LP)); ls.listen(16); print("proxy ready", LP, "->", TP, flush=True)
while True:
    c, _ = ls.accept()
    threading.Thread(target=handle, args=(c,), daemon=True).start()
