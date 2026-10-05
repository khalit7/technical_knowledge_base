"""Small misbehaving servers for the failure lab, each a few lines of plain sockets so the fault is visible.

python toys.py <name> <port>
  silent     accept, read the request, never answer (a hung model server)
  rst        accept, then close with SO_LINGER 0 so the kernel sends a TCP RST (connection reset)
  empty      accept, read the request, close cleanly without a byte (FIN, no response)
  short      answer with Content-Length: 100 but send 50 bytes, then close
  kadrop     keep-alive: answer the first request, then read the second and close without answering
  backlog    listen(1) and never accept: the accept queue fills and new SYNs are ignored
  ratelimit  POST /v1/messages: first request 200, then 429 with Retry-After: 2 until 2 s have passed
"""
import socket, sys, threading, time

name, port = sys.argv[1], int(sys.argv[2])
ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
ls.bind(("127.0.0.1", port))


def read_request(c):
    buf = b""
    while b"\r\n\r\n" not in buf:
        d = c.recv(65536)
        if not d:
            return None
        buf += d
    head, _, body = buf.partition(b"\r\n\r\n")
    n = 0
    for line in head.split(b"\r\n")[1:]:
        k, _, v = line.partition(b":")
        if k.strip().lower() == b"content-length":
            n = int(v)
    while len(body) < n:
        body += c.recv(65536)
    return head


def resp(status, body=b"", extra=b""):
    return b"HTTP/1.1 " + status + b"\r\ncontent-type: application/json\r\ncontent-length: " + str(len(body)).encode() + b"\r\n" + extra + b"\r\n" + body


if name == "backlog":
    ls.listen(1)
    while True:
        time.sleep(3600)

ls.listen(64)
state = {"last": 0.0}


def handle(c):
    try:
        if name == "silent":
            read_request(c); time.sleep(3600)
        elif name == "rst":
            read_request(c)
            c.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, b"\x01\x00\x00\x00\x00\x00\x00\x00")
        elif name == "empty":
            read_request(c)
        elif name == "short":
            read_request(c)
            c.sendall(b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 100\r\n\r\n" + b'{"partial":"' + b"x" * 37 + b'"')
        elif name == "kadrop":
            read_request(c)
            c.sendall(resp(b"200 OK", b'{"ok":true}\n'))
            read_request(c)  # the second request on the same connection: read it, then hang up
        elif name == "ratelimit":
            read_request(c)
            now = time.time()
            if now - state["last"] < 2:
                body = b'{"type":"error","error":{"type":"rate_limit_error","message":"lab: 1 request per 2 s"}}\n'
                c.sendall(resp(b"429 Too Many Requests", body, b"retry-after: 2\r\n"))
            else:
                state["last"] = now
                c.sendall(resp(b"200 OK", b'{"ok":true}\n'))
    finally:
        c.close()


while True:
    c, _ = ls.accept()
    threading.Thread(target=handle, args=(c,), daemon=True).start()
