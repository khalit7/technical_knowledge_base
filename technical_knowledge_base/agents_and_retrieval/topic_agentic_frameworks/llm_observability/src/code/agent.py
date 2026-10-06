"""One plain tool-calling agent loop (the frameworks root's plain loop) on the running example,
instrumented in one of several ways, so the SAME run can be compared span by span.

Usage: python agent.py MODE
MODE:
  record            no tracing; talks to BASE_URL (the locked proxy in front of the local model)
  none              no tracing (replay baseline)
  manual            hand-written spans following the OTel GenAI conventions, content NOT captured
  manual_content    the same with the opt-in content attributes
  otel_v2           opentelemetry-instrumentation-openai-v2 with its defaults
  otel_v2_content   the same with OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true
  openllmetry       Traceloop's opentelemetry-instrumentation-openai with its defaults
  openinference     Arize's openinference-instrumentation-openai with its defaults
  langfuse          Langfuse's drop-in `from langfuse.openai import OpenAI` with its defaults
Env: BASE_URL, MODEL, WORK (task directory, reset by the caller), OUT (directory for spans.jsonl, logs.jsonl, result.json),
     LF_OTLP (Langfuse OTLP traces URL; spans are also sent there), LF_AUTH (Basic auth header value).
"""
import json, os, sys, time

MODE = sys.argv[1]
OUT = os.environ["OUT"]
os.makedirs(OUT, exist_ok=True)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tools_impl import TASK, SYSTEM, list_files, read_file, edit_file, run_tests  # noqa: E402

USER = ("Hi, this is Dana Reyes (dana.reyes@example.com, customer ACCT-4417-2290). " + TASK)
TRACED = MODE not in ("record", "none")

if TRACED:
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExporter, SpanExportResult

    class JsonFile(SpanExporter):
        def __init__(self, path):
            self.path = path

        def export(self, spans):
            with open(self.path, "a") as f:
                for s in spans:
                    f.write(s.to_json(indent=None) + "\n")
            return SpanExportResult.SUCCESS

    if MODE.startswith("otel_v2"):
        # content and events go to the logs signal in this instrumentation: capture logs to a file too
        from opentelemetry._logs import set_logger_provider
        from opentelemetry.sdk._logs import LoggerProvider
        from opentelemetry.sdk._logs.export import SimpleLogRecordProcessor, LogExporter, LogExportResult

        class JsonLogs(LogExporter):
            def export(self, batch):
                with open(os.path.join(OUT, "logs.jsonl"), "a") as f:
                    for r in batch:
                        lr = r.log_record
                        f.write(json.dumps({"event_name": getattr(lr, "event_name", None), "body": lr.body, "attributes": dict(lr.attributes or {}), "trace_id": format(lr.trace_id or 0, "032x"), "span_id": format(lr.span_id or 0, "016x")}, default=str) + "\n")
                return LogExportResult.SUCCESS

            def shutdown(self):
                pass

            def force_flush(self, timeout_millis=30000):
                return True
        lp = LoggerProvider(resource=Resource.create({"service.name": "textstats-fixer"}))
        lp.add_log_record_processor(SimpleLogRecordProcessor(JsonLogs()))
        set_logger_provider(lp)

    if MODE != "langfuse":
        prov = TracerProvider(resource=Resource.create({"service.name": "textstats-fixer"}))
        prov.add_span_processor(SimpleSpanProcessor(JsonFile(os.path.join(OUT, "spans.jsonl"))))
        if os.environ.get("LF_OTLP"):
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            prov.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
                endpoint=os.environ["LF_OTLP"], headers={"Authorization": os.environ["LF_AUTH"]})))
        trace.set_tracer_provider(prov)
    tracer = trace.get_tracer("fobs.agent", "0.1")

    if MODE == "otel_v2_content":
        os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "true"
    if MODE.startswith("otel_v2"):
        from opentelemetry.instrumentation.openai_v2 import OpenAIInstrumentor
        OpenAIInstrumentor().instrument()
    elif MODE == "openllmetry":
        from opentelemetry.instrumentation.openai import OpenAIInstrumentor
        OpenAIInstrumentor().instrument()
    elif MODE == "openinference":
        from openinference.instrumentation.openai import OpenAIInstrumentor
        OpenAIInstrumentor().instrument()

if MODE == "langfuse":
    from langfuse import get_client
    from langfuse.openai import OpenAI
    lf = get_client()
    # also keep a local copy of every span the Langfuse SDK produces
    from opentelemetry import trace as _t
    _p = _t.get_tracer_provider()
    try:
        _p.add_span_processor(SimpleSpanProcessor(JsonFile(os.path.join(OUT, "spans.jsonl"))))
    except Exception as e:
        print("could not attach file exporter:", e, file=sys.stderr)
else:
    from openai import OpenAI

client = OpenAI(base_url=os.environ["BASE_URL"], api_key="local", max_retries=0)
MODEL = os.environ["MODEL"]


def schema(name, desc, props=None):
    props = props or {}
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": {k: {"type": "string"} for k in props},
                           "required": list(props)}}}


TOOLS = [schema("list_files", "List every file in the repository."),
         schema("read_file", "Return the text of one file.", ["path"]),
         schema("edit_file", "Replace the exact text old with new in a file; old must occur exactly once.",
                ["path", "old", "new"]),
         schema("run_tests", "Run the test suite and return its output.")]
FUNCS = {"list_files": list_files, "read_file": read_file, "edit_file": edit_file, "run_tests": run_tests}
DESC = {t["function"]["name"]: t["function"]["description"] for t in TOOLS}
CONV = "conv-1"
CONTENT = MODE == "manual_content"
MANUAL = MODE.startswith("manual")


def parts(m):
    out = []
    if m.get("content"):
        if m["role"] == "tool":
            out.append({"type": "tool_call_response", "id": m["tool_call_id"], "response": m["content"]})
        else:
            out.append({"type": "text", "content": m["content"]})
    for c in m.get("tool_calls") or []:
        out.append({"type": "tool_call", "id": c["id"], "name": c["function"]["name"],
                    "arguments": json.loads(c["function"]["arguments"] or "{}")})
    return {"role": m["role"], "parts": out}


def chat(messages):
    kw = dict(model=MODEL, messages=messages, tools=TOOLS, max_tokens=1024, temperature=0)
    if not MANUAL:
        return client.chat.completions.create(**kw)
    with tracer.start_as_current_span(f"chat {MODEL}", kind=trace.SpanKind.CLIENT) as sp:
        sp.set_attributes({"gen_ai.operation.name": "chat", "gen_ai.provider.name": "openai",
                           "gen_ai.request.model": MODEL, "gen_ai.request.max_tokens": 1024,
                           "gen_ai.request.temperature": 0.0,
                           "gen_ai.conversation.id": CONV, "server.address": "127.0.0.1"})
        if CONTENT:
            sp.set_attributes({"gen_ai.input.messages": json.dumps([parts(m) for m in messages[1:]]),
                               "gen_ai.system_instructions": json.dumps([{"type": "text", "content": messages[0]["content"]}]),
                               "gen_ai.tool.definitions": json.dumps(TOOLS)})
        r = client.chat.completions.create(**kw)
        msg = r.choices[0].message.model_dump(exclude_none=True)
        sp.set_attributes({"gen_ai.response.model": r.model, "gen_ai.response.id": r.id,
                           "gen_ai.response.finish_reasons": [c.finish_reason for c in r.choices],
                           "gen_ai.usage.input_tokens": r.usage.prompt_tokens,
                           "gen_ai.usage.output_tokens": r.usage.completion_tokens})
        if CONTENT:
            sp.set_attribute("gen_ai.output.messages", json.dumps([parts(msg)]))
        return r


def run_tool(call):
    try:
        args = json.loads(call.function.arguments or "{}")
        return FUNCS[call.function.name](**args)
    except Exception as e:
        return f"error: {e}"


def tool(call):
    name = call.function.name
    if not MANUAL:
        return run_tool(call)
    with tracer.start_as_current_span(f"execute_tool {name}", kind=trace.SpanKind.INTERNAL) as sp:
        sp.set_attributes({"gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": name,
                           "gen_ai.tool.call.id": call.id, "gen_ai.tool.type": "function",
                           "gen_ai.tool.description": DESC.get(name, "")})
        if CONTENT:
            sp.set_attribute("gen_ai.tool.call.arguments", call.function.arguments or "{}")
        res = run_tool(call)
        if CONTENT:
            sp.set_attribute("gen_ai.tool.call.result", res[:4000])
        if res.startswith("error"):
            sp.set_attribute("error.type", "tool_error")
            sp.set_status(trace.Status(trace.StatusCode.ERROR, res[:200]))
        return res


def loop():
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": USER}]
    turns = 0
    for _ in range(15):
        turns += 1
        r = chat(messages)
        reply = r.choices[0].message
        messages.append(reply.model_dump(exclude_none=True))
        if not reply.tool_calls:
            return reply.content, turns
        for call in reply.tool_calls:
            messages.append({"role": "tool", "tool_call_id": call.id, "content": tool(call)})
    return "stopped: turn limit", turns


os.chdir(os.environ["WORK"])
t0 = time.time()
if MANUAL:
    with tracer.start_as_current_span("invoke_agent textstats-fixer", kind=trace.SpanKind.INTERNAL) as root:
        root.set_attributes({"gen_ai.operation.name": "invoke_agent", "gen_ai.agent.name": "textstats-fixer",
                             "gen_ai.provider.name": "openai", "gen_ai.request.model": MODEL,
                             "gen_ai.conversation.id": CONV})
        final, turns = loop()
else:
    final, turns = loop()
tests = run_tests()
res = {"mode": MODE, "final": final, "turns": turns, "wall_s": round(time.time() - t0, 2), "tests_tail": tests[-200:]}
if TRACED and MODE != "langfuse":
    trace.get_tracer_provider().shutdown()
if MODE == "langfuse":
    lf.flush()
    lf.shutdown()
json.dump(res, open(os.path.join(OUT, "result.json"), "w"), indent=1)
print(json.dumps(res))
