"""An 'application' that runs Claude Code headless as one step of its own trace.
It opens its own span, passes its W3C trace context to `claude -p` through TRACEPARENT (documented for -p and the
Agent SDK), and Claude Code's spans join the same trace. A python3 shim on PATH (shim/) lets the test runner that
Claude Code starts from Bash read the inherited TRACEPARENT and add a span of its own.
Usage: python cc_app.py LABEL WORKDIR OUTJSONL [content]   (OTLP collector at $OTLP)"""
import json, os, subprocess, sys, time
from opentelemetry import trace, propagate
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

LABEL, WORK, OUTF = sys.argv[1], sys.argv[2], sys.argv[3]
CONTENT = len(sys.argv) > 4 and sys.argv[4] == "content"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from agent_common import USER  # noqa: E402

prov = TracerProvider(resource=Resource.create({"service.name": "fixer-app"}))
prov.add_span_processor(SimpleSpanProcessor(OTLPSpanExporter(endpoint=os.environ["OTLP"] + "/v1/traces")))
trace.set_tracer_provider(prov)
tr = trace.get_tracer("fobs.app", "0.1")

env = dict(os.environ)
env.update({"CLAUDE_CODE_ENABLE_TELEMETRY": "1", "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA": "1",
            "OTEL_TRACES_EXPORTER": "otlp", "OTEL_LOGS_EXPORTER": "otlp", "OTEL_METRICS_EXPORTER": "otlp",
            "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf", "OTEL_EXPORTER_OTLP_ENDPOINT": os.environ["OTLP"],
            "OTEL_METRIC_EXPORT_INTERVAL": "2000", "FOBS_OTLP": os.environ["OTLP"], "OTEL_LOGS_EXPORT_INTERVAL": "1000",
            "PATH": os.path.join(os.path.dirname(HERE), "shim") + ":" + os.environ["PATH"]})
if CONTENT:
    env.update({"OTEL_LOG_USER_PROMPTS": "1", "OTEL_LOG_TOOL_DETAILS": "1", "OTEL_LOG_TOOL_CONTENT": "1"})
cmd = ["claude", "-p", USER, "--output-format", "stream-json", "--verbose", "--no-session-persistence",
       "--setting-sources", "project", "--strict-mcp-config", "--model", "haiku",
       "--tools", "Read,Edit,Bash,Grep,Glob", "--permission-mode", "acceptEdits",
       "--allowedTools", "Bash(python3 tests/test_core.py),Bash(python tests/test_core.py)",
       "--append-system-prompt", "Never use the em-dash character."]
with tr.start_as_current_span("handle_ticket", kind=trace.SpanKind.SERVER) as sp:
    sp.set_attributes({"app.ticket": "T-1", "app.feature": "repo-fixer", "app.user": "user-17"})
    carrier = {}
    propagate.inject(carrier)
    env["TRACEPARENT"] = carrier["traceparent"]
    with tr.start_as_current_span("invoke_agent claude-code", kind=trace.SpanKind.CLIENT) as ag:
        ag.set_attributes({"gen_ai.operation.name": "invoke_agent", "gen_ai.agent.name": "claude-code",
                           "gen_ai.provider.name": "anthropic", "gen_ai.request.model": "haiku"})
        carrier = {}
        propagate.inject(carrier)
        env["TRACEPARENT"] = carrier["traceparent"]
        t0 = time.time()
        p = subprocess.run(cmd, cwd=WORK, env=env, capture_output=True, text=True, timeout=900)
        open(OUTF, "w").write(p.stdout)
        res = [json.loads(l) for l in p.stdout.splitlines() if l.strip().startswith("{")]
        fin = [r for r in res if r.get("type") == "result"]
        if fin:
            ag.set_attribute("app.total_cost_usd", fin[-1].get("total_cost_usd", 0))
        ag.set_attribute("app.exit_code", p.returncode)
        print(json.dumps({"exit": p.returncode, "wall": round(time.time() - t0, 1), "stderr": p.stderr[-500:],
                          "result": (fin[-1] if fin else None) and {k: fin[-1].get(k) for k in ("subtype", "num_turns", "total_cost_usd", "result")},
                          "traceparent": env["TRACEPARENT"]}))
prov.shutdown()
