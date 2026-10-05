"""Head-of-line blocking at the HTTP layer (not the packet layer the root's On the wire tab measures).

A slow request A (the running request with x-lab-think: 1, so its first token comes after 1 s) and a fast request B
(GET /health) are sent 10 ms apart in three ways, against the same lab server:
  h1_pipelined: one HTTP/1.1 connection, B written right behind A (pipelining);
  h1_two_conns: two HTTP/1.1 connections, one request each (what browsers and pools do instead);
  h2_one_conn: one HTTP/2 connection, A on stream 1 and B on stream 3.
Records when each response's first byte and last byte arrive. Writes raw/hol_app.json.
Usage: python hol_app.py <ca.pem> <tls port> <plain port> <out.json>
"""
import json, os, socket, ssl, sys, threading, time
import h2.config, h2.connection, h2.events

CA, TLS, PLAIN, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
BODY = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../src/wire/request.json"), "rb").read()
A = (b"POST /v1/messages HTTP/1.1\r\nHost: api.llm.test\r\ncontent-type: application/json\r\nx-api-key: sk-wirelab-not-a-real-key\r\n"
     b"x-lab-think: 1\r\ncontent-length: %d\r\n\r\n" % len(BODY)) + BODY
B = b"GET /health HTTP/1.1\r\nHost: api.llm.test\r\n\r\n"


def ms(t0):
    return round((time.perf_counter() - t0) * 1000, 1)


def h1_pipelined():
    s = socket.create_connection(("127.0.0.1", PLAIN)); t0 = time.perf_counter()
    s.sendall(A); time.sleep(0.01); s.sendall(B)
    buf, marks = b"", {}
    s.settimeout(5)
    while True:
        d = s.recv(65536)
        if not d: break
        buf += d
        if "A_first" not in marks and b"HTTP/1.1 200" in buf: marks["A_first"] = ms(t0)
        if "A_last" not in marks and b"message_stop" in buf: marks["A_last"] = ms(t0)
        if "B_first" not in marks and buf.count(b"HTTP/1.1 200") >= 2: marks["B_first"] = ms(t0)
        parts = buf.split(b"HTTP/1.1 200")
        if "B_last" not in marks and len(parts) >= 3 and b"\r\n0\r\n\r\n" in parts[2]: marks["B_last"] = ms(t0); break
    s.close()
    return marks


def h1_two_conns():
    marks = {}; t0 = time.perf_counter()
    def go(req, tag):
        s = socket.create_connection(("127.0.0.1", PLAIN)); s.sendall(req); buf = b""
        while True:
            d = s.recv(65536)
            if not d: break
            buf += d
            if tag + "_first" not in marks: marks[tag + "_first"] = ms(t0)
            if buf.endswith(b"\r\n0\r\n\r\n") and (tag == "B" or b"message_stop" in buf):
                marks[tag + "_last"] = ms(t0); break
        s.close()
    ta = threading.Thread(target=go, args=(A, "A")); ta.start(); time.sleep(0.01)
    tb = threading.Thread(target=go, args=(B, "B")); tb.start(); ta.join(); tb.join()
    return marks


def h2_one_conn():
    ctx = ssl.create_default_context(cafile=CA); ctx.set_alpn_protocols(["h2"])
    s = ctx.wrap_socket(socket.create_connection(("127.0.0.1", TLS)), server_hostname="api.llm.test")
    c = h2.connection.H2Connection(h2.config.H2Configuration(client_side=True)); c.initiate_connection(); s.sendall(c.data_to_send())
    t0 = time.perf_counter(); marks = {}
    c.send_headers(1, [(":method", "POST"), (":scheme", "https"), (":authority", "api.llm.test"), (":path", "/v1/messages"),
                       ("content-type", "application/json"), ("x-api-key", "sk-wirelab-not-a-real-key"), ("x-lab-think", "1"),
                       ("content-length", str(len(BODY)))])
    c.send_data(1, BODY, end_stream=True); s.sendall(c.data_to_send()); time.sleep(0.01)
    c.send_headers(3, [(":method", "GET"), (":scheme", "https"), (":authority", "api.llm.test"), (":path", "/health")], end_stream=True)
    s.sendall(c.data_to_send())
    tag = {1: "A", 3: "B"}; done = set()
    while len(done) < 2:
        d = s.recv(65536)
        if not d: break
        for ev in c.receive_data(d):
            if isinstance(ev, h2.events.ResponseReceived): marks.setdefault(tag[ev.stream_id] + "_first", ms(t0))
            if isinstance(ev, h2.events.DataReceived): c.acknowledge_received_data(ev.flow_controlled_length, ev.stream_id)
            if isinstance(ev, h2.events.StreamEnded): marks[tag[ev.stream_id] + "_last"] = ms(t0); done.add(ev.stream_id)
        s.sendall(c.data_to_send())
    s.close()
    return marks


runs = {}
for name, f in [("h1_pipelined", h1_pipelined), ("h1_two_conns", h1_two_conns), ("h2_one_conn", h2_one_conn)]:
    runs[name] = [f() for _ in range(3)]
    print(name, runs[name])
json.dump({"recorded": time.strftime("%Y-%m-%d"), "server": "hypercorn 0.18.0 (lab_server.py), 127.0.0.1",
           "note": "A: running request with a 1 s wait before its first token; B: GET /health sent 10 ms after A. Three runs each; times in ms from sending A.",
           "runs": runs}, open(OUT, "w"), indent=1)
