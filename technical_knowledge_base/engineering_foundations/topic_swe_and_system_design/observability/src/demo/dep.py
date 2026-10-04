"""retrieval: the dependency. Normal: ~15 ms. While the file out/incident exists, 15% of
calls are slow (900 ms, a cold replica) and 2% hang 1.5 s (past the caller's 1 s timeout)."""
import os, random, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from opentelemetry import trace
from opentelemetry.propagate import extract
from opentelemetry.trace import SpanKind
from prometheus_client import Histogram, CONTENT_TYPE_LATEST, generate_latest
from common import OUT, setup_logging, setup_tracing

tracer, provider = setup_tracing("retrieval")
log = setup_logging("retrieval")
H = Histogram("retrieval_search_duration_seconds", "Time to answer one search",
              buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5))
rng = random.Random(7)


class H_(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/metrics":
            b = generate_latest()
            self.send_response(200); self.send_header("Content-Type", CONTENT_TYPE_LATEST)
            self.end_headers(); self.wfile.write(b); return
        ctx = extract({k.lower(): v for k, v in self.headers.items()})  # reads the W3C traceparent header
        with tracer.start_as_current_span("GET /search", context=ctx, kind=SpanKind.SERVER,
                                          attributes={"http.request.method": "GET", "url.path": "/search"}) as sp:
            t0 = time.perf_counter()
            incident = os.path.exists(os.path.join(OUT, "incident"))
            u = rng.random()
            with tracer.start_as_current_span("vector index lookup") as s2:
                if incident and u < 0.02:
                    d = 1.5; s2.set_attribute("replica", "r3-cold")
                elif incident and u < 0.17:
                    d = 0.9; s2.set_attribute("replica", "r3-cold")
                else:
                    d = rng.lognormvariate(-4.3, 0.35); s2.set_attribute("replica", "r%d" % rng.randint(1, 2))
                time.sleep(d)
            sp.set_attribute("http.response.status_code", 200)
            dt = time.perf_counter() - t0
            H.observe(dt)
            log.info("search served", extra={"fields": {
                "traceparent_received": self.headers.get("traceparent"),
                "duration_ms": round(dt * 1000, 1)}})
            body = b'{"chunks":3}'
            try:
                self.send_response(200); self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8702), H_).serve_forever()
