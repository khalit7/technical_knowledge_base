# Runs at interpreter start in the shimmed python3. If a parent process handed down W3C trace context in
# TRACEPARENT (Claude Code does this for every Bash subprocess when tracing is on), open a span for this process
# under that parent and close it at exit.
import os, sys, atexit
if os.environ.get("TRACEPARENT") and os.environ.get("FOBS_OTLP"):
    from opentelemetry import trace, propagate
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    _p = TracerProvider(resource=Resource.create({"service.name": "test-runner"}))
    _p.add_span_processor(SimpleSpanProcessor(OTLPSpanExporter(endpoint=os.environ["FOBS_OTLP"] + "/v1/traces")))
    _ctx = propagate.extract({"traceparent": os.environ["TRACEPARENT"]})
    _sp = _p.get_tracer("fobs.shim").start_span("process " + " ".join(sys.argv)[:80], context=_ctx)
    _sp.set_attribute("process.command_args", " ".join(sys.argv)[:200])

    def _end():
        code = getattr(sys, "last_value", None)
        _sp.end()
        _p.shutdown()
    atexit.register(_end)
