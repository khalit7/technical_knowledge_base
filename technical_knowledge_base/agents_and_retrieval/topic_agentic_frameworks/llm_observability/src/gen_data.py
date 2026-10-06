"""Build parts/22_js_data.js (window.FOBS) from data/, recordings/ and inputs/ only.
Usage: python3 gen_data.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
J = lambda p: json.load(open(os.path.join(H, p)))


def cut(v, n):
    t = v if isinstance(v, str) else json.dumps(v)
    return t if len(t) <= n else t[:n] + "… (" + format(len(t), ",") + " chars)"


# 1. semantic conventions at the pinned commit
sem = J("inputs/semconv_cb10b70.json")
SEM = {"commit": sem["commit"][:7], "date": sem["date"], "ops": sem["operation_names"], "providers": sem["provider_names"],
       "metrics": [[m["name"], m["instrument"], m["unit"], cut(m["brief"], 120)] for m in sem["metrics"]],
       "spans": [{"type": s["type"], "kind": s["kind"], "brief": cut(s["brief"], 200), "name": s["name_note"],
                  "attrs": [[a["key"], a["level"], 1 if a.get("sampling_relevant") else 0, cut(a["brief"], 110), cut(a["cond"], 90)]
                            for a in s["attributes"]]} for s in sem["spans"]]}

# 2. instrumentation variants (same replayed run)
ins = J("data/instrumentations.json")
INST = []


def slim(spans):
    """attribute values only on the first span of each kind (the rest repeat them); keys and classes on all"""
    seen, out = set(), []
    for s in spans:
        kind = (s["semtype"] or s["name"]).split(" ")[0]
        full = kind not in seen
        seen.add(kind)
        out.append([s["name"], s["kind"], s["parent"], s["trace"], s["t0"], s["t1"], s["semtype"] or "", s["missing_required"],
                    [[a[0], cut(a[1], 90) if full else "", a[2]] for a in s["attrs"]], s["bytes"], s["pii"]])
    return out


for v in ins["variants"]:
    INST.append({k: v[k] for k in ("key", "label", "package", "mode", "n_spans", "n_traces", "summary", "langfuse")} | {
        "spans": slim(v["spans"]),
        "logs": {"n": len(v["logs"]), "with_body": sum(1 for l in v["logs"] if l["body"]),
                 "pii": sum(l["pii"] for l in v["logs"]), "names": sorted({l["event"] for l in v["logs"]}),
                 "example": next((cut(l["body"], 200) for l in v["logs"] if l["body"] and "Dana" in l["body"]), None)}})

# 3. the local-model run (8 requests through the lock)
RUN = []
for line in open(os.path.join(H, "recordings/local_run_exchanges.jsonl")):
    r = json.loads(line)
    m = r["response"]["choices"][0]["message"]
    u = r["response"]["usage"]
    RUN.append({"call": r["call"], "secs": r["seconds_holding_lock"], "in": u["prompt_tokens"], "out": u["completion_tokens"],
                "cached": (u.get("prompt_tokens_details") or {}).get("cached_tokens", 0),
                "tools": [[c["function"]["name"], cut(c["function"]["arguments"], 80)] for c in m.get("tool_calls") or []],
                "text": cut(m.get("content") or "", 160)})

# 4. Claude Code end-to-end trace (app > Claude Code > test runner) and cost reconciliation
tr = J("recordings/cc_default_trace.json")
KEEP = ("tool_name", "input_tokens", "output_tokens", "cache_read_tokens", "cache_creation_tokens", "model", "stop_reason",
        "error_class", "decision", "source", "process.command_args", "gen_ai.operation.name", "app.feature", "app.user",
        "parent.source", "bash_command_class", "success", "app.total_cost_usd", "query_source_safe", "ttft_ms")
CC = {"spans": [[s["i"], s["parent"], s["service"], s["name"], s["t0"], s["t1"], s["status"] or 0,
                 {k: s["attrs"][k] for k in KEEP if k in s["attrs"]}] for s in tr],
      "identity_spans": sum(1 for s in tr if "user.email" in s["attrs"]),
      "cc_spans": sum(1 for s in tr if s["service"] == "claude-code")}
ct = J("recordings/cc_content_trace.json")
CC["content_identity_spans"] = sum(1 for s in ct if "user.email" in s["attrs"])
CC["content_cc_spans"] = sum(1 for s in ct if s["service"] == "claude-code")
CC["content_events"] = sum(1 for s in ct for e in s["events"] if e["name"] == "tool.output")
CC["bytes_default"] = sum(len(json.dumps(s["attrs"])) + len(json.dumps(s["events"])) for s in tr)
CC["bytes_content"] = sum(len(json.dumps(s["attrs"])) + len(json.dumps(s["events"])) for s in ct)
lf = J("data/langfuse_cc.json")
COST = {"result": lf["claude_code_result"]["total_cost_usd"], "turns": lf["claude_code_result"]["num_turns"],
        "usage": {k: lf["claude_code_result"]["usage"][k] for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens")},
        "cache_1h": lf["claude_code_result"]["usage"]["cache_creation"]["ephemeral_1h_input_tokens"],
        "metric": lf["cost_metric"],
        "ways": {k: {"total": lf[k]["total_cost"], "types": lf[k]["types"],
                     "gens": [[g["usage"], g["cost"]] for g in lf[k]["generations"]]} for k in ("raw", "mapped", "ttl")}}

# 5. sampling, redaction, scores, stack
SAMP = J("data/sampling.json")
SAMP["sent"] = [[s["name"], s["t"], 1 if s["error"] else 0] for s in SAMP["replay_failed"]["sent"]]
SAMP["injected"] = SAMP["replay_failed"]["injected_error_spans"]
del SAMP["replay_failed"]
RED = J("data/redaction.json")
RED["login_by_key"] = J("data/login_breakdown.json")
REDEX = J("data/redaction_examples.json")
for k in REDEX:
    for s in REDEX[k]:
        s["attrs"] = {a: cut(b, 200) for a, b in s["attrs"].items()}
        for e in s["events"]:
            e["attrs"] = {a: cut(b, 240) for a, b in e["attrs"].items()}
SC = J("data/scores.json")
STACK = J("data/langfuse_stack.json")
def gib(s):
    v, u = s.split()
    return float(v) / (1024 if u == "MiB" else 1)
STACK["ram_gib"] = round(sum(gib(v) for v in STACK["containers"].values()), 2)
STACK["images_gb_total"] = round(sum(STACK["images_gb"].values()), 2)

CFG = {k: open(os.path.join(H, "code/collector", k + ".yaml")).read() for k in ("to_langfuse", "redact", "sampling", "sampling2")}
out = {"cfg": CFG, "sem": SEM, "inst": INST, "run": RUN, "cc": CC, "cost": COST, "samp": SAMP, "red": RED, "redex": REDEX,
       "scores": SC, "stack": STACK}
txt = "window.FOBS=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n"
txt = txt.replace(chr(0x2014), ", ")
open(os.path.join(H, "parts/22_js_data.js"), "w").write(txt)
print("22_js_data.js", len(txt), {k: len(json.dumps(v)) for k, v in out.items()})
