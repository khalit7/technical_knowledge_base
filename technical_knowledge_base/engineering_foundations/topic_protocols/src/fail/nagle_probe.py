"""Nagle plus delayed ACK, measured: python nagle_probe.py [PORT]
A client sends each request in two small writes (header, then body) and waits for a 2-byte reply; the server answers
only once the whole request has arrived. With Nagle's algorithm on (TCP_NODELAY=0) the second write waits until the
first is acknowledged; if the receiver delays that ACK, every request pays the delay. 400 requests per setting."""
import socket, sys, threading, time

port = int(sys.argv[1]) if len(sys.argv) > 1 else 0
ls = socket.socket(); ls.bind(("127.0.0.1", port)); ls.listen(4); port = ls.getsockname()[1]


def serve():
    while True:
        c, _ = ls.accept()
        def h(c=c):
            buf = b""
            while True:
                d = c.recv(65536)
                if not d:
                    return
                buf += d
                while b"END" in buf:
                    buf = buf.split(b"END", 1)[1]; c.sendall(b"OK")
        threading.Thread(target=h, daemon=True).start()


threading.Thread(target=serve, daemon=True).start()
for nodelay in (0, 1):
    c = socket.create_connection(("127.0.0.1", port)); c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, nodelay)
    ts = []
    for i in range(400):
        t = time.perf_counter(); c.sendall(b"H" * 100); c.sendall(b"B" * 100 + b"END"); c.recv(2); ts.append((time.perf_counter() - t) * 1000)
    ts.sort()
    print(f"TCP_NODELAY={nodelay}: median {ts[200]:.2f} ms, 99th percentile {ts[396]:.2f} ms, max {ts[-1]:.2f} ms over 400 requests")
