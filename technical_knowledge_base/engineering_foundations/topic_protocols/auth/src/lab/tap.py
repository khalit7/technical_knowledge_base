"""A byte-recording TCP proxy: python tap.py LISTEN_PORT TARGET_PORT NAME LOGFILE
Forwards 127.0.0.1:LISTEN_PORT to 127.0.0.1:TARGET_PORT and appends every chunk it relays to LOGFILE as one JSON line:
{"t": seconds since the tap started, "tap": NAME, "conn": n, "dir": "c2s" | "s2c", "data": text}.
It sees exactly the bytes on the wire (plain HTTP/1.1 here; the HTTPS metadata host is not tapped)."""
import json, socket, sys, threading, time

lp, tp, name, logf = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
lock = threading.Lock(); t0 = time.time(); n = [0]


def log(conn, d, data):
    with lock, open(logf, "a") as f:
        f.write(json.dumps({"t": round(time.time() - t0, 4), "tap": name, "conn": conn, "dir": d,
                            "data": data.decode("utf-8", "replace")}) + "\n")


def pipe(a, b, conn, d):
    try:
        while True:
            x = a.recv(65536)
            if not x:
                break
            log(conn, d, x); b.sendall(x)
    except OSError:
        pass
    finally:
        for s in (a, b):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("127.0.0.1", lp)); srv.listen(64)
while True:
    c, _ = srv.accept()
    n[0] += 1
    s = socket.create_connection(("127.0.0.1", tp))
    threading.Thread(target=pipe, args=(c, s, n[0], "c2s"), daemon=True).start()
    threading.Thread(target=pipe, args=(s, c, n[0], "s2c"), daemon=True).start()
