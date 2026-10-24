"""A TCP relay that records an SSH connection as an observer on the path sees it.
Until each side's NEWKEYS the SSH binary packets are plaintext, so it decodes them
(banner, message type, sizes, KEXINIT name-lists); after NEWKEYS it records only the
sizes and times of encrypted bytes. One JSON line per event, to the file given.
Usage: python3 wire_relay.py LISTEN_PORT TARGET_PORT OUT.jsonl [ONE_CONNECTION=1]
"""
import socket, sys, threading, time, json, struct
LP, TP, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
NAMES = {1:"DISCONNECT",2:"IGNORE",3:"UNIMPLEMENTED",4:"DEBUG",5:"SERVICE_REQUEST",6:"SERVICE_ACCEPT",7:"EXT_INFO",
         20:"KEXINIT",21:"NEWKEYS",30:"KEX_ECDH_INIT / KEX_HYBRID_INIT",31:"KEX_ECDH_REPLY / KEX_HYBRID_REPLY"}
LISTS = ["kex_algorithms","server_host_key_algorithms","encryption_c2s","encryption_s2c","mac_c2s","mac_s2c",
         "compression_c2s","compression_s2c","languages_c2s","languages_s2c"]
lock = threading.Lock(); t0 = [None]; fh = open(OUT, "w")
def log(d):
    with lock:
        now = time.perf_counter()
        if t0[0] is None: t0[0] = now
        d["t_ms"] = round((now - t0[0]) * 1000, 2); fh.write(json.dumps(d) + "\n"); fh.flush()
def kexinit(p):
    off = 17; out = {}
    for name in LISTS:
        n = struct.unpack(">I", p[off:off+4])[0]; out[name] = p[off+4:off+4+n].decode(); off += 4 + n
    return out
def pump(src, dst, dirn):
    buf = b""; banner_done = False; plain = True; enc_bytes = 0; enc_chunks = 0
    while True:
        try: data = src.recv(65536)
        except OSError: data = b""
        if not data:
            if enc_bytes: log({"dir": dirn, "ev": "encrypted_total", "bytes": enc_bytes, "chunks": enc_chunks})
            log({"dir": dirn, "ev": "close"})
            try: dst.shutdown(socket.SHUT_WR)
            except OSError: pass
            return
        dst.sendall(data)
        if not plain:
            enc_bytes += len(data); enc_chunks += 1
            log({"dir": dirn, "ev": "encrypted", "bytes": len(data)}); continue
        buf += data
        if not banner_done:
            if b"\r\n" not in buf: continue
            line, buf = buf.split(b"\r\n", 1); banner_done = True
            log({"dir": dirn, "ev": "banner", "text": line.decode(errors="replace"), "bytes": len(line) + 2})
        while plain and len(buf) >= 5:
            plen = struct.unpack(">I", buf[:4])[0]
            if len(buf) < 4 + plen: break
            pad = buf[4]; payload = buf[5:4 + plen - pad]; mt = payload[0]
            ev = {"dir": dirn, "ev": "packet", "msg": mt, "name": NAMES.get(mt, str(mt)), "wire_bytes": 4 + plen, "payload_bytes": len(payload)}
            if mt == 20: ev["lists"] = kexinit(payload)
            log(ev); buf = buf[4 + plen:]
            if mt == 21:
                plain = False
                if buf: enc_bytes += len(buf); enc_chunks += 1; log({"dir": dirn, "ev": "encrypted", "bytes": len(buf)})
                buf = b""
ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", LP)); ls.listen(4)
one = len(sys.argv) < 5 or sys.argv[4] == "1"
while True:
    c, _ = ls.accept(); s = socket.create_connection(("127.0.0.1", TP))
    log({"ev": "accept"})
    a = threading.Thread(target=pump, args=(c, s, "c2s")); b = threading.Thread(target=pump, args=(s, c, "s2c"))
    a.start(); b.start()
    if one: a.join(); b.join(); break
fh.close()
