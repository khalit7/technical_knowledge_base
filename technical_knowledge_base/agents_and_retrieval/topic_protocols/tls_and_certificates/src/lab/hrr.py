"""Key-share guessing and HelloRetryRequest (RFC 9846 section 4.1.4), on an emulated 50 ms round trip.
openssl s_server accepts only some groups; openssl s_client offers groups with key shares for some of them.
A recording proxy adds 25 ms each way and parses every record (tlsparse.py), so we see whether the server
answered with a HelloRetryRequest and how long the handshake took.
Usage: OPENSSL=... python hrr.py <pki dir> <out.json>"""
import json, os, socket, subprocess, sys, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tlsparse import records, hs_messages, parse_hello
PKI, OUT = sys.argv[1], sys.argv[2]
OPENSSL = os.environ["OPENSSL"]
SP, PP, DELAY = 30230, 30231, 0.025
CASES = [
    ("client offers hybrid and classical shares; server takes hybrid", "*X25519MLKEM768:*x25519", "X25519MLKEM768:x25519"),
    ("client offers hybrid and classical shares; server only classical", "*X25519MLKEM768:*x25519", "x25519"),
    ("client sends only a hybrid share; server only classical", "*X25519MLKEM768:x25519", "x25519"),
    ("client sends only a classical share; server only hybrid", "*x25519:X25519MLKEM768", "X25519MLKEM768"),
    ("classical only on both sides", "*x25519", "x25519"),
]


def proxy(rec, done):
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", PP)); ls.listen(1)
    done.set()
    c, _ = ls.accept(); u = socket.create_connection(("127.0.0.1", SP)); t0 = time.perf_counter()

    def pipe(a, b, d):
        while True:
            try:
                x = a.recv(65536)
            except OSError:
                x = b""
            if not x:
                try: b.shutdown(socket.SHUT_WR)
                except OSError: pass
                return
            time.sleep(DELAY)
            rec.append({"t_ms": round((time.perf_counter() - t0) * 1000, 1), "dir": d, "raw": x}); b.sendall(x)
    th = [threading.Thread(target=pipe, args=(c, u, "c2s")), threading.Thread(target=pipe, args=(u, c, "s2c"))]
    [t.start() for t in th]; [t.join(8) for t in th]; c.close(); u.close(); ls.close()


res = {"recorded": time.strftime("%Y-%m-%d"), "openssl": subprocess.run([OPENSSL, "version"], capture_output=True, text=True).stdout.strip(),
       "one_way_delay_ms": DELAY * 1000, "cases": []}
for label, cg, sg in CASES:
    srv = subprocess.Popen([OPENSSL, "s_server", "-accept", str(SP), "-cert", PKI + "/fullchain.pem", "-key", PKI + "/leaf.key",
                            "-tls1_3", "-groups", sg, "-naccept", "1", "-quiet"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.4)
    rec, ready = [], threading.Event(); th = threading.Thread(target=proxy, args=(rec, ready)); th.start(); ready.wait()
    cl = subprocess.run([OPENSSL, "s_client", "-connect", "127.0.0.1:%d" % PP, "-servername", "api.llm.test", "-CAfile", PKI + "/root.pem",
                         "-tls1_3", "-groups", cg, "-brief"], input=b"", capture_output=True, timeout=15)
    th.join(10); srv.kill(); srv.wait()
    out = (cl.stdout + cl.stderr).decode(errors="replace")
    msgs, rest = [], {"c2s": b"", "s2c": b""}
    for r in rec:
        rs, rest[r["dir"]] = records(rest[r["dir"]] + r["raw"])
        for ct, hdr, frag in rs:
            item = {"t_ms": r["t_ms"], "dir": r["dir"], "len": len(frag)}
            if ct == 22:
                for t, m in hs_messages(frag):
                    if t in (1, 2):
                        h = parse_hello(m); item["msg"] = h["message"]
                        item["key_share"] = h.get("key_share") or h.get("key_share_selected_group")
            else:
                item["msg"] = {20: "ChangeCipherSpec", 23: "encrypted", 21: "alert"}.get(ct, str(ct))
            msgs.append(item)
    hrr = any(m.get("msg") == "HelloRetryRequest" for m in msgs)
    # the client's Finished is the last client record sent before the server's session tickets
    c_fin = [m["t_ms"] for m in msgs if m["dir"] == "c2s" and m.get("msg") == "encrypted"]
    grp = [l for l in out.splitlines() if "group" in l.lower() or "Temp Key" in l]
    case = {"label": label, "client_groups": cg, "server_groups": sg, "hello_retry": hrr, "negotiated": grp[0].strip() if grp else None,
            "client_finished_ms": c_fin[0] if c_fin else None, "records": msgs,
            "client_hello_bytes": sum(m["len"] + 5 for m in msgs if m.get("msg") == "ClientHello")}
    res["cases"].append(case)
    print(label, "| HRR", hrr, "|", case["negotiated"], "| client Finished at", case["client_finished_ms"], "ms | ClientHello bytes", case["client_hello_bytes"])
json.dump(res, open(OUT, "w"), indent=1)
