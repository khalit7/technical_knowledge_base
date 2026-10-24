"""A bare TLS server (Python ssl): python tls_noalpn.py PORT CERT KEY [CLIENT_CA].
It never negotiates ALPN (like an old proxy or a hand-rolled TLS terminator) and answers any bytes with an HTTP/1.1 400.
With CLIENT_CA it requires a client certificate in the handshake itself (mTLS), as Envoy or a Go server does."""
import socket, ssl, sys, threading
port, cert, key = int(sys.argv[1]), sys.argv[2], sys.argv[3]
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.load_cert_chain(cert, key)
if len(sys.argv) > 4:
    ctx.verify_mode = ssl.CERT_REQUIRED; ctx.load_verify_locations(sys.argv[4])
ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", port)); ls.listen(16)
def h(c):
    try:
        s = ctx.wrap_socket(c, server_side=True); s.recv(4096)
        s.sendall(b"HTTP/1.1 400 Bad Request\r\ncontent-length: 0\r\nconnection: close\r\n\r\n"); s.close()
    except Exception:
        c.close()
while True:
    c, _ = ls.accept(); threading.Thread(target=h, args=(c,), daemon=True).start()
