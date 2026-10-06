"""Shared bits for the framework variants: the user message and a tracer provider that writes every span
to OUT/spans.jsonl and, if LF_OTLP is set, also sends it to Langfuse's OTLP endpoint."""
import os
from tools_impl import TASK

USER = ("Hi, this is Dana Reyes (dana.reyes@example.com, customer ACCT-4417-2290). " + TASK)


def setup_tracing(out):
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor, BatchSpanProcessor, SpanExporter, SpanExportResult

    class JsonFile(SpanExporter):
        def export(self, spans):
            with open(os.path.join(out, "spans.jsonl"), "a") as f:
                for s in spans:
                    f.write(s.to_json(indent=None) + "\n")
            return SpanExportResult.SUCCESS

    prov = TracerProvider(resource=Resource.create({"service.name": "textstats-fixer"}))
    prov.add_span_processor(SimpleSpanProcessor(JsonFile()))
    if os.environ.get("LF_OTLP"):
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        prov.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
            endpoint=os.environ["LF_OTLP"], headers={"Authorization": os.environ["LF_AUTH"]})))
    trace.set_tracer_provider(prov)
    return prov
