"""Socket behaviour measured on this machine (macOS), loopback only, ports 30000-30099.

Experiments (each prints one JSON object; the whole run prints a JSON list):
  boundaries   three writes of 10 bytes: TCP may hand them back as one read, UDP returns three datagrams
  udp_sizes    the largest UDP datagram the kernel accepts on loopback (net.inet.udp.maxdgram)
  udp_overflow a fast UDP sender and a slow reader: datagrams dropped when the receive buffer is full,
               with a small and a large SO_RCVBUF (netstat -s -p udp counter before and after)
  backlog      a listener with listen(2) that never calls accept(): which of 8 connects complete
  time_wait    20 short connections closed by the client; macOS netstat lists no TIME_WAIT entries (recorded as such)
  nodelay      whether common servers set TCP_NODELAY on accepted sockets (Python asyncio, plain socket)
  mss          the MSS the kernel picks on loopback (MTU 16384) for a connection
"""
import asyncio, json, os, socket, struct, subprocess, sys, threading, time

BASE = 30000
TCP_CONNECTION_INFO = 0x106
FMT = "<BBBBIIIIIIIIIIIIIQQQQQQQ"


def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.strip()


def boundaries():
    port = BASE + 1
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", port)); ls.listen(1)
    c = socket.create_connection(("127.0.0.1", port)); a, _ = ls.accept()
    for m in (b"token-0001", b"token-0002", b"token-0003"):
        c.sendall(m)
    time.sleep(0.2)
    reads = []
    a.settimeout(0.3)
    try:
        while True:
            d = a.recv(4096)
            if not d: break
            reads.append(d.decode())
    except socket.timeout:
        pass
    c.close(); a.close(); ls.close()
    u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); u.bind(("127.0.0.1", port + 1))
    us = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    for m in (b"token-0001", b"token-0002", b"token-0003"):
        us.sendto(m, ("127.0.0.1", port + 1))
    time.sleep(0.2); u.settimeout(0.3); ureads = []
    try:
        while True:
            ureads.append(u.recv(4096).decode())
    except socket.timeout:
        pass
    u.close(); us.close()
    return dict(exp="boundaries", writes=["token-0001", "token-0002", "token-0003"], tcp_reads=reads, udp_reads=ureads)


def udp_sizes():
    port = BASE + 3
    u = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); u.bind(("127.0.0.1", port))
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    res = {}
    for n in (1472, 9216, 9217, 65507):
        try:
            s.sendto(b"x" * n, ("127.0.0.1", port)); res[str(n)] = "sent"
        except OSError as e:
            res[str(n)] = f"{type(e).__name__}: [Errno {e.errno}] {e.strerror}"
    u.close(); s.close()
    return dict(exp="udp_sizes", maxdgram=sh("sysctl -n net.inet.udp.maxdgram"), results=res)


def udp_drops_counter():
    out = sh("netstat -s -p udp")
    for line in out.splitlines():
        if "full socket buffers" in line:
            return int(line.strip().split()[0])
    return None


def udp_overflow():
    port = BASE + 4
    res = []
    for rcvbuf in (65536, 4 * 1024 * 1024):
        r = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        r.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, rcvbuf); r.bind(("127.0.0.1", port))
        eff = r.getsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        before = udp_drops_counter()
        N, size = 5000, 1200
        payload = b"q" * size
        t0 = time.perf_counter()
        for i in range(N):   # burst: the reader is not reading yet (it is "busy" for the whole burst)
            try:
                s.sendto(payload, ("127.0.0.1", port))
            except OSError:
                pass
        t_send = time.perf_counter() - t0
        r.settimeout(0.3); got = 0
        try:
            while True:
                r.recv(65536); got += 1
        except socket.timeout:
            pass
        after = udp_drops_counter()
        res.append(dict(so_rcvbuf_requested=rcvbuf, so_rcvbuf_effective=eff, sent=N, datagram_bytes=size, burst_ms=round(t_send * 1000, 1),
                        received=got, lost=N - got, kernel_counter_delta=(after - before) if after is not None and before is not None else None))
        r.close(); s.close(); time.sleep(0.2)
    return dict(exp="udp_overflow", note="5000 datagrams of 1200 bytes sent in one burst to a socket that reads only after the burst; netstat -s -p udp 'dropped due to full socket buffers' before and after (the counter is system-wide).", runs=res)


def backlog():
    port = BASE + 5
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", port)); ls.listen(2)
    res = {}; socks = {}
    def one(i):
        c = socket.socket(); c.settimeout(4.0); t0 = time.perf_counter()
        try:
            c.connect(("127.0.0.1", port)); res[i] = dict(client=i, connect="ok", connect_ms=round((time.perf_counter() - t0) * 1000, 1)); socks[i] = c
        except Exception as e:
            res[i] = dict(client=i, connect=type(e).__name__, connect_ms=round((time.perf_counter() - t0) * 1000, 1)); c.close()
    for i in range(8):
        one(i); time.sleep(0.05)
    # each client that "connected" now sends its request; then the server finally accepts everything queued
    for i, c in socks.items():
        try:
            c.sendall(b"hello %d" % i); res[i]["send"] = "ok"
        except Exception as e:
            res[i]["send"] = type(e).__name__
    ls.setblocking(False); accepted = []
    time.sleep(0.2)
    while True:
        try:
            a, addr = ls.accept(); a.settimeout(0.5)
            try:
                d = a.recv(100).decode()
            except Exception as e:
                d = type(e).__name__
            accepted.append(d); a.sendall(b"ok"); a.close()
        except BlockingIOError:
            break
    for i, c in socks.items():
        try:
            c.settimeout(1.0); d = c.recv(10); res[i]["reply"] = d.decode() if d else "closed (EOF)"
        except Exception as e:
            res[i]["reply"] = type(e).__name__ + (": " + str(e) if str(e) else "")
        c.close()
    ls.close()
    return dict(exp="backlog", listen_backlog=2, somaxconn=sh("sysctl -n kern.ipc.somaxconn"),
                clients=[res[i] for i in sorted(res)], accepted_later=accepted)


def time_wait():
    """macOS does not list TIME_WAIT sockets in netstat (checked: zero entries right after a close), so TIME_WAIT
    is taught from the Linux source and `ss -tan state time-wait` instead; this records that it could not be seen."""
    port = BASE + 6
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", port)); ls.listen(8)
    for i in range(20):
        c = socket.create_connection(("127.0.0.1", port)); a, _ = ls.accept(); c.close(); time.sleep(0.002); a.close()
    ls.close(); time.sleep(0.1)
    n = sum(1 for l in sh("netstat -an -p tcp").splitlines() if "TIME_WAIT" in l)
    return dict(exp="time_wait", connections_closed_by_client=20, time_wait_entries_listed_by_netstat=n,
                msl_ms=int(sh("sysctl -n net.inet.tcp.msl")),
                ephemeral_range=[int(sh("sysctl -n net.inet.ip.portrange.first")), int(sh("sysctl -n net.inet.ip.portrange.last"))])


def nodelay():
    res = {}
    port = BASE + 8
    async def main():
        got = {}
        async def handle(r, w):
            s = w.get_extra_info("socket"); got["asyncio_server_accepted"] = s.getsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY)
            w.close()
        srv = await asyncio.start_server(handle, "127.0.0.1", port)
        r, w = await asyncio.open_connection("127.0.0.1", port)
        got["asyncio_client"] = w.get_extra_info("socket").getsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY)
        await asyncio.sleep(0.1); w.close(); srv.close(); await srv.wait_closed()
        return got
    res.update(asyncio.run(main()))
    s = socket.socket(); res["plain_socket_default"] = s.getsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY); s.close()
    res = {k: bool(v) for k, v in res.items()}
    return dict(exp="nodelay", python=sys.version.split()[0], tcp_nodelay=res)


def mss():
    port = BASE + 9
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", port)); ls.listen(1)
    c = socket.create_connection(("127.0.0.1", port)); a, _ = ls.accept()
    d = struct.unpack(FMT, c.getsockopt(socket.IPPROTO_TCP, TCP_CONNECTION_INFO, struct.calcsize(FMT)))
    c.close(); a.close(); ls.close()
    return dict(exp="mss", loopback_mtu=sh("ifconfig lo0 | head -1 | sed 's/.*mtu //'"), loopback_maxseg=d[7], rcv_wscale=d[2],
                options_bits=d[4], note="options bits: 1 timestamps, 2 SACK, 4 window scaling, 8 ECN")


if __name__ == "__main__":
    which = sys.argv[1:] or ["boundaries", "udp_sizes", "udp_overflow", "backlog", "nodelay", "mss", "time_wait"]
    out = []
    for w in which:
        r = globals()[w](); r["recorded"] = time.strftime("%Y-%m-%d %H:%M %Z"); out.append(r)
        print(json.dumps(r), file=sys.stderr)
    print(json.dumps(out, indent=1))
