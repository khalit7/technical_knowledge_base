"""Idempotency keys, measured on a toy: python idem_run.py OUT.json  (standard library only; port 30550 on 127.0.0.1; about 4 s)
A tiny HTTP server stands in for an LLM API's front door: POST /v1/messages "runs the model" (sleeps WORK_S), then saves the
message and charges a fixed price in one SQLite transaction. With an Idempotency-Key header it follows section 4's three steps
(the Stripe design): claim the key with an INSERT under a unique constraint; on a repeat compare the request fingerprint and
replay, refuse (409 while the first attempt runs) or reject (422 for a different body); store the response in the same
transaction as the work. The client's read timeout (CLIENT_TIMEOUT_S) is shorter than the work, so the first reply is lost
exactly as in a real timeout: the server finishes and commits, the client sees nothing. Four runs:
  nokey     two attempts without a key
  key       two attempts with one key, the retry after the first finished
  early     a retry with the same key while the first is still running (409), then a later retry (replayed)
  mismatch  the same key reused for a different message (422)
The price (10 credits) and the work time are illustrative settings of the toy; counts, statuses, headers and times are measured."""
import hashlib, http.client, http.server, json, sqlite3, sys, threading, time, uuid

PORT, WORK_S, CLIENT_TIMEOUT_S, PRICE = 30550, 0.30, 0.20, 10
lock = threading.Lock()
log = []          # server-side events, appended in order
T0 = [0.0]
now = lambda: round(time.monotonic() - T0[0], 3)


def db():
    c = sqlite3.connect(":memory:", check_same_thread=False, isolation_level=None)
    c.executescript("""CREATE TABLE messages(id TEXT PRIMARY KEY, body TEXT);
CREATE TABLE charges(msg TEXT, credits INT);
CREATE TABLE idem(key TEXT PRIMARY KEY, fp TEXT, status TEXT, code INT, resp TEXT);""")
    return c


DB = [db()]


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, code, body, extra=()):
        b = json.dumps(body).encode()
        try:
            self.send_response(code); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(b)))
            for k, v in extra:
                self.send_header(k, v)
            self.end_headers(); self.wfile.write(b)
        except (BrokenPipeError, ConnectionResetError):
            log.append(dict(t=now(), ev="reply not delivered (client gone)", code=code))

    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("content-length", 0)))
        key, fp, c = self.headers.get("Idempotency-Key"), hashlib.sha256(raw).hexdigest()[:12], DB[0]
        log.append(dict(t=now(), ev="request", key=key, fp=fp))
        if key:
            with lock:
                try:   # step 1: claim the key atomically (the unique constraint decides between racing attempts)
                    c.execute("INSERT INTO idem(key, fp, status) VALUES (?, ?, 'started')", (key, fp)); claimed = True
                except sqlite3.IntegrityError:
                    claimed = False
                    k_fp, k_st, k_code, k_resp = c.execute("SELECT fp, status, code, resp FROM idem WHERE key=?", (key,)).fetchone()
            if not claimed:   # step 2: compare and replay
                if k_fp != fp:
                    log.append(dict(t=now(), ev="key reused for a different request", code=422))
                    return self.reply(422, {"type": "error", "error": {"type": "idempotency_error", "message": "key used with a different request"}})
                if k_st == "started":
                    log.append(dict(t=now(), ev="first attempt still running", code=409))
                    return self.reply(409, {"type": "error", "error": {"type": "conflict", "message": "request with this key in progress"}})
                log.append(dict(t=now(), ev="replayed stored response", code=k_code))
                return self.reply(k_code, json.loads(k_resp), [("Idempotent-Replayed", "true")])
            log.append(dict(t=now(), ev="key claimed", status="started"))
        time.sleep(WORK_S)   # "the model runs"
        mid = "msg_" + str(sum(1 for _ in c.execute("SELECT id FROM messages")) + 1)
        resp = {"id": mid, "type": "message", "content": [{"type": "text", "text": "Blue."}]}
        with lock:   # step 3: the work and the stored response in one transaction
            c.execute("BEGIN")
            c.execute("INSERT INTO messages VALUES (?, ?)", (mid, raw.decode()))
            c.execute("INSERT INTO charges VALUES (?, ?)", (mid, PRICE))
            if key:
                c.execute("UPDATE idem SET status='done', code=201, resp=? WHERE key=?", (json.dumps(resp), key))
            c.execute("COMMIT")
        log.append(dict(t=now(), ev="work committed", msg=mid, credits=PRICE, key_done=bool(key)))
        self.reply(201, resp)


def send(body, key, timeout, at):
    while time.monotonic() - T0[0] < at:
        time.sleep(0.002)
    t = now(); conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=timeout)
    hdr = {"content-type": "application/json", **({"Idempotency-Key": key} if key else {})}
    try:
        conn.request("POST", "/v1/messages", json.dumps(body), hdr); r = conn.getresponse(); b = json.loads(r.read())
        return dict(sent=t, got=now(), status=r.status, replayed=r.getheader("Idempotent-Replayed"), body=b)
    except TimeoutError:
        return dict(sent=t, got=now(), status=None, outcome="client timeout: reply lost")
    finally:
        conn.close()


def run(name, plan):
    """plan: list of (body, key, client timeout, send at seconds after the run starts); attempts may overlap."""
    DB[0] = db(); log.clear(); T0[0] = time.monotonic(); out = [None] * len(plan)
    th = [threading.Thread(target=lambda i=i, p=p: out.__setitem__(i, send(*p))) for i, p in enumerate(plan)]
    [x.start() for x in th]; [x.join() for x in th]
    time.sleep(WORK_S + 0.1)
    c = DB[0]
    return dict(run=name, attempts=[dict(key=p[1], timeout_s=p[2], **o) for p, o in zip(plan, out)], server_log=sorted(log, key=lambda e: e["t"]),
                messages=c.execute("SELECT COUNT(*) FROM messages").fetchone()[0], credits=c.execute("SELECT COALESCE(SUM(credits),0) FROM charges").fetchone()[0])


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    msg = {"model": "toy", "max_tokens": 16, "messages": [{"role": "user", "content": "What colour is the sky?"}]}
    other = {"model": "toy", "max_tokens": 16, "messages": [{"role": "user", "content": "What colour is grass?"}]}
    k = lambda: str(uuid.UUID(int=0x7f3c9a0e2b414c559d1e6a8f0b2c4d71 + len(results)))   # fixed, readable keys so reruns diff cleanly
    results = []
    results.append(run("nokey", [(msg, None, CLIENT_TIMEOUT_S, 0), (msg, None, 5, 0.6)]))
    results.append(run("key", [(msg, k(), CLIENT_TIMEOUT_S, 0), (msg, k(), 5, 0.6)]))
    kk = k(); results.append(run("early", [(msg, kk, CLIENT_TIMEOUT_S, 0), (msg, kk, 5, 0.25), (msg, kk, 5, 0.6)]))
    kk = k(); results.append(run("mismatch", [(msg, kk, 5, 0), (other, kk, 5, 0.6)]))
    srv.shutdown()
    json.dump(dict(python=sys.version.split()[0], sqlite=sqlite3.sqlite_version, recorded=time.strftime("%Y-%m-%d"), work_s=WORK_S,
                   client_timeout_s=CLIENT_TIMEOUT_S, price_credits=PRICE, runs=results), open(sys.argv[1], "w"), indent=1)
    for r in results:
        print(r["run"], [a.get("status") for a in r["attempts"]], "messages", r["messages"], "credits", r["credits"])
