"""Proxy measurements for the HTTP page: what nginx changes in a request, how it and hypercorn answer ambiguous
(smuggling-shaped) messages, and which timeouts end a streaming request. Local only (nginx.conf.in, echo_backend.py,
lab_server.py). Writes raw/proxy_rewrite.json, raw/ambiguous.json, raw/timeouts.json.
Usage: python proxy_runs.py <ca.pem> <echo.jsonl> <raw dir>
"""
import json, os, socket, ssl, subprocess, sys, time
import h2.config, h2.connection, h2.events
import httpx

CA, ECHO, RAW = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
BODY = open(os.path.join(HERE, "../../../src/wire/request.json"), "rb").read()
KEY = "sk-wirelab-not-a-real-key"


def echo_lines():
    return [json.loads(l) for l in open(ECHO)] if os.path.exists(ECHO) else []


def curl(args):
    t0 = time.monotonic()
    p = subprocess.run(["curl", "-v", "-sS", "-o", "/dev/null", "-w", "%{http_code} %{http_version}"] + args, capture_output=True, text=True)
    sent = [l[2:] for l in p.stderr.splitlines() if l.startswith("> ") and l.strip() != ">"]
    alpn = [l[2:] for l in p.stderr.splitlines() if "ALPN" in l]
    return {"exit": p.returncode, "out": p.stdout, "sent_head": sent, "alpn": alpn, "seconds": round(time.monotonic() - t0, 3)}


# ---------- A. what a proxy changes ----------
def running_request(url, extra=()):
    return ["--cacert", CA, "--resolve", "api.llm.test:30310:127.0.0.1", "--resolve", "api.llm.test:30313:127.0.0.1", url,
            "-H", "content-type: application/json", "-H", "x-api-key: " + KEY, "--data-binary", "@" + os.path.join(HERE, "../../../src/wire/request.json"), *extra]


rewrite = []
for label, url, extra in [
        ("direct to the backend (what the client sends)", "http://127.0.0.1:30320/v1/messages", ["--http1.1"]),
        ("through nginx, HTTP/1.1 in, defaults (only proxy_pass)", "http://127.0.0.1:30311/v1/messages", ["--http1.1"]),
        ("through nginx, HTTP/2 over TLS in, defaults", "https://api.llm.test:30310/v1/messages", ["--http2"]),
        ("through nginx, HTTP/1.1 in, usual API settings", "http://127.0.0.1:30312/v1/messages", ["--http1.1"]),
        ("through nginx, HTTP/2 over TLS in, usual API settings", "https://api.llm.test:30313/v1/messages", ["--http2"])]:
    n0 = len(echo_lines())
    r = curl(running_request(url, extra))
    got = echo_lines()[n0:]
    rewrite.append({"label": label, "client": r, "backend_received": got[0]["raw"] if got else None})
json.dump({"recorded": time.strftime("%Y-%m-%d"), "nginx": "1.31.6", "client": "curl 8.7.1", "cases": rewrite},
          open(os.path.join(RAW, "proxy_rewrite.json"), "w"), indent=1)
print("rewrite", [c["client"]["out"] for c in rewrite])


# ---------- B. ambiguous HTTP/1.1 messages ----------
def raw_send(port, data, wait=1.5):
    s = socket.create_connection(("127.0.0.1", port)); s.settimeout(wait)
    s.sendall(data); out = b""
    try:
        while True:
            d = s.recv(65536)
            if not d: break
            out += d
    except socket.timeout:
        pass
    s.close()
    return out.decode("latin-1")


def statuses(resp):
    import re
    return re.findall(r"HTTP/1\.[01] \d{3}[^\r\n]*", resp)


H = "POST /v1/messages HTTP/1.1\r\nHost: api.llm.test\r\ncontent-type: application/json\r\n"
PROBES = [
    ("cl_and_te", "Content-Length and Transfer-Encoding: chunked together",
     H + "Content-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /smuggled HTTP/1.1\r\nHost: x\r\n\r\n"),
    ("two_cl", "Two Content-Length headers that disagree", H + "Content-Length: 3\r\nContent-Length: 5\r\n\r\nabcde"),
    ("te_obfuscated", "Transfer-Encoding: xchunked (an unknown coding)", H + "Transfer-Encoding: xchunked\r\n\r\n0\r\n\r\n"),
    ("te_space", "A space before the colon: 'Transfer-Encoding : chunked'", H + "Transfer-Encoding : chunked\r\n\r\n0\r\n\r\n"),
    ("obs_fold", "A folded header line (obs-fold)", H + "Content-Length: 2\r\nX-Note: first\r\n second\r\n\r\nok"),
    ("no_host", "HTTP/1.1 without a Host header", "GET /health HTTP/1.1\r\n\r\n"),
    ("bare_lf", "Lines ended by LF alone, no CR", "GET /health HTTP/1.1\nHost: api.llm.test\n\n"),
    ("pipelined", "Two requests in one write (pipelining), as a control", "GET /health HTTP/1.1\r\nHost: a\r\n\r\nGET /health HTTP/1.1\r\nHost: a\r\nConnection: close\r\n\r\n"),
]
amb = []
for pid, what, msg in PROBES:
    row = {"id": pid, "what": what, "sent": msg}
    for name, port in [("nginx", 30311), ("hypercorn", 30301)]:
        n0 = len(echo_lines())
        resp = raw_send(port, msg.encode("latin-1"))
        row[name] = {"status_lines": statuses(resp)}
        if name == "nginx":
            row[name]["backend_received"] = [e["raw"] for e in echo_lines()[n0:]]
    amb.append(row); print(pid, row["nginx"]["status_lines"], row["hypercorn"]["status_lines"])


# HTTP/2 in front, HTTP/1.1 behind: header values that HTTP/2 can carry but HTTP/1.1 cannot
def h2_probe(headers, body):
    ctx = ssl.create_default_context(cafile=CA); ctx.set_alpn_protocols(["h2"])
    s = ctx.wrap_socket(socket.create_connection(("127.0.0.1", 30310)), server_hostname="api.llm.test")
    cfg = h2.config.H2Configuration(client_side=True, validate_outbound_headers=False, normalize_outbound_headers=False,
                                    validate_inbound_headers=False)
    c = h2.connection.H2Connection(cfg); c.initiate_connection(); s.sendall(c.data_to_send())
    sid = c.get_next_available_stream_id()
    c.send_headers(sid, headers, end_stream=not body)
    if body:
        c.send_data(sid, body, end_stream=True)
    s.sendall(c.data_to_send()); s.settimeout(2)
    out = {"status": None, "reset": None, "goaway": None}
    try:
        while True:
            d = s.recv(65536)
            if not d: break
            for ev in c.receive_data(d):
                if isinstance(ev, h2.events.ResponseReceived):
                    out["status"] = dict(ev.headers).get(b":status", b"").decode()
                if isinstance(ev, h2.events.StreamReset):
                    out["reset"] = int(ev.error_code)
                if isinstance(ev, h2.events.ConnectionTerminated):
                    out["goaway"] = int(ev.error_code)
            s.sendall(c.data_to_send())
            if out["status"] or out["reset"] is not None or out["goaway"] is not None:
                break
    except (socket.timeout, ssl.SSLError, ConnectionError):
        pass
    s.close()
    return out


base = [(b":method", b"POST"), (b":scheme", b"https"), (b":authority", b"api.llm.test"), (b":path", b"/v1/messages")]
for pid, what, hdrs, body in [
        ("h2_crlf_value", "HTTP/2 header value containing CR LF and a second header",
         base + [(b"x-note", b"a\r\nTransfer-Encoding: chunked")], b"0\r\n\r\n"),
        ("h2_cl_mismatch", "HTTP/2 content-length: 5 with a 117-byte body", base + [(b"content-length", b"5")], BODY),
        ("h2_te_header", "HTTP/2 request carrying transfer-encoding: chunked", base + [(b"transfer-encoding", b"chunked")], b"0\r\n\r\n")]:
    n0 = len(echo_lines())
    r = h2_probe(hdrs, body)
    r["backend_received"] = [e["raw"] for e in echo_lines()[n0:]]
    amb.append({"id": pid, "what": what, "sent": repr(hdrs[4:]) + " body " + str(len(body)) + " bytes", "nginx_h2": r})
    print(pid, r)
json.dump({"recorded": time.strftime("%Y-%m-%d"), "servers": {"nginx": "1.31.6 (plain HTTP/1.1 port 30311 in front of echo_backend.py; HTTP/2 port 30310)",
           "hypercorn": "0.18.0 with h11 0.16.0 (lab_server.py plain port 30301)"}, "probes": amb},
          open(os.path.join(RAW, "ambiguous.json"), "w"), indent=1)


# ---------- C. timeouts on a streaming request ----------
def stream_curl(port, hdrs, extra=()):
    t0 = time.monotonic()
    p = subprocess.Popen(["curl", "-sS", "-N", f"http://127.0.0.1:{port}/v1/messages", "-H", "content-type: application/json",
                          "-H", "x-api-key: " + KEY, "--data-binary", "@" + os.path.join(HERE, "../../../src/wire/request.json"),
                          "-w", "\n__HTTP %{http_code}", *extra] + sum([["-H", f"{k}: {v}"] for k, v in hdrs.items()], []),
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = p.communicate()
    txt = out.decode()
    return {"exit": p.returncode, "seconds": round(time.monotonic() - t0, 2), "tokens": txt.count('"text_delta"'),
            "pings": txt.count(": ping"), "stop": "message_stop" in txt, "http": txt.rsplit("__HTTP ", 1)[-1].strip(),
            "err": err.decode().strip()[:160]}


def stream_httpx(port, hdrs, read):
    t0 = time.monotonic(); n = 0; err = None
    try:
        with httpx.Client(timeout=httpx.Timeout(10.0, read=read)) as c:
            with c.stream("POST", f"http://127.0.0.1:{port}/v1/messages", content=BODY,
                          headers={"content-type": "application/json", "x-api-key": KEY, **hdrs}) as r:
                for line in r.iter_lines():
                    n += '"text_delta"' in line
    except Exception as e:
        err = type(e).__name__
    return {"seconds": round(time.monotonic() - t0, 2), "tokens": n, "error": err}


T = []
cases = [
    ("think 1 s, nginx idle timeout 2 s", 30314, {"x-lab-think": "1"}, ()),
    ("think 3 s, nginx idle timeout 2 s", 30314, {"x-lab-think": "3"}, ()),
    ("think 3 s with a ping every 1 s, nginx idle timeout 2 s", 30314, {"x-lab-think": "3", "x-lab-ping": "1"}, ()),
    ("8 tokens 1.5 s apart (11.5 s in all), nginx idle timeout 2 s", 30314, {"x-lab-think": "1", "x-lab-tokens": "8", "x-lab-gap": "1.5"}, ()),
    ("the same stream, client total limit 5 s (curl --max-time 5)", 30314, {"x-lab-think": "1", "x-lab-tokens": "8", "x-lab-gap": "1.5"}, ("--max-time", "5")),
    ("not streamed, answer after 3 s, nginx idle timeout 2 s", 30315, {"x-lab-think": "3", "x-lab-nostream": "1"}, ()),
]
for label, port, hd, extra in cases:
    if hd.pop("x-lab-nostream", None):
        t0 = time.monotonic()
        p = subprocess.run(["curl", "-sS", f"http://127.0.0.1:{port}/v1/messages", "-H", "content-type: application/json",
                            "--data-binary", '{"model":"wire-lab-1","max_tokens":16,"messages":[{"role":"user","content":"What colour is the sky?"}]}',
                            "-w", "\n__HTTP %{http_code}"] + sum([["-H", f"{k}: {v}"] for k, v in hd.items()], []), capture_output=True, text=True)
        r = {"exit": p.returncode, "seconds": round(time.monotonic() - t0, 2), "http": p.stdout.rsplit("__HTTP ", 1)[-1].strip(),
             "body": p.stdout.rsplit("\n__HTTP", 1)[0][:120], "err": p.stderr.strip()[:160]}
    else:
        r = stream_curl(port, hd, extra)
    T.append({"label": label, "port": port, "headers": hd, "curl": r}); print(label, r)
r = stream_httpx(30301, {"x-lab-think": "1", "x-lab-tokens": "8", "x-lab-gap": "1.5"}, 2.0)
T.append({"label": "the same stream direct, httpx read timeout 2 s (resets on every chunk)", "port": 30301, "httpx": r}); print(r)
r = stream_httpx(30301, {"x-lab-think": "3"}, 2.0)
T.append({"label": "think 3 s direct, httpx read timeout 2 s", "port": 30301, "httpx": r}); print(r)
json.dump({"recorded": time.strftime("%Y-%m-%d"), "nginx": "1.31.6", "curl": "8.7.1", "httpx": httpx.__version__, "cases": T},
          open(os.path.join(RAW, "timeouts.json"), "w"), indent=1)
