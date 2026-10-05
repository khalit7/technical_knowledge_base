"""Copy the Production stack tab's raw recordings into the repo, reduced and redacted.

Usage: python3 redact.py <raw dir: scratchpad/agents/recordings/afops>
Writes recordings/*.json here. The raw files stay in the scratchpad. What is kept:
- cc_otel_haiku.jsonl: the Claude Code stream (init reduced to a whitelist, ids to labels, signatures and
  rate-limit events dropped, paths to /work, em-dashes to ", ").
- cc_otel_spans.json / cc_otel_events.json: Claude Code's OpenTelemetry spans and log events, with only
  whitelisted attributes (no user, account, organisation, session or request ids; file paths to /work).
- loop_manual_spans.json / loop_auto_spans.json: our traced loop's spans (local model; content attributes
  truncated).
- gateway.json: each scenario's client view (status, time, gateway response headers without call, model or
  key hashes) and the upstream and backup logs.
- memory.json, evals.json: written by our own scripts from the local model and from redacted recordings.
Fails if anything private remains.
"""
import json, os, re, sys

RAW = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "recordings")
EMDASH = chr(0x2014)
ACCOUNT = os.path.basename(os.path.expanduser("~"))
counts = {"emdash": 0}
INIT_KEEP = ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version")
DROP = {"session_id", "uuid", "request_id", "memory_paths", "messaging_socket_path", "wire_tool_inputs",
        "wire_ingest_context", "tool_use_result", "tool_result_meta", "diagnostics", "signature"}


def scrub_str(s):
    s = re.sub(r"/private/tmp/[^\s\"'\\]*?/afops/runs/[A-Za-z0-9_\-]+", "/work", s)
    s = re.sub(r"/private/tmp/[^\s\"'\\]*", "/tmp/redacted", s)
    s = re.sub(r"/Users/[^/\s\"']+", "/home/user", s)
    s = re.sub(r"(?<=\s)" + re.escape(ACCOUNT) + r"(?=\s)", "user", s)
    n = s.count(EMDASH)
    if n:
        counts["emdash"] += n
        s = s.replace(EMDASH, ", ")
    return s


class Labels:
    def __init__(self):
        self.m = {}

    def __call__(self, kind, v):
        if (kind, v) not in self.m:
            self.m[(kind, v)] = f"{kind}{sum(1 for x in self.m if x[0] == kind) + 1}"
        return self.m[(kind, v)]


def scrub(o, L):
    if isinstance(o, dict):
        r = {}
        for k, v in o.items():
            if k in DROP:
                continue
            if k in ("id", "tool_use_id", "parent_tool_use_id") and isinstance(v, str):
                r[k] = L("msg" if v.startswith("msg_") else "tool", v)
                continue
            r[k] = scrub(v, L)
        return r
    if isinstance(o, list):
        return [scrub(x, L) for x in o]
    if isinstance(o, str):
        return scrub_str(o)
    return o


def stream(src, dst):
    L, out = Labels(), []
    for line in open(src):
        if not line.strip():
            continue
        r = json.loads(line)
        t = r.get("type")
        if t == "rate_limit_event" or (t == "system" and r.get("subtype") == "thinking_tokens"):
            continue
        if t == "system" and r.get("subtype") == "init":
            r = {k: r[k] for k in INIT_KEEP if k in r}
            r["cwd"] = "/work"
        out.append(json.dumps(scrub(r, L), ensure_ascii=False))
    open(dst, "w").write("\n".join(out) + "\n")
    return L


# ---- OpenTelemetry (OTLP JSON from the collector's file exporter) ----
def otlp_val(v):
    for k in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if k in v:
            return int(v[k]) if k == "intValue" else v[k]
    if "arrayValue" in v:
        return [otlp_val(x) for x in v["arrayValue"].get("values", [])]
    return None


CC_SPAN_KEEP = {"span.type", "model", "gen_ai.system", "gen_ai.request.model", "gen_ai.response.finish_reasons",
                "input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens", "duration_ms", "ttft_ms",
                "first_content_ms", "attempt", "success", "stop_reason", "llm_request.context", "query_source_safe",
                "speed", "tool_name", "decision", "source", "bash_argv0", "bash_command_class", "full_command",
                "file_path", "user_prompt_length", "interaction.duration_ms", "interaction.sequence", "error", "error_class",
                "parent.source", "gen_ai.tool.call.id", "tool_use_id"}
CC_EVENT_KEEP = {"event.name", "event.sequence", "model", "cost_usd", "duration_ms", "input_tokens", "output_tokens",
                 "cache_read_tokens", "cache_creation_tokens", "tool_name", "success", "decision", "source",
                 "prompt_length", "speed", "query_source_safe", "error", "status_code", "attempt", "tool_result_size_bytes"}


def spans_from(path, service, keep=None, L=None, trunc=600):
    L = L or Labels()
    spans = []
    for line in open(path):
        d = json.loads(line)
        for rs in d.get("resourceSpans", []):
            svc = next((otlp_val(a["value"]) for a in rs["resource"]["attributes"] if a["key"] == "service.name"), None)
            if svc != service:
                continue
            for ss in rs["scopeSpans"]:
                for s in ss["spans"]:
                    attrs = {}
                    for a in s.get("attributes", []):
                        k = a["key"]
                        if keep is not None and k not in keep:
                            continue
                        v = otlp_val(a["value"])
                        if k in ("gen_ai.tool.call.id", "tool_use_id", "gen_ai.response.id"):
                            v = L("call", v)
                        if isinstance(v, str):
                            v = scrub_str(v)
                            if len(v) > trunc:
                                v = v[:trunc] + f" [... {len(v) - trunc} more characters]"
                        attrs[k] = v
                    spans.append({"id": L("span", s["spanId"]), "parent": L("span", s["parentSpanId"]) if s.get("parentSpanId") else None,
                                  "name": s["name"], "kind": s.get("kind"), "t0": int(s["startTimeUnixNano"]) / 1e9,
                                  "t1": int(s["endTimeUnixNano"]) / 1e9, "status": (s.get("status") or {}).get("code"),
                                  "attrs": attrs, "events": [{"name": e["name"], "attrs": {a["key"]: otlp_val(a["value"]) for a in e.get("attributes", [])
                                                                                            if a["key"] in ("attempt",)}} for e in s.get("events", [])]})
    t0 = min(s["t0"] for s in spans) if spans else 0
    for s in spans:
        s["t0"], s["t1"] = round(s["t0"] - t0, 4), round(s["t1"] - t0, 4)
    return sorted(spans, key=lambda s: s["t0"]), L


def sdk_spans(path, trunc=600):
    """Spans written by our own JsonFile exporter (SDK to_json format)."""
    L, spans = Labels(), []
    for line in open(path):
        s = json.loads(line)
        attrs = {}
        for k, v in (s.get("attributes") or {}).items():
            if k in ("gen_ai.tool.call.id", "gen_ai.response.id"):
                v = L("call", v)
            if isinstance(v, str):
                v = scrub_str(v)
                if len(v) > trunc:
                    v = v[:trunc] + f" [... {len(v) - trunc} more characters]"
            attrs[k] = v
        ctx = s["context"]
        spans.append({"id": L("span", ctx["span_id"]), "parent": L("span", s["parent_id"]) if s.get("parent_id") else None,
                      "name": s["name"], "kind": s["kind"].replace("SpanKind.", ""), "t0": s["start_time"], "t1": s["end_time"],
                      "status": s["status"]["status_code"], "attrs": attrs,
                      "events": [{"name": e["name"], "attrs": {k: (scrub_str(v)[:trunc] if isinstance(v, str) else v) for k, v in (e.get("attributes") or {}).items()}}
                                 for e in s.get("events", [])]})
    from datetime import datetime
    def ts(x):
        return datetime.strptime(x.replace("Z", "+0000"), "%Y-%m-%dT%H:%M:%S.%f%z").timestamp()
    for s in spans:
        s["t0"], s["t1"] = ts(s["t0"]), ts(s["t1"])
    t0 = min(s["t0"] for s in spans)
    for s in spans:
        s["t0"], s["t1"] = round(s["t0"] - t0, 4), round(s["t1"] - t0, 4)
    return sorted(spans, key=lambda s: s["t0"])


def cc_events(path):
    ev = []
    for line in open(path):
        d = json.loads(line)
        for rl in d.get("resourceLogs", []):
            for sl in rl["scopeLogs"]:
                for r in sl["logRecords"]:
                    a = {x["key"]: otlp_val(x["value"]) for x in r.get("attributes", []) if x["key"] in CC_EVENT_KEEP}
                    if a.get("event.name") not in ("user_prompt", "api_request", "api_error", "tool_decision", "tool_result"):
                        continue  # hook, plugin and settings events describe the account's setup, not the run
                    a = {k: (scrub_str(v) if isinstance(v, str) else v) for k, v in a.items()}
                    ev.append({"t": int(r.get("timeUnixNano") or r.get("observedTimeUnixNano")) / 1e9, "body": scrub_str(str(otlp_val(r.get("body", {})) or "")), "attrs": a})
    t0 = min(e["t"] for e in ev) if ev else 0
    for e in ev:
        e["t"] = round(e["t"] - t0, 3)
    return sorted(ev, key=lambda e: e["t"])


GW_HDR_KEEP = {"x-litellm-model-api-base", "x-litellm-response-cost", "x-litellm-attempted-retries",
               "x-litellm-attempted-fallbacks", "x-litellm-key-spend", "x-litellm-key-max-budget", "x-litellm-timeout",
               "x-litellm-key-rpm-limit", "x-litellm-response-duration-ms", "x-litellm-overhead-duration-ms", "retry-after",
               "x-litellm-model-group", "x-litellm-version", "x-litellm-model-name"}


def gateway(raw):
    recs = [json.loads(l) for l in open(os.path.join(raw, "gw_rec.jsonl"))]
    up = [json.loads(l) for l in open(os.path.join(raw, "gw_upstream.jsonl"))]
    bk = [json.loads(l) for l in open(os.path.join(raw, "gw_backup.jsonl"))]
    out = []
    for r in recs:
        reqs = []
        for q in r["requests"]:
            b = q["body"]
            if isinstance(b, dict) and "error" in b:
                msg = re.sub(r"api_key: [0-9a-f]{20,}", "api_key: <hash>", str(b["error"].get("message") or ""))
                msg = re.sub(r"cooldown_list=\[[^\]]*\]", "cooldown_list=[<deployment hash>]", msg)
                msg = re.sub(r"Key=\S+ \(sk-[^)]*\)", "Key=<alias> (<key>)", msg)
                b = {"error": {"message": scrub_str(msg)[:600], "type": b["error"].get("type"), "code": b["error"].get("code")}}
            reqs.append({"t0": q["t0"], "t1": q["t1"], "status": q["status"], "key": q.get("key"), "spend_after": q.get("spend_after"),
                         "headers": {k: v for k, v in q["headers"].items() if k in GW_HDR_KEEP}, "body": b})
        out.append({"scenario": r["scenario"], "key_settings": r.get("key_settings"), "requests": reqs,
                    "upstream": [u for u in up if u["tag"] == r["scenario"]],
                    "backup": [{"t0": x["t0"], "t1": x["t1"], "status": x["status"]} for x in bk
                               if reqs and reqs[0]["t0"] - 0.5 <= x["t0"] <= reqs[-1]["t1"] + 0.5]})
    return out


def deep(o):
    """Scrub every string in a JSON value (keys and structure kept)."""
    if isinstance(o, dict):
        return {k: deep(v) for k, v in o.items()}
    if isinstance(o, list):
        return [deep(x) for x in o]
    return scrub_str(o) if isinstance(o, str) else o


def leaks():
    bad = []
    for root, _, files in os.walk(OUT):
        for fn in files:
            txt = open(os.path.join(root, fn)).read()
            for pat in ("/Users/", "Users-", ACCOUNT, "glpat", "sk-ant", EMDASH, "\\" + "u2014", "claude-502", "@gmail", "account_uuid",
                        "organization.id", "user.email", "sk-afops"):
                if pat in txt:
                    bad.append((fn, pat))
    return bad


def main():
    os.makedirs(OUT, exist_ok=True)
    L = stream(os.path.join(RAW, "cc_otel_haiku.jsonl"), os.path.join(OUT, "cc_otel_haiku.jsonl"))
    open(os.path.join(OUT, "cc_otel_haiku.diff"), "w").write(scrub_str(open(os.path.join(RAW, "cc_otel_haiku.diff")).read()))
    sp, _ = spans_from(os.path.join(RAW, "otel_traces.jsonl"), "claude-code", CC_SPAN_KEEP, L)
    json.dump(sp, open(os.path.join(OUT, "cc_otel_spans.json"), "w"), ensure_ascii=False, indent=0)
    json.dump(cc_events(os.path.join(RAW, "otel_logs.jsonl")), open(os.path.join(OUT, "cc_otel_events.json"), "w"), ensure_ascii=False, indent=0)
    for m in ("manual", "auto"):
        p = os.path.join(RAW, f"loop_{m}_spans.jsonl")
        if os.path.exists(p):
            json.dump(sdk_spans(p), open(os.path.join(OUT, f"loop_{m}_spans.json"), "w"), ensure_ascii=False, indent=0)
        p = os.path.join(RAW, f"loop_{m}_result.json")
        if os.path.exists(p):
            open(os.path.join(OUT, f"loop_{m}_result.json"), "w").write(scrub_str(open(p).read()))
    json.dump(gateway(RAW), open(os.path.join(OUT, "gateway.json"), "w"), ensure_ascii=False, indent=0)
    p = os.path.join(RAW, "gw_lesson.jsonl")
    if os.path.exists(p):
        les = []
        for l in open(p):
            r = json.loads(l)
            for q in r["requests"]:
                b = q["body"]
                if isinstance(b, dict) and "error" in b:
                    msg = re.sub(r"api_key: [0-9a-f]{20,}", "api_key: <hash>", str(b["error"].get("message") or ""))
                    msg = re.sub(r"cooldown_list=\[[^\]]*\]", "cooldown_list=[<deployment hash>]", msg)
                    b = {"error": {"message": scrub_str(msg)[:400], "type": b["error"].get("type")}}
                else:
                    b = {"ok": True}
                les.append({"scenario": r["scenario"], "status": q["status"], "s": round(q["t1"] - q["t0"], 2), "body": b})
        json.dump(les, open(os.path.join(OUT, "gateway_lesson.json"), "w"), ensure_ascii=False, indent=0)
    for fn in ("memory.json", "evals.json"):
        p = os.path.join(RAW, fn)
        if os.path.exists(p):
            json.dump(deep(json.load(open(p))), open(os.path.join(OUT, fn), "w"), ensure_ascii=False, indent=0)
    bad = leaks()
    json.dump({"emdash_replaced": counts["emdash"]}, open(os.path.join(OUT, "redaction.json"), "w"))
    print("em-dashes replaced:", counts["emdash"], "| leaks:", bad or "none")
    sys.exit(1 if bad else 0)


main()
