"""The plain agent loop (afsame's a1_plain.py) with OpenTelemetry GenAI spans.

Usage: python traced_loop.py MODE RUN_DIR
  MODE manual : our own spans, following the GenAI semantic conventions
                (invoke_agent > chat {model} and execute_tool {tool}); content captured (opt-in attributes)
  MODE auto   : no spans of our own; only opentelemetry-instrumentation-openai-v2 (what you get for free)
Env: BASE_URL (OpenAI-compatible, here the LiteLLM gateway), MODEL, API_KEY, OTLP (collector base URL),
     SPANS_JSON (also write every finished span to this file, one JSON per line).
The run happens inside RUN_DIR (a fresh copy of the task repo).
"""
import json, os, sys, time
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SimpleSpanProcessor, SpanExporter, SpanExportResult
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

MODE, RUN_DIR = sys.argv[1], sys.argv[2]


class JsonFile(SpanExporter):
    def __init__(self, path):
        self.path = path

    def export(self, spans):
        with open(self.path, "a") as f:
            for s in spans:
                f.write(s.to_json(indent=None) + "\n")
        return SpanExportResult.SUCCESS


prov = TracerProvider(resource=Resource.create({"service.name": "textstats-fixer"}))
prov.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=os.environ["OTLP"] + "/v1/traces")))
prov.add_span_processor(SimpleSpanProcessor(JsonFile(os.environ["SPANS_JSON"])))
trace.set_tracer_provider(prov)
tracer = trace.get_tracer("afops.traced_loop", "0.1")

if MODE == "auto":
    os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "true"
    from opentelemetry.instrumentation.openai_v2 import OpenAIInstrumentor
    OpenAIInstrumentor().instrument()

from openai import OpenAI  # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tools_impl import TASK, SYSTEM, list_files, read_file, edit_file, run_tests  # noqa: E402

os.chdir(RUN_DIR)
client = OpenAI(base_url=os.environ["BASE_URL"], api_key=os.environ.get("API_KEY", "local"), max_retries=0)
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


def parts(m):
    """A chat message in the semantic conventions' parts format (for the opt-in content attributes)."""
    out = []
    if m.get("content"):
        out.append({"type": "text" if m["role"] != "tool" else "tool_call_response",
                    **({"content": m["content"]} if m["role"] != "tool" else {"id": m["tool_call_id"], "response": m["content"]})})
    for c in m.get("tool_calls") or []:
        out.append({"type": "tool_call", "id": c["id"], "name": c["function"]["name"],
                    "arguments": json.loads(c["function"]["arguments"] or "{}")})
    return {"role": m["role"], "parts": out}


def chat(messages):
    if MODE == "auto":
        r = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS, max_tokens=2048)
        return r, {}
    with tracer.start_as_current_span(f"chat {MODEL}", kind=trace.SpanKind.CLIENT) as sp:
        sp.set_attributes({"gen_ai.operation.name": "chat", "gen_ai.provider.name": "openai",
                           "gen_ai.request.model": MODEL, "gen_ai.request.max_tokens": 2048,
                           "gen_ai.conversation.id": CONV, "server.address": "127.0.0.1",
                           "gen_ai.input.messages": json.dumps([parts(m) for m in messages[1:]]),
                           "gen_ai.system_instructions": json.dumps([{"type": "text", "content": messages[0]["content"]}]),
                           "gen_ai.tool.definitions": json.dumps(TOOLS)})
        raw = client.chat.completions.with_raw_response.create(model=MODEL, messages=messages, tools=TOOLS, max_tokens=2048)
        r = raw.parse()
        h = {k: raw.headers.get(k) for k in ("x-litellm-response-cost", "x-litellm-model-api-base",
                                             "x-litellm-attempted-retries", "x-litellm-attempted-fallbacks",
                                             "x-litellm-response-duration-ms", "x-litellm-model-group") if raw.headers.get(k) is not None}
        msg = r.choices[0].message.model_dump(exclude_none=True)
        sp.set_attributes({"gen_ai.response.model": r.model, "gen_ai.response.id": r.id,
                           "gen_ai.response.finish_reasons": [c.finish_reason for c in r.choices],
                           "gen_ai.usage.input_tokens": r.usage.prompt_tokens,
                           "gen_ai.usage.output_tokens": r.usage.completion_tokens,
                           "gen_ai.output.messages": json.dumps([parts(msg)])})
        for k, v in h.items():  # not semantic conventions: what the gateway reported in its response headers
            sp.set_attribute("litellm." + k.replace("x-litellm-", "").replace("-", "_"), v)
        return r, h


def tool(call):
    name = call.function.name
    if MODE == "auto":
        return run_tool(call)
    with tracer.start_as_current_span(f"execute_tool {name}", kind=trace.SpanKind.INTERNAL) as sp:
        sp.set_attributes({"gen_ai.operation.name": "execute_tool", "gen_ai.tool.name": name,
                           "gen_ai.tool.call.id": call.id, "gen_ai.tool.type": "function",
                           "gen_ai.tool.description": DESC.get(name, ""),
                           "gen_ai.tool.call.arguments": call.function.arguments or "{}"})
        res = run_tool(call)
        sp.set_attribute("gen_ai.tool.call.result", res[:4000])
        if res.startswith("error"):
            sp.set_attribute("error.type", "tool_error")
            sp.set_status(trace.Status(trace.StatusCode.ERROR, res[:200]))
        return res


def run_tool(call):
    try:
        args = json.loads(call.function.arguments or "{}")
        return FUNCS[call.function.name](**args)
    except Exception as e:
        return f"error: {e}"


def loop():
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": TASK}]
    turns = 0
    for turn in range(15):
        turns += 1
        r, _ = chat(messages)
        reply = r.choices[0].message
        messages.append(reply.model_dump(exclude_none=True))
        if not reply.tool_calls:
            return reply.content, turns
        for call in reply.tool_calls:
            messages.append({"role": "tool", "tool_call_id": call.id, "content": tool(call)})
    return "stopped: turn limit", turns


t0 = time.time()
if MODE == "manual":
    with tracer.start_as_current_span("invoke_agent textstats-fixer", kind=trace.SpanKind.INTERNAL) as root:
        root.set_attributes({"gen_ai.operation.name": "invoke_agent", "gen_ai.agent.name": "textstats-fixer",
                             "gen_ai.provider.name": "openai", "gen_ai.request.model": MODEL,
                             "gen_ai.conversation.id": CONV})
        final, turns = loop()
        root.set_attribute("afops.turns", turns)
else:
    final, turns = loop()
prov.shutdown()
print(json.dumps({"final": final, "turns": turns, "wall_s": round(time.time() - t0, 2), "tests": run_tests()[-300:]}))
