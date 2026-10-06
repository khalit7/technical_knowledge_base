"""Compare what each instrumentation variant emitted for the same replayed run, against the GenAI conventions
(pinned commit) and against what Langfuse stored. Writes a compact JSON for the page.
Usage: python compare.py FOBS_DIR OUT.json"""
import json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from redact_common import scrub

F, OUT = sys.argv[1], sys.argv[2]
SEM = json.load(open(f"{F}/semconv.json"))
SPANTYPE = {s["type"]: s for s in SEM["spans"]}
REG_KEYS = set()
for s in SEM["spans"]:
    for a in s["attributes"]:
        REG_KEYS.add(a["key"])
import yaml  # noqa: E402
for a in yaml.safe_load(open(f"{F}/semconv/registry.yaml"))["attributes"]:
    REG_KEYS.add(a["key"])

VARIANTS = [
    ("manual", "Hand-written spans", "our code, opentelemetry-sdk 1.45.1", "content off"),
    ("manual_content", "Hand-written spans, content on", "our code, opentelemetry-sdk 1.45.1", "content on (opt-in attributes)"),
    ("otel_v2", "OpenTelemetry's openai-v2", "opentelemetry-instrumentation-openai-v2 2.4b0 (util-genai 0.4b0)", "default"),
    ("otel_v2_content", "openai-v2, content env var on", "same, OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true", "content on"),
    ("openllmetry", "OpenLLMetry (Traceloop)", "opentelemetry-instrumentation-openai 0.62.4", "default"),
    ("openinference", "OpenInference (Arize)", "openinference-instrumentation-openai 0.1.63", "default"),
    ("langfuse", "Langfuse drop-in client", "langfuse 4.17.0, from langfuse.openai import OpenAI", "default"),
    ("pydantic_ai", "Pydantic AI built-in", "pydantic-ai-slim 2.54.0, Agent.instrument_all()", "default"),
]
PII = re.compile(r"dana\.reyes@example\.com|ACCT-4417-2290")


def stype(s):
    op = s["attributes"].get("gen_ai.operation.name")
    if op == "chat":
        return "gen_ai.inference.client"
    if op == "execute_tool":
        return "gen_ai.execute_tool.internal"
    if op == "invoke_agent":
        return "gen_ai.invoke_agent.internal"
    if s["attributes"].get("openinference.span.kind") == "LLM" or s["attributes"].get("langfuse.observation.type") == "generation":
        return "gen_ai.inference.client"
    return None


def short(v, n=140):
    t = v if isinstance(v, str) else json.dumps(v)
    t = scrub(t)
    return t if len(t) <= n else t[:n] + "... (" + str(len(t)) + " chars)"


res = {"variants": []}
for key, label, pkg, mode in VARIANTS:
    S = [json.loads(l) for l in open(f"{F}/runs/v_{key}/spans.jsonl")]
    S.sort(key=lambda s: s["start_time"])
    ids = {s["context"]["span_id"]: i for i, s in enumerate(S)}
    traces = []
    for s in S:
        if s["context"]["trace_id"] not in traces:
            traces.append(s["context"]["trace_id"])
    from datetime import datetime
    def ts(x):
        return datetime.fromisoformat(x.replace("Z", "+00:00")).timestamp()
    t0 = ts(S[0]["start_time"])
    spans, cov = [], []
    for i, s in enumerate(S):
        a = s["attributes"]
        st = stype(s)
        sem = SPANTYPE.get(st)
        cls = {}
        for k in a:
            if sem and any(x["key"] == k for x in sem["attributes"]):
                lv = next(x["level"] for x in sem["attributes"] if x["key"] == k)
                cls[k] = lv
            elif k in REG_KEYS:
                cls[k] = "registry"
            elif k.startswith("gen_ai."):
                cls[k] = "gen_ai_other"
            else:
                cls[k] = "other"
        missing_req = []
        if sem:
            for x in sem["attributes"]:
                if x["level"] == "required" and x["key"] not in a:
                    missing_req.append(x["key"])
            rec = [x["key"] for x in sem["attributes"] if x["level"] == "recommended"]
            cov.append({"type": st, "req_missing": missing_req,
                        "rec_present": sum(1 for k in rec if k in a), "rec_total": len(rec)})
        spans.append({"name": s["name"], "kind": s["kind"].replace("SpanKind.", ""),
                      "parent": ids.get(s["parent_id"], -1), "trace": traces.index(s["context"]["trace_id"]),
                      "t0": round(ts(s["start_time"]) - t0, 3), "t1": round(ts(s["end_time"]) - t0, 3),
                      "scope": (s.get("instrumentation_scope") or {}).get("name") if isinstance(s.get("instrumentation_scope"), dict) else None,
                      "semtype": st, "missing_required": missing_req,
                      "attrs": [[k, short(v), cls[k]] for k, v in a.items()],
                      "bytes": len(json.dumps(a)), "pii": len(PII.findall(json.dumps(a)))})
    logs = []
    lp = f"{F}/runs/v_{key}/logs.jsonl"
    if os.path.exists(lp):
        for l in open(lp):
            d = json.loads(l)
            logs.append({"event": d["event_name"], "body": short(d["body"], 160) if d["body"] is not None else None,
                         "pii": len(PII.findall(json.dumps(d["body"])))})
    lf = json.load(open(f"{F}/lfdata/{key}.json"))["observations"]
    lfo = [{"name": o["name"], "type": o["type"], "model": o.get("model"),
            "usage": o.get("usageDetails") or {}, "has_input": bool(o.get("input")), "has_output": bool(o.get("output")),
            "session": o.get("sessionId") or None, "parent": bool(o.get("parentObservationId"))} for o in lf]
    allattr = collections.Counter(c for sp in spans for _, _, c in sp["attrs"])
    res["variants"].append({
        "key": key, "label": label, "package": pkg, "mode": mode,
        "n_spans": len(S), "n_traces": len(traces), "spans": spans, "logs": logs,
        "summary": {"agent_root": any(sp["semtype"] == "gen_ai.invoke_agent.internal" for sp in spans),
                    "tool_spans": sum(1 for sp in spans if sp["semtype"] == "gen_ai.execute_tool.internal"),
                    "model_spans": sum(1 for sp in spans if sp["semtype"] == "gen_ai.inference.client"),
                    "pii_in_spans": sum(sp["pii"] for sp in spans), "pii_in_logs": sum(l["pii"] for l in logs),
                    "log_events": len(logs), "bytes": sum(sp["bytes"] for sp in spans),
                    "attr_classes": dict(allattr),
                    "required_missing": sorted({k for c in cov for k in c["req_missing"]}),
                    "rec_cov_inference": next(([c["rec_present"], c["rec_total"]] for c in cov if c["type"] == "gen_ai.inference.client"), None)},
        "langfuse": {"observations": len(lfo), "types": dict(collections.Counter(o["type"] for o in lfo)),
                     "gen_with_usage": sum(1 for o in lfo if o["type"] == "GENERATION" and o["usage"]),
                     "with_input": sum(1 for o in lfo if o["has_input"]), "sessions": sorted({o["session"] for o in lfo if o["session"]}),
                     "first_generation": next((o for o in lfo if o["type"] == "GENERATION"), None)}})
json.dump(res, open(OUT, "w"), indent=0)
for v in res["variants"]:
    print(v["key"], v["n_spans"], v["n_traces"], v["summary"]["pii_in_spans"], v["summary"]["pii_in_logs"], v["summary"]["bytes"],
          v["summary"]["required_missing"], v["summary"]["rec_cov_inference"], v["langfuse"]["types"], v["langfuse"]["gen_with_usage"], v["langfuse"]["with_input"])
