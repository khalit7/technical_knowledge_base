"""Certificate rotation without a restart, in Python's ssl module (OpenSSL 3.5).
Claim to test (old page): "Python needs a whole new SSLContext because you cannot mutate one in place".
A server holds one SSLContext. Connection 1 is opened and kept. Then load_cert_chain() is called again on the SAME
context with a new certificate (same name, new key). Connection 2 is opened. Which certificate does each see?
Also: the kept connection 1 still sends data under its old identity: rotation never reaches existing connections.
Usage: python rotate.py <pki dir> <port> <out.json>"""
import json, os, socket, ssl, sys, threading, time
PKI, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
sctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
sctx.load_cert_chain(PKI + "/fullchain.pem", PKI + "/leaf.key")
ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", PORT)); ls.listen(8)
conns = []


def accept_loop():
    while True:
        try:
            c, _ = ls.accept()
        except OSError:
            return
        s = sctx.wrap_socket(c, server_side=True); conns.append(s)


threading.Thread(target=accept_loop, daemon=True).start()
cctx = ssl.create_default_context(cafile=PKI + "/root.pem")


def serial_of(sock):
    import hashlib
    return hashlib.sha256(sock.getpeercert(True)).hexdigest()[:16]


def connect():
    s = cctx.wrap_socket(socket.create_connection(("127.0.0.1", PORT)), server_hostname="api.llm.test"); return s


from cryptography import x509
import hashlib
from cryptography.hazmat.primitives.serialization import Encoding
want = {n: hashlib.sha256(x509.load_pem_x509_certificate(open(PKI + "/%s.pem" % n, "rb").read()).public_bytes(Encoding.DER)).hexdigest()[:16] for n in ("leaf", "leaf_b")}
res = {"recorded": time.strftime("%Y-%m-%d"), "python": sys.version.split()[0], "openssl": ssl.OPENSSL_VERSION,
       "sha256_fingerprints": {"old certificate (leaf)": want["leaf"], "new certificate (leaf_b)": want["leaf_b"]}, "steps": []}
c1 = connect(); time.sleep(0.1)
res["steps"].append({"step": "connection 1 opened", "conn1_sees": serial_of(c1)})
t = time.perf_counter(); sctx.load_cert_chain(PKI + "/fullchain_b.pem", PKI + "/leaf_b.key"); dt = (time.perf_counter() - t) * 1e3
res["steps"].append({"step": "server calls load_cert_chain() again on the same SSLContext", "ms": round(dt, 2)})
c2 = connect(); time.sleep(0.1)
res["steps"].append({"step": "connection 2 opened", "conn2_sees": serial_of(c2)})
c1.sendall(b"ping"); time.sleep(0.1); got = conns[0].recv(10)
res["steps"].append({"step": "connection 1 still carries data", "server_received": got.decode(), "conn1_still_sees": serial_of(c1)})
for s in (c1, c2):
    s.close()
ls.close()
json.dump(res, open(OUT, "w"), indent=1)
print(json.dumps(res, indent=1))
