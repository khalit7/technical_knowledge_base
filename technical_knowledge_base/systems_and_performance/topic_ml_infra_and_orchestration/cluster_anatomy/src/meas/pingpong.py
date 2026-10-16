"""TCP ping-pong and bulk throughput between two endpoints (stdlib only).

Run as server on one container and client on another (or both in one, over loopback),
to show what one network hop costs in the toy cluster: Docker's bridge inside one Linux VM.
usage: python pingpong.py server PORT
       python pingpong.py client HOST PORT  -> prints one JSON line
"""
import json, socket, statistics, sys, time

N_PING, SIZE_BULK, N_BULK = 2000, 4 << 20, 25


def recv_exact(s, n):
    buf = bytearray()
    while len(buf) < n:
        b = s.recv(min(1 << 20, n - len(buf)))
        if not b:
            raise ConnectionError("closed")
        buf += b
    return buf


def server(port):
    ls = socket.socket()
    ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    ls.bind(("0.0.0.0", port)); ls.listen(1)
    c, _ = ls.accept(); c.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    for _ in range(N_PING):
        c.sendall(recv_exact(c, 64))
    for _ in range(N_BULK):
        recv_exact(c, SIZE_BULK); c.sendall(b"k")
    c.close(); ls.close()


def client(host, port):
    for _ in range(100):
        try:
            s = socket.create_connection((host, port)); break
        except OSError:
            time.sleep(0.05)
    s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    msg, rtt = b"x" * 64, []
    for _ in range(N_PING):
        t = time.perf_counter(); s.sendall(msg); recv_exact(s, 64); rtt.append(time.perf_counter() - t)
    data, bw = b"\0" * SIZE_BULK, []
    for _ in range(N_BULK):
        t = time.perf_counter(); s.sendall(data); recv_exact(s, 1); bw.append(SIZE_BULK / (time.perf_counter() - t))
    s.close()
    rtt.sort()
    print(json.dumps({"rtt_us_median": round(statistics.median(rtt) * 1e6, 1),
                      "rtt_us_p10": round(rtt[len(rtt) // 10] * 1e6, 1),
                      "rtt_us_p90": round(rtt[9 * len(rtt) // 10] * 1e6, 1),
                      "bulk_GBps_median": round(statistics.median(bw) / 1e9, 3),
                      "n_ping": N_PING, "bulk_bytes": SIZE_BULK, "n_bulk": N_BULK}))


if __name__ == "__main__":
    if sys.argv[1] == "server":
        server(int(sys.argv[2]))
    else:
        client(sys.argv[2], int(sys.argv[3]))
