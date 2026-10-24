"""0-RTT replay lab (RFC 9846 section 8; RFC 8470). Two nginx "front ends" sharing a ticket key, early data on.
1. A client (openssl s_client) does a full handshake and keeps the session ticket.
2. It resumes with the running request sent as 0-RTT early data, through a recording proxy.
3. An attacker who recorded that first flight sends the same bytes again: to the same front end, and to the other one.
The backend counts generations. Then the same with nginx forwarding Early-Data: 1 and the backend answering 425.
Usage: OPENSSL=... NGINX_BIN=... python zero_rtt.py <work dir> <pki dir> <out.json>"""
import json, os, socket, subprocess, sys, threading, time
W, PKI, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
OPENSSL, NGINX = os.environ["OPENSSL"], os.environ["NGINX_BIN"]
PY = sys.executable
HERE = os.path.dirname(os.path.abspath(__file__))
BACK, PA, PA2, PB, PROXY = 30210, 30211, 30212, 30213, 30215
os.makedirs(W + "/ngx_tmp", exist_ok=True); os.makedirs(W + "/logs", exist_ok=True)
body = open(HERE + "/../../../src/wire/request.json", "rb").read().strip()
REQ = (b"POST /v1/messages HTTP/1.1\r\nHost: api.llm.test\r\ncontent-type: application/json\r\n"
       b"x-api-key: sk-wirelab-not-a-real-key\r\ncontent-length: %d\r\nconnection: close\r\n\r\n" % len(body)) + body
open(W + "/req.bin", "wb").write(REQ)
blog = W + "/backend.jsonl"
open(blog, "w").close()
if not os.path.exists(W + "/ticket.key"):
    open(W + "/ticket.key", "wb").write(os.urandom(80))


def server(port, front, rfc8470=False):
    extra = ("proxy_set_header Early-Data $ssl_early_data; proxy_set_header X-Reject-Early 1;" if rfc8470 else "")
    return ("server { listen 127.0.0.1:%d ssl; server_name api.llm.test; location / { proxy_pass http://127.0.0.1:%d; "
            "proxy_set_header X-Front %s; %s } }" % (port, BACK, front, extra))


tmpl = open(HERE + "/nginx_0rtt.conf.in").read()
for name, servers in (("ngxA", server(PA, "A") + "\n  " + server(PA2, "A-rfc8470", True)), ("ngxB", server(PB, "B"))):
    conf = tmpl.replace("@W@", W).replace("@PKI@", PKI).replace("@NAME@", name).replace("@SERVERS@", servers)
    open(W + "/%s.conf" % name, "w").write(conf)
procs = [subprocess.Popen([PY, HERE + "/backend.py", str(BACK), blog])]
for name in ("ngxA", "ngxB"):
    procs.append(subprocess.Popen([NGINX, "-p", W, "-c", W + "/%s.conf" % name]))
time.sleep(0.8)


def proxy_once(target, rec):
    """Forward one connection to target, recording each chunk with its direction and time."""
    ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", PROXY)); ls.listen(1)
    c, _ = ls.accept(); u = socket.create_connection(("127.0.0.1", target)); t0 = time.perf_counter()

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
            rec.append({"t_ms": round((time.perf_counter() - t0) * 1000, 2), "dir": d, "raw": x.hex()}); b.sendall(x)
    th = [threading.Thread(target=pipe, args=(c, u, "c2s")), threading.Thread(target=pipe, args=(u, c, "s2c"))]
    [t.start() for t in th]; [t.join(10) for t in th]; c.close(); u.close(); ls.close()


def s_client(port, extra, inp=b""):
    cmd = [OPENSSL, "s_client", "-connect", "127.0.0.1:%d" % port, "-servername", "api.llm.test", "-CAfile", PKI + "/root.pem",
           "-tls1_3", "-ign_eof"] + extra
    p = subprocess.run(cmd, input=inp, capture_output=True, timeout=20)
    return (p.stdout + p.stderr).decode(errors="replace")


def keep(out):
    keys = ("Reused", "New, TLSv1.3", "Early data", "HTTP/1.1", "generation", "error", "Verify return")
    return [l.strip() for l in out.splitlines() if any(k in l for k in keys)]


def first_flight(rec):
    out = b""
    for r in rec:
        if r["dir"] == "s2c":
            break
        out += bytes.fromhex(r["raw"])
    return out


def replay(port, data):
    s = socket.create_connection(("127.0.0.1", port)); s.settimeout(2); s.sendall(data); got = b""
    try:
        while True:
            x = s.recv(65536)
            if not x: break
            got += x
    except OSError:
        pass
    s.close(); return len(got)


def backend_since(n):
    lines = open(blog).read().splitlines()
    return [json.loads(l) for l in lines[n:]]


runs = []
for label, port, other in (("plain early data", PA, PB), ("RFC 8470: Early-Data header and 425", PA2, None)):
    run = {"label": label, "steps": []}
    sess = W + "/sess_%d.pem" % port
    n0 = len(open(blog).read().splitlines())
    out = s_client(port, ["-sess_out", sess], REQ)
    run["steps"].append({"step": "1. full handshake, request sent after it, ticket saved", "s_client": keep(out), "backend": backend_since(n0)})
    time.sleep(0.3); n0 = len(open(blog).read().splitlines())
    rec = []; th = threading.Thread(target=proxy_once, args=(port, rec)); th.start(); time.sleep(0.2)
    out = s_client(PROXY, ["-sess_in", sess, "-early_data", W + "/req.bin"]); th.join(12)
    ff = first_flight(rec)
    run["steps"].append({"step": "2. resumed, request sent as 0-RTT early data", "s_client": keep(out), "backend": backend_since(n0),
                         "first_flight_bytes": len(ff), "flights": [{"t_ms": r["t_ms"], "dir": r["dir"], "bytes": len(r["raw"]) // 2} for r in rec]})
    time.sleep(0.3); n0 = len(open(blog).read().splitlines())
    got = replay(port, ff); time.sleep(0.5)
    run["steps"].append({"step": "3. attacker replays the recorded first flight to the same front end", "reply_bytes": got, "backend": backend_since(n0)})
    if other:
        time.sleep(0.3); n0 = len(open(blog).read().splitlines())
        got = replay(other, ff); time.sleep(0.5)
        run["steps"].append({"step": "4. attacker replays it to another front end that shares the ticket key", "reply_bytes": got, "backend": backend_since(n0)})
        time.sleep(0.3); n0 = len(open(blog).read().splitlines())
        got = replay(port, ff); time.sleep(0.5)
        run["steps"].append({"step": "5. and once more to the first front end", "reply_bytes": got, "backend": backend_since(n0)})
    runs.append(run)

ver = subprocess.run([NGINX, "-v"], capture_output=True, text=True).stderr.strip()
for p in procs:
    p.terminate()
for p in procs:
    p.wait(5)
json.dump({"recorded": time.strftime("%Y-%m-%d"), "nginx": ver, "openssl": subprocess.run([OPENSSL, "version"], capture_output=True, text=True).stdout.strip(),
           "request_bytes": len(REQ), "runs": runs}, open(OUT, "w"), indent=1)
for r in runs:
    print("==", r["label"])
    for s in r["steps"]:
        print(s["step"], s.get("s_client", ""), s.get("first_flight_bytes", ""), [(b["front"], b["early_data_header"], b["status"], b["generation"]) for b in s["backend"]])
