"""Build parts/22_js_ft_data.js (window.FT) from the redacted recordings in src/recordings/ and src/inputs/.
Run: python3 build_data.py   (then sh build.sh)"""
import glob, json, os, re, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
INP = os.path.join(HERE, "inputs")


def jl(p):
    return [json.loads(l) for l in open(p) if l.strip()] if os.path.exists(p) else []


def cut(s, n):
    s = s or ""
    return s if len(s) <= n else s[:n] + " [...]"


cases = json.load(open(os.path.join(INP, "cases.json")))
CASE_IDS = [c["id"] for c in cases]
TAGS = ["greedy", "t07_1", "t07_2"]

# ---------- routes ----------
ROUTES = [  # id, label, kind, file stem
    ("pai_tool", "Pydantic AI, tool output (default)", "local", "pai_tool"),
    ("pai_native", "Pydantic AI, NativeOutput", "local", "pai_native"),
    ("pai_prompted", "Pydantic AI, PromptedOutput", "local", "pai_prompted"),
    ("oai", "OpenAI Agents SDK, output_type", "local", "oai_output_type"),
    ("adk", "Google ADK, output_schema", "local", "adk_output_schema"),
    ("free", "No library, schema in prompt, free decoding", "outlines", "free"),
    ("constrained", "No library, schema in prompt, constrained decoding", "outlines", "constrained"),
    ("claude_haiku_schema", "Claude Haiku 4.5, --json-schema", "claude", "claude_haiku_schema"),
    ("claude_haiku_prompt", "Claude Haiku 4.5, schema in prompt", "claude", "claude_haiku_prompt"),
    ("claude_sonnet_schema", "Claude Sonnet 5.5, --json-schema", "claude", "claude_sonnet_schema"),
    ("claude_sonnet_prompt", "Claude Sonnet 5.5, schema in prompt", "claude", "claude_sonnet_prompt"),
]
SCORE = ["valid", "function_ok", "category_ok", "test_ok", "line_parses"]


def short_err(e):
    if not e:
        return None
    e = e.replace("UnexpectedModelBehavior: ", "").replace("ModelBehaviorError: ", "")
    return cut(e, 160)


def describe_request(rq):
    """A readable summary of where the schema sits in one recorded chat request."""
    out = []
    for m in rq.get("messages", []):
        c = m.get("content")
        if isinstance(c, list):
            c = " ".join(x.get("text", "") for x in c if isinstance(x, dict))
        c = c or ""
        if m["role"] == "system":
            if "Always respond with a JSON object" in c:
                head, _, tail = c.partition("Always respond")
                out.append("system: " + json.dumps(cut(head.strip(), 120)) + "\n  + SCHEMA AS TEXT (" + str(len("Always respond" + tail)) + " chars): " + json.dumps(cut("Always respond" + tail, 260)))
            else:
                out.append("system: " + json.dumps(cut(c, 220)))
        elif m["role"] == "user":
            out.append("user: " + json.dumps(cut(c.split("\n")[0], 90) + " [code and test output follow]"))
        else:
            out.append(m["role"] + ": " + json.dumps(cut(c, 90)))
    tools = rq.get("tools") or []
    if tools:
        for t in tools:
            f = t["function"]
            props = list((f.get("parameters") or {}).get("properties", {}))
            out.append("tools: " + f["name"] + "(" + ", ".join(props) + ")" + ("  <- SCHEMA AS TOOL" if f["name"] in ("final_result", "set_model_response") else ""))
    if "tool_choice" in rq:
        out.append("tool_choice: " + json.dumps(rq["tool_choice"]) + "  <- not read by this server")
    rf = rq.get("response_format")
    if rf:
        js = rf.get("json_schema", {})
        out.append("response_format: {type: " + json.dumps(rf.get("type")) + ", name: " + json.dumps(js.get("name")) + ", strict: " + json.dumps(js.get("strict")) + ", schema: {...}}  <- SCHEMA AS FIELD, not read by this server")
    return "\n".join(out)


def reply_text(resp):
    if not isinstance(resp, dict) or "choices" not in resp:
        return "(error) " + cut(json.dumps(resp), 200)
    m = resp["choices"][0]["message"]
    parts = []
    if m.get("content"):
        parts.append(m["content"])
    for tc in m.get("tool_calls") or []:
        parts.append("TOOL CALL " + tc["function"]["name"] + "(" + tc["function"]["arguments"] + ")")
    return "\n".join(parts)


def retry_text(rq):
    ms = rq.get("messages", [])
    if not ms:
        return None
    m = ms[-1]
    if m["role"] in ("tool", "user") and len(ms) > 2:
        c = m.get("content")
        if isinstance(c, list):
            c = " ".join(x.get("text", "") for x in c if isinstance(x, dict))
        return c
    return None


so = []      # one row per case per run per route
wire = {}    # route -> {req, cases: {case: {reply, retry, verdict}}}
for rid, label, kind, stem in ROUTES:
    wire[rid] = {"label": label, "kind": kind, "cases": {}}
    if kind == "local":
        for tag in TAGS:
            recs = jl(os.path.join(REC, "local", f"{stem}_{tag}.jsonl"))
            wl = jl(os.path.join(REC, "local", f"wire_{stem}_{tag}.jsonl"))
            i = 0
            for r in recs:
                calls = wl[i:i + r["calls"]]
                i += r["calls"]
                pt = [x for x in r.get("prompt_tokens", []) if x is not None]
                ct = [x for x in r.get("completion_tokens", []) if x is not None]
                so.append({"route": rid, "run": tag, "case": r["case"], **{k: bool(r[k]) for k in SCORE}, "calls": r["calls"],
                           "retries": r.get("retries", 0), "err": short_err(r.get("error")),
                           "pt0": pt[0] if pt else None, "pt": sum(pt), "ct": sum(ct), "conf": (r.get("obj") or {}).get("confidence")})
                if tag == "greedy" and calls:
                    if "req" not in wire[rid]:
                        wire[rid]["req"] = describe_request(calls[0]["request"])
                    rt = retry_text(calls[1]["request"]) if len(calls) > 1 else None
                    wire[rid]["cases"][r["case"]] = {"reply": cut(reply_text(calls[0]["response"]), 700),
                                                     "retry": cut(rt, 400) if rt else None,
                                                     "reply2": cut(reply_text(calls[1]["response"]), 400) if len(calls) > 1 else None,
                                                     "calls": r["calls"], "valid": bool(r["valid"]), "err": short_err(r.get("error")),
                                                     "obj": r.get("obj")}
    elif kind == "outlines":
        recs = [r for r in jl(os.path.join(REC, "local", "outlines.jsonl")) if r["mode"] == stem]
        wire[rid]["req"] = ("no HTTP request: the same model loaded in-process (mlx-lm 0.32.0), the chat template applied to\n"
                            "system: \"You triage failing tests ...\"\n  + SCHEMA AS TEXT: Pydantic AI's prompted-output template, verbatim\n"
                            "user: \"Triage this failing test. ...\"\n" +
                            ("logits processor: outlines 1.3.3 JSON-schema guide built from Triage  <- SCHEMA ENFORCED AT EVERY TOKEN" if stem == "constrained"
                             else "no logits processor: the model may write anything"))
        for r in recs:
            so.append({"route": rid, "run": r["run"], "case": r["case"], **{k: bool(r[k]) for k in SCORE}, "calls": 1,
                       "retries": 0, "err": short_err(r.get("error")), "pt0": None, "pt": None, "ct": r["out_tokens"], "conf": (r.get("obj") or {}).get("confidence")})
            if r["run"] == "greedy":
                wire[rid]["cases"][r["case"]] = {"reply": cut(r["text"], 700), "retry": None, "calls": 1, "valid": bool(r["valid"]),
                                                 "err": short_err(r.get("error")), "obj": r.get("obj")}
    else:
        recs = jl(os.path.join(REC, "claude", stem + ".jsonl"))
        model, mode = stem.split("_")[1], stem.split("_")[2]
        for r in recs:
            raw = jl(os.path.join(REC, "claude", f"raw_{model}_{mode}_{r['case']}.jsonl"))
            init = next((x for x in raw if x.get("subtype") == "init"), {})
            res = next((x for x in raw if x.get("type") == "result"), {})
            blocks = [b for x in raw if x.get("type") == "assistant" for b in x["message"].get("content", [])]
            think = sum(1 for b in blocks if b.get("type") == "thinking")
            rep = []
            for b in blocks:
                if b.get("type") == "text":
                    rep.append(b["text"])
                elif b.get("type") == "tool_use":
                    rep.append("TOOL CALL " + b["name"] + "(" + json.dumps(b["input"], ensure_ascii=False) + ")")
            text = res.get("result") or ""
            fenced = text.strip().startswith("```")
            lenient = None
            if mode == "prompt":
                t2 = re.sub(r"^```(?:json)?\s*|\s*```\s*$", "", text.strip())
                try:
                    o = json.loads(t2)
                    lenient = all(k in o for k in ("function", "category", "failing_test", "fixed_line", "confidence"))
                except Exception:
                    lenient = False
            so.append({"route": rid, "run": "once", "case": r["case"], **{k: bool(r[k]) for k in SCORE}, "calls": r["num_turns"],
                       "retries": 0, "err": short_err(r.get("error")), "pt0": r["in_tokens"], "pt": r["in_tokens"], "ct": r["out_tokens"],
                       "cost": r["cost"], "fenced": fenced, "lenient": lenient, "thinking": think, "conf": (r.get("obj") or {}).get("confidence")})
            if "req" not in wire[rid]:
                wire[rid]["req"] = ("claude -p (Claude Code " + str(init.get("claude_code_version")) + "), model " + str(init.get("model")) +
                                    ", built-in tools off\ntools offered: " + json.dumps(init.get("tools")) +
                                    ("  <- SCHEMA AS TOOL (--json-schema adds StructuredOutput)" if mode == "schema" else "") +
                                    ("\nappended system prompt: \"You triage ...\"\n  + SCHEMA AS TEXT: Pydantic AI's prompted-output template, verbatim" if mode == "prompt"
                                     else "\nappended system prompt: \"You triage ...\" (no schema text)") +
                                    "\nuser: \"Triage this failing test. ...\"")
            wire[rid]["cases"][r["case"]] = {"reply": cut("\n".join(rep) if rep else text, 700), "retry": None, "calls": r["num_turns"],
                                             "valid": bool(r["valid"]), "err": short_err(r.get("error")), "obj": r.get("obj"),
                                             "fenced": fenced, "lenient": lenient}

# ---------- validator demo ----------
val = []
for tag in TAGS:
    for r in jl(os.path.join(REC, "local", f"pai_validator_{tag}.jsonl")):
        val.append({"run": tag, "case": r["case"], **{k: bool(r[k]) for k in SCORE}, "calls": r["calls"],
                    "retries": [cut(t if isinstance(t, str) else "validation errors", 220) for t in r["retry_texts"]],
                    "err": short_err(r.get("error"))})

# ---------- schemas, smolagents executor ----------
schemas = json.load(open(os.path.join(REC, "demo", "schemas.json")))
smol = json.load(open(os.path.join(REC, "demo", "smol_exec.json")))
for s in smol:
    if s.get("output"):
        s["output"] = re.sub(r"'/scratch[^']*'?", "'(the working directory's full path)'", s["output"])


# ---------- mechanism demos ----------
def wire_summary(path):
    rows = []
    for x in jl(path):
        rq, rs = x["request"], x["response"]
        sysm = next((m.get("content") for m in rq.get("messages", []) if m["role"] == "system"), "") or ""
        u = rs.get("usage", {}) if isinstance(rs, dict) else {}
        rows.append({"sys": cut(sysm, 160), "tools": [t["function"]["name"] for t in rq.get("tools") or []],
                     "msgs": len(rq.get("messages", [])), "roles": [m["role"] for m in rq.get("messages", [])],
                     "rf": bool(rq.get("response_format")), "pt": u.get("prompt_tokens"), "ct": u.get("completion_tokens"),
                     "reply": cut(reply_text(rs), 260), "sec": round(x["t1"] - x["t0"], 1)})
    return rows


def tests_of(name):
    p = os.path.join(REC, "demo", name + ".tests.txt")
    if not os.path.exists(p):
        return None
    t = open(p).read()
    return {"pass": "exit 0" in t, "tests_unchanged": "same" in t.splitlines()[-1:], "out": cut(t.strip(), 300)}


mech = {}
for p in sorted(glob.glob(os.path.join(REC, "demo", "adk_task_*.json")) + glob.glob(os.path.join(REC, "demo", "adk_transfer_*.json")) +
                glob.glob(os.path.join(REC, "demo", "oai_*.json"))):
    name = os.path.basename(p)[:-5]
    d = json.load(open(p))
    d["wire"] = wire_summary(os.path.join(REC, "demo", "wire_" + name + ".jsonl"))
    d["tests"] = tests_of(name) or tests_of(name.replace("_greedy", ""))
    for e in d.get("events", []):
        for pt in e.get("parts", []):
            for k in ("text", "response"):
                if k in pt:
                    pt[k] = cut(pt[k], 300)
    mech[name] = d
card = json.load(open(os.path.join(REC, "demo", "adk_card.json"))) if os.path.exists(os.path.join(REC, "demo", "adk_card.json")) else None
trace_log = ""
for p in glob.glob(os.path.join(REC, "demo", "tracing_*.log")):
    trace_log = open(p).read().strip()

red = json.load(open(os.path.join(REC, "redaction.json")))
FT = {"cases": cases, "routes": [{"id": r[0], "label": r[1], "kind": r[2]} for r in ROUTES], "so": so, "wire": wire, "val": val,
      "schemas": schemas, "smol": smol, "mech": mech, "card": card, "trace_log": trace_log, "emdash": red["emdash_replaced"]}
js = "window.FT=" + json.dumps(FT, ensure_ascii=False, separators=(",", ":")) + ";\n"
js = js.replace(chr(0x2014), ", ").replace("</", "<\\/")
open(os.path.join(HERE, "parts", "22_js_ft_data.js"), "w").write(js)
print("FT bytes", len(js.encode()), "so rows", len(so), "val", len(val), "mech", sorted(mech))
