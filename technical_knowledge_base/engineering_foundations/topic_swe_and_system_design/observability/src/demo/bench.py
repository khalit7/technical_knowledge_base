"""What does the telemetry itself cost? Time one span, one histogram observation, one counter
increment and one JSON log line, as the demo emits them, on this machine. Then profile a loop that
emits one request's worth of telemetry with a tiny sampling profiler (sys._current_frames every 1 ms,
the method continuous profilers use) and write collapsed stacks for a flame graph."""
import io, json, logging, os, sys, threading, time, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter, SpanExportResult
from prometheus_client import Counter, Histogram, CollectorRegistry
from common import JsonFormatter


class Null(SpanExporter):
    def export(self, spans):
        return SpanExportResult.SUCCESS


tp = TracerProvider(resource=Resource.create({"service.name": "bench"}))
tp.add_span_processor(BatchSpanProcessor(Null(), max_queue_size=100000))
trace.set_tracer_provider(tp)
tr = trace.get_tracer("bench")
reg = CollectorRegistry()
C = Counter("c", "c", ["route", "status"], registry=reg)
Hh = Histogram("h_seconds", "h", ["route"], registry=reg, buckets=(.05, .1, .25, .5, .75, 1, 1.5, 2.5, 5))
log = logging.getLogger("bench"); log.propagate = False
h = logging.StreamHandler(io.StringIO()); h.setFormatter(JsonFormatter("bench")); log.addHandler(h); log.setLevel(logging.INFO)
FIELDS = {"request_id": "810f1b1624f74fbe", "route": "/v1/chat", "status": 200, "duration_ms": 340.2,
          "user": "user7@example.com", "auth": "Bearer sk-demo-12345678"}


def t_span():
    with tr.start_as_current_span("x", attributes={"http.route": "/v1/chat"}):
        pass
def t_hist(): Hh.labels("/v1/chat").observe(0.34)
def t_count(): C.labels("/v1/chat", "200").inc()
def t_log(): log.info("request served", extra={"fields": FIELDS})
def t_debug_off(): log.debug("not emitted", extra={"fields": FIELDS})


def bench(f, n=20000, reps=5):
    best = 1e9
    for _ in range(reps):
        t = time.perf_counter()
        for _ in range(n):
            f()
        best = min(best, (time.perf_counter() - t) / n)
    return best * 1e6


res = {k: round(bench(f), 2) for k, f in
       [("span", t_span), ("histogram_observe", t_hist), ("counter_inc", t_count), ("json_log_line", t_log), ("debug_log_filtered", t_debug_off)]}


def one_request():  # what the demo's chat-api emits per request: 6 spans, 2 histograms, 1 counter, 1 log line
    with tr.start_as_current_span("POST /v1/chat"):
        for n in ("auth check", "load history", "GET retrieval /search", "model call", "save message"):
            with tr.start_as_current_span(n):
                pass
        Hh.labels("/v1/chat").observe(0.34); Hh.labels("/v1/chat").observe(0.02)
        C.labels("/v1/chat", "200").inc()
        log.info("request served", extra={"fields": FIELDS})


res["one_request_all_telemetry"] = round(bench(one_request, n=5000), 2)

# sampling profiler
stacks = collections.Counter(); stop = False; main = threading.get_ident()
def sampler():
    while not stop:
        f = sys._current_frames().get(main)
        st = []
        while f is not None:
            st.append(f"{f.f_code.co_name} ({os.path.basename(f.f_code.co_filename)})"); f = f.f_back
        stacks[";".join(reversed(st))] += 1
        time.sleep(0.001)
th = threading.Thread(target=sampler); th.start()
t = time.time()
while time.time() - t < 6:
    one_request()
stop = True; th.join()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
with open(os.path.join(OUT, "collapsed.txt"), "w") as f:
    for k, v in stacks.most_common():
        f.write(f"{k} {v}\n")
res["profile_samples"] = sum(stacks.values())
json.dump(res, open(os.path.join(OUT, "bench.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
