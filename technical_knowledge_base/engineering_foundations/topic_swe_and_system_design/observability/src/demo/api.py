"""chat-api: a tiny version of the parent topic's chat product. POST /v1/chat does
auth -> load history (real SQLite) -> retrieval (HTTP call to dep.py, 1 s timeout)
-> model call (SIMULATED: a sleep, no real model) -> save message (real SQLite)."""
import json, os, random, sqlite3, threading, time, uuid, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from opentelemetry import trace
from opentelemetry.propagate import inject
from opentelemetry.trace import SpanKind, Status, StatusCode
from prometheus_client import REGISTRY, Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client.openmetrics.exposition import generate_latest as om_latest, CONTENT_TYPE_LATEST as OM_TYPE
from common import OUT, setup_logging, setup_tracing

tracer, provider = setup_tracing("chat-api")
log = setup_logging("chat-api")
REQS = Counter("http_requests", "HTTP requests handled", ["route", "status"])
LAT = Histogram("http_request_duration_seconds", "Time to answer one HTTP request", ["route"],
                buckets=(.05, .1, .25, .5, .75, 1, 1.5, 2.5, 5))
DEP = Histogram("dependency_duration_seconds", "Time spent in one call to a dependency", ["dependency"],
                buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5))
INFL = Gauge("http_requests_in_flight", "Requests being handled right now")
DB = os.path.join(OUT, "chat.db")
tl = threading.local()
rng = random.Random(11)
lock = threading.Lock()


def db():
    if not hasattr(tl, "c"):
        tl.c = sqlite3.connect(DB, timeout=5)
    return tl.c


def init_db():
    c = sqlite3.connect(DB)
    c.execute("create table if not exists messages(id integer primary key, conv text, role text, body text)")
    c.execute("create index if not exists m_conv on messages(conv)")
    c.commit(); c.close()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/metrics":
            om = "openmetrics" in (self.headers.get("Accept") or "")
            b = om_latest(REGISTRY) if om else generate_latest()
            self.send_response(200); self.send_header("Content-Type", OM_TYPE if om else CONTENT_TYPE_LATEST)
            self.end_headers(); self.wfile.write(b)
        else:
            self.send_response(404); self.end_headers()

    def reply(self, code, obj, rid):
        b = json.dumps(obj).encode()
        try:
            self.send_response(code)
            self.send_header("Content-Type", "application/problem+json" if code >= 400 else "application/json")
            self.send_header("X-Request-Id", rid); self.send_header("Content-Length", str(len(b)))
            self.end_headers(); self.wfile.write(b)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        route = "/v1/chat"
        rid = self.headers.get("X-Request-Id") or uuid.uuid4().hex[:16]
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        INFL.inc(); t0 = time.perf_counter(); status = 200
        with tracer.start_as_current_span("POST /v1/chat", kind=SpanKind.SERVER, attributes={
                "http.request.method": "POST", "http.route": route, "app.request_id": rid,
                "app.conversation_id": body.get("conv", "")}) as sp:
            try:
                with tracer.start_as_current_span("auth check"):
                    time.sleep(0.002)
                with tracer.start_as_current_span("load history", attributes={"db.system.name": "sqlite"}):
                    rows = db().execute("select role, body from messages where conv=? order by id desc limit 20",
                                        (body.get("conv", ""),)).fetchall()
                with tracer.start_as_current_span("GET retrieval /search", kind=SpanKind.CLIENT,
                                                  attributes={"server.address": "127.0.0.1", "server.port": 8702}) as cs:
                    headers = {}
                    inject(headers)  # writes the W3C traceparent header for this span
                    d0 = time.perf_counter()
                    try:
                        urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8702/search", headers=headers),
                                               timeout=1.0).read()
                    finally:
                        DEP.labels("retrieval").observe(time.perf_counter() - d0)
                    cs.set_attribute("http.response.status_code", 200)
                with tracer.start_as_current_span("model call (simulated)", attributes={"gen_ai.request.model": "demo"}):
                    with lock:
                        d = rng.lognormvariate(-1.25, 0.25)
                    time.sleep(d)
                with tracer.start_as_current_span("save message", attributes={"db.system.name": "sqlite"}):
                    c = db(); c.execute("insert into messages(conv, role, body) values (?,?,?)",
                                        (body.get("conv", ""), "user", body.get("text", ""))); c.commit()
                out = {"reply": "ok", "history_len": len(rows)}
            except Exception as e:  # the retrieval timeout lands here
                status = 503
                sp.record_exception(e); sp.set_status(Status(StatusCode.ERROR, "retrieval timed out"))
                out = {"type": "about:blank", "title": "Upstream timeout", "status": 503, "request_id": rid}
            dt = time.perf_counter() - t0
            sp.set_attribute("http.response.status_code", status)
            tid = format(sp.get_span_context().trace_id, "032x")
            LAT.labels(route).observe(dt, exemplar={"trace_id": tid})
            REQS.labels(route, str(status)).inc()
            INFL.dec()
            fields = {"request_id": rid, "route": route, "status": status, "duration_ms": round(dt * 1000, 1),
                      "user": body.get("user", ""), "auth": self.headers.get("Authorization", "")}
            if status >= 500:
                log.error("request failed: retrieval timed out", extra={"fields": fields})
            else:
                log.info("request served", extra={"fields": fields})
        self.reply(status, out, rid)


if __name__ == "__main__":
    init_db()
    ThreadingHTTPServer(("127.0.0.1", 8701), Handler).serve_forever()
