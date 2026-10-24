"""Instrumented HTTPS client for the Wire Lab request (HTTP/1.1 or HTTP/2 over TLS).

It owns the socket and runs TLS through ssl.MemoryBIO, so it sees and timestamps every
encrypted byte on the wire (TLS records) as well as the decrypted HTTP bytes, and it logs
every TLS handshake message through OpenSSL's message callback. No packet capture needed.

Usage: python wire_client.py --proto h1|h2 [--port 8443] [--host 127.0.0.1] [--sni api.llm.test]
         [--ca ca.pem] [--tls 1.2|1.3] [--runs N] [--resume] [--keepalive] [--out file.json]
--resume: after the first run, open the next connections with the saved TLS session (resumption).
--keepalive: send all runs on one connection (no new TCP or TLS).
"""
import argparse, json, os, socket, ssl, sys, time
import h2.connection, h2.config, h2.events

HERE = os.path.dirname(os.path.abspath(__file__))
BODY = open(os.path.join(HERE, "request.json"), "rb").read()
CT = {20: "change_cipher_spec", 21: "alert", 22: "handshake", 23: "application_data", 256: "header"}
HS = {1: "ClientHello", 2: "ServerHello", 4: "NewSessionTicket", 8: "EncryptedExtensions", 11: "Certificate",
      12: "ServerKeyExchange", 13: "CertificateRequest", 14: "ServerHelloDone", 15: "CertificateVerify",
      16: "ClientKeyExchange", 20: "Finished"}
H2T = {0: "DATA", 1: "HEADERS", 2: "PRIORITY", 3: "RST_STREAM", 4: "SETTINGS", 5: "PUSH_PROMISE", 6: "PING",
       7: "GOAWAY", 8: "WINDOW_UPDATE", 9: "CONTINUATION"}


CTX_HOLDER = {}


def make_ctx(a):
    ctx = ssl.create_default_context(cafile=a.ca) if a.ca else ssl.create_default_context()
    if a.tls == "1.2": ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    if a.tls == "1.3": ctx.minimum_version = ssl.TLSVersion.TLSv1_3
    ctx.set_alpn_protocols(["h2"] if a.proto == "h2" else ["http/1.1"])
    def cb(conn, direction, version, content_type, msg_type, data):
        self = CTX_HOLDER["conn"]
        if content_type == 22:  # handshake messages, after decryption
            self.tls_msgs.append({"t_ms": self.ms(), "dir": "out" if direction == "write" else "in",
                                  "msg": HS.get(int(msg_type), str(msg_type)), "len": len(data)})
    ctx._msg_callback = cb
    return ctx


class Conn:
    def __init__(self, a, ctx, session=None):
        self.a, self.t0, self.ev, self.wire, self.tls_msgs = a, time.perf_counter(), {}, [], []
        self.ms = lambda: round((time.perf_counter() - self.t0) * 1000, 3)
        CTX_HOLDER["conn"] = self
        t = time.perf_counter(); ai = socket.getaddrinfo(a.host, a.port, socket.AF_INET, socket.SOCK_STREAM)
        self.ev["dns_ms"] = self.ms()
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM); self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.sock.connect(ai[0][4]); self.ev["tcp_ms"] = self.ms()
        self.local_port = self.sock.getsockname()[1]
        self.inb, self.outb = ssl.MemoryBIO(), ssl.MemoryBIO()
        self.tls = ctx.wrap_bio(self.inb, self.outb, server_hostname=a.sni, session=session)
        while True:
            try:
                self.tls.do_handshake(); self.flush(); break
            except ssl.SSLWantReadError:
                self.flush(); self.recv()
        self.ev["tls_ms"] = self.ms()
        self.ev["tls_version"] = self.tls.version(); self.ev["cipher"] = self.tls.cipher()[0]
        self.ev["alpn"] = self.tls.selected_alpn_protocol(); self.ev["resumed"] = self.tls.session_reused
        cert = self.tls.getpeercert(); self.ev["peer_cn"] = dict(x[0] for x in cert["subject"]).get("commonName")

    def flush(self):
        d = self.outb.read()
        if d: self.sock.sendall(d); self.wire.append({"t_ms": self.ms(), "dir": "out", "hex": d.hex()})

    def recv(self):
        d = self.sock.recv(65536)
        self.wire.append({"t_ms": self.ms(), "dir": "in", "hex": d.hex()})
        if not d: self.inb.write_eof(); raise EOFError
        self.inb.write(d)

    def write(self, b):
        self.tls.write(b); self.flush()

    def read(self):
        while True:
            try:
                d = self.tls.read(65536); self.flush(); return d
            except ssl.SSLWantReadError:
                self.flush(); self.recv()
            except ssl.SSLZeroReturnError:
                return b""


def tokens_in(buf):
    return buf.count(b'"type":"text_delta"')


def run_h1(c, last):
    req = (b"POST /v1/messages HTTP/1.1\r\nHost: api.llm.test\r\ncontent-type: application/json\r\n"
           b"x-api-key: sk-wirelab-not-a-real-key\r\ncontent-length: " + str(len(BODY)).encode() +
           (b"\r\nconnection: close" if last else b"") + b"\r\n\r\n" + BODY)
    if c.a.get:  # read-only request to a public host: GET, no credentials, connection closed after
        req = ("GET %s HTTP/1.1\r\nHost: %s\r\nuser-agent: wire-lab/1 (read-only timing)\r\nconnection: close\r\n\r\n" % (c.a.get, c.a.sni)).encode()
    t = {"start_ms": c.ms()}; c.write(req); t["sent_ms"] = c.ms(); plain = []; buf = b""
    while True:
        d = c.read()
        if not d: break
        now = c.ms(); plain.append({"t_ms": now, "dir": "in", "hex": d.hex()})
        if "first_byte_ms" not in t: t["first_byte_ms"] = now
        buf += d
        n = tokens_in(buf)
        if n and "first_token_ms" not in t: t["first_token_ms"] = now
        if n == 5 and "last_token_ms" not in t: t["last_token_ms"] = now
        if buf.endswith(b"\r\n0\r\n\r\n") and not c.a.get: break
    t["done_ms"] = c.ms()
    if c.a.get:  # keep only the status line of a public response
        return t, [{"t_ms": t["start_ms"], "dir": "out", "text": req.decode()}, {"status": buf.split(b"\r\n", 1)[0].decode(errors="replace"), "bytes": len(buf)}]
    return t, [{"t_ms": t["start_ms"], "dir": "out", "hex": req.hex()}] + plain


def frames(hexs):
    """Split HTTP/2 plaintext into frames (RFC 9113 section 4.1: 9-byte header)."""
    b = bytes.fromhex(hexs); out = []
    if b.startswith(b"PRI * HTTP/2.0"): out.append({"type": "PREFACE", "len": 24, "flags": 0, "stream": 0}); b = b[24:]
    while len(b) >= 9:
        n = int.from_bytes(b[:3], "big"); ty = b[3]; fl = b[4]; sid = int.from_bytes(b[5:9], "big") & 0x7fffffff
        out.append({"type": H2T.get(ty, str(ty)), "len": n, "flags": fl, "stream": sid}); b = b[9 + n:]
    return out


def run_h2(c, h2c, last):
    t = {"start_ms": c.ms()}; plain = []
    sid = h2c.get_next_available_stream_id()
    h2c.send_headers(sid, [(":method", "POST"), (":scheme", "https"), (":authority", "api.llm.test:%d" % c.a.port),
        (":path", "/v1/messages"), ("content-type", "application/json"), ("x-api-key", "sk-wirelab-not-a-real-key"),
        ("content-length", str(len(BODY)))])
    h2c.send_data(sid, BODY, end_stream=True)
    out = h2c.data_to_send(); c.write(out); plain.append({"t_ms": t["start_ms"], "dir": "out", "hex": out.hex()})
    t["sent_ms"] = c.ms(); buf = b""; ended = False
    while not ended:
        d = c.read()
        if not d: break
        now = c.ms(); plain.append({"t_ms": now, "dir": "in", "hex": d.hex()})
        if "first_byte_ms" not in t: t["first_byte_ms"] = now
        for e in h2c.receive_data(d):
            if isinstance(e, h2.events.DataReceived):
                h2c.acknowledge_received_data(e.flow_controlled_length, e.stream_id); buf += e.data
            if isinstance(e, h2.events.StreamEnded) and e.stream_id == sid: ended = True
        n = tokens_in(buf)
        if n and "first_token_ms" not in t: t["first_token_ms"] = now
        if n == 5 and "last_token_ms" not in t: t["last_token_ms"] = now
        o = h2c.data_to_send()
        if o: c.write(o); plain.append({"t_ms": c.ms(), "dir": "out", "hex": o.hex()})
    t["done_ms"] = c.ms()
    return t, plain


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--proto", default="h2"); p.add_argument("--host", default="127.0.0.1"); p.add_argument("--port", type=int, default=8443)
    p.add_argument("--sni", default="api.llm.test"); p.add_argument("--ca"); p.add_argument("--tls"); p.add_argument("--runs", type=int, default=1)
    p.add_argument("--resume", action="store_true"); p.add_argument("--keepalive", action="store_true"); p.add_argument("--out")
    p.add_argument("--get", help="send GET <path> instead of the Wire Lab POST (public hosts, read-only)")
    p.add_argument("--nowire", action="store_true", help="do not record wire bytes (public hosts)")
    a = p.parse_args(); ctx = make_ctx(a); runs = []; session = None; c = h2c = None
    for i in range(a.runs):
        last = i == a.runs - 1 or not a.keepalive
        new = c is None or not a.keepalive
        if new:
            c = Conn(a, ctx, session=session if a.resume else None)
            if a.proto == "h2":
                h2c = h2.connection.H2Connection(h2.config.H2Configuration(client_side=True, header_encoding="utf-8"))
                h2c.initiate_connection()
            setup = dict(c.ev); c.t0_req = None
        else:
            setup = {"reused_connection": True}
        base = c.ms() if not new else 0.0
        t, plain = (run_h2(c, h2c, last) if a.proto == "h2" else run_h1(c, last))
        if not new:  # time measured from the start of this request on the open connection
            t = {k: round(v - base, 3) for k, v in t.items()}
        rec = {"run": i, "new_connection": new, "setup": setup, "timing": t, "local_port": c.local_port}
        if i == 0 or a.runs == 1 or a.resume or a.keepalive:
            rec["tls_msgs"] = list(c.tls_msgs) if new else []
            rec["wire"] = (list(c.wire) if new else []) if not a.nowire else [{"dir": x["dir"], "t_ms": x["t_ms"], "bytes": len(x["hex"]) // 2} for x in c.wire]
            rec["plain"] = plain
            if a.proto == "h2": rec["h2_frames"] = [dict(f, dir=x["dir"], t_ms=x["t_ms"]) for x in plain for f in frames(x["hex"])]
        if new and a.resume and session is None: session = c.tls.session
        c.wire, c.tls_msgs = [], []
        runs.append(rec)
        if last and a.keepalive is False:
            try: c.sock.close()
            except OSError: pass
    out = {"proto": a.proto, "host": a.host, "port": a.port, "sni": a.sni, "tls_req": a.tls, "resume": a.resume,
           "keepalive": a.keepalive, "python": sys.version.split()[0], "openssl": ssl.OPENSSL_VERSION, "runs": runs}
    s = json.dumps(out, indent=1)
    if a.out: open(a.out, "w").write(s)
    for r in runs: print(r["run"], r["setup"].get("tls_version"), r["setup"].get("resumed"), r["setup"].get("tcp_ms"), r["setup"].get("tls_ms"), r["timing"])


if __name__ == "__main__":
    main()
