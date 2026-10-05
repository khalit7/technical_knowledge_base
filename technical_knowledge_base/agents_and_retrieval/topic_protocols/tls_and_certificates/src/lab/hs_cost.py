"""What a handshake costs on loopback (no network delay, so this is CPU and syscalls only): 300 small requests each
(1) a new TCP+TLS 1.3 connection with a full handshake, (2) a new connection resuming the previous session (PSK
with fresh ECDHE, psk_dhe_ke), (3) one kept-alive connection. Python 3.13 ssl, OpenSSL 3.5, both ends on this machine.
Usage: python hs_cost.py <pki dir> <port> <out.json>"""
import json, socket, ssl, statistics, sys, threading, time
PKI, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
N = 300
sctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); sctx.load_cert_chain(PKI + "/fullchain.pem", PKI + "/leaf.key")
ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", PORT)); ls.listen(64)
RESP = b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\nok"


def handle(c):
    try:
        s = sctx.wrap_socket(c, server_side=True)
        while True:
            d = s.recv(4096)
            if not d:
                break
            s.sendall(RESP)
        s.close()
    except Exception:
        c.close()


def serve():
    while True:
        try:
            c, _ = ls.accept()
        except OSError:
            return
        threading.Thread(target=handle, args=(c,), daemon=True).start()


threading.Thread(target=serve, daemon=True).start()
cctx = ssl.create_default_context(cafile=PKI + "/root.pem")
REQ = b"GET / HTTP/1.1\r\nHost: api.llm.test\r\n\r\n"


def one(s):
    s.sendall(REQ); d = b""
    while not d.endswith(b"ok"):
        d += s.recv(4096)


def new_conn(session=None):
    s = cctx.wrap_socket(socket.create_connection(("127.0.0.1", PORT)), server_hostname="api.llm.test", session=session)
    return s


res = {"recorded": time.strftime("%Y-%m-%d"), "python": sys.version.split()[0], "openssl": ssl.OPENSSL_VERSION, "n": N, "modes": {}}
# full handshakes
ts = []
for _ in range(N):
    t = time.perf_counter(); s = new_conn(); one(s); ts.append((time.perf_counter() - t) * 1e3); s.close()
res["modes"]["new connection, full handshake"] = ts
# resumed: take a session from a connection that has read a response (tickets arrive after the handshake)
s = new_conn(); one(s); sess = s.session; s.close()
ts, reused = [], 0
for _ in range(N):
    t = time.perf_counter(); s = new_conn(sess); one(s); ts.append((time.perf_counter() - t) * 1e3)
    reused += s.session_reused; sess = s.session; s.close()
res["modes"]["new connection, resumed session"] = ts; res["resumed_count"] = reused
s = new_conn(); one(s); ts = []
for _ in range(N):
    t = time.perf_counter(); one(s); ts.append((time.perf_counter() - t) * 1e3)
s.close()
res["modes"]["one kept-alive connection"] = ts
res["median_ms"] = {k: round(statistics.median(v), 3) for k, v in res["modes"].items()}
res["p90_ms"] = {k: round(sorted(v)[int(0.9 * len(v))], 3) for k, v in res["modes"].items()}
res["modes"] = {k: [round(x, 3) for x in v] for k, v in res["modes"].items()}
ls.close()
json.dump(res, open(OUT, "w"), indent=1)
print(res["median_ms"], res["p90_ms"], "resumed", reused)
