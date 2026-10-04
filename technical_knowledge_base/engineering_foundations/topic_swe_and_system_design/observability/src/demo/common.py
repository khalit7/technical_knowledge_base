"""Shared setup for the two demo services: OpenTelemetry tracing to a JSON-lines file,
JSON structured logs carrying trace and request ids, and a redaction filter.
Pinned: opentelemetry-sdk 1.45.0, prometheus-client 0.26.0 (see run.sh)."""
import json, logging, os, re, sys, time
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)


def setup_tracing(service):
    provider = TracerProvider(resource=Resource.create({
        "service.name": service, "service.version": "0.1.0",
        "deployment.environment.name": "local-demo"}))
    f = open(os.path.join(OUT, f"spans_{service}.jsonl"), "a", buffering=1)
    exporter = ConsoleSpanExporter(out=f, formatter=lambda s: s.to_json(indent=None) + "\n")
    provider.add_span_processor(BatchSpanProcessor(exporter, schedule_delay_millis=500))
    trace.set_tracer_provider(provider)
    return trace.get_tracer(service), provider


SECRET = re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._-]+")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


class JsonFormatter(logging.Formatter):
    """One JSON object per line. Adds the current trace and span ids so a log line
    can be joined to its trace; redacts bearer tokens and email addresses."""
    def __init__(self, service):
        super().__init__()
        self.service = service

    def format(self, r):
        ctx = trace.get_current_span().get_span_context()
        d = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(r.created)) + ".%03dZ" % r.msecs,
             "level": r.levelname, "service": self.service, "msg": r.getMessage()}
        if ctx.is_valid:
            d["trace_id"] = format(ctx.trace_id, "032x")
            d["span_id"] = format(ctx.span_id, "016x")
        d.update(getattr(r, "fields", {}))
        s = json.dumps(d, separators=(",", ":"))
        return EMAIL.sub("[email redacted]", SECRET.sub(r"\1[redacted]", s))


def setup_logging(service):
    log = logging.getLogger(service)
    log.setLevel(logging.INFO)
    h = logging.FileHandler(os.path.join(OUT, f"logs_{service}.jsonl"))
    h.setFormatter(JsonFormatter(service))
    log.addHandler(h)
    return log
