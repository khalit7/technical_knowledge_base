#!/usr/bin/env python3
"""Build the page's data from the raw recordings (kept in the scratch folder, never committed).

Writes redacted copies under recordings/ and the embedded data parts/22_js_hb_data.js (window.HB).
Usage: build_data.py RAW_DIR   (RAW_DIR: the scratch folder holding runs/, bench/, cc/, boundary/)
Redaction: the task-copy path becomes /work, ids become short labels, thinking signatures are dropped,
rate-limit events and account fields are dropped, em-dashes in model text become ", ".
"""
import difflib, getpass, glob, json, os, re, socket, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "editbench"))
import tasks as T

RAW = sys.argv[1]
REC = os.path.join(HERE, "recordings")
os.makedirs(REC, exist_ok=True)
EM = chr(0x2014)   # the em-dash, written by code point so this file contains none
LOGIN, HOST = getpass.getuser(), socket.gethostname().split(".")[0]   # read at build time, never stored
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "topic_protocols", "src"))
import private_patterns as PP   # machine-specific patterns kept in a git-ignored file


def clean(s):
    """Model or tool text bound for the page: no em-dashes, no local paths."""
    if not isinstance(s, str):
        return s
    s = s.replace(EM, ", ")
    s = re.sub(r"/(?:private/)?(?:tmp|var)/[^\s\"']*?/hbuild/(?:cc/)?w_[A-Za-z0-9_]+", "/work", s)
    s = re.sub(r"/(?:private/)?tmp/claude-\d+/[^\s\"']*", "/scratch", s)
    s = re.sub(r"/U[s]ers/[^\s\"']*", "/home/user", s)
    s = re.sub(rf"\b{re.escape(LOGIN)}\b", "user", s)
    if HOST:
        s = s.replace(HOST, "host")
    s = re.sub(PP.alternation(), "[redacted]", s)
    return s


def deep(o):
    if isinstance(o, str):
        return clean(o)
    if isinstance(o, list):
        return [deep(x) for x in o]
    if isinstance(o, dict):
        return {k: deep(v) for k, v in o.items()}
    return o


# ------------------------------------------------------------------ edit-format bench
PRIMARY = {"exact": "exact", "sr": "sr_aider", "udiff": "udiff_git", "whole": "whole", "patch": "patch"}
BENCH_MODELS = [  # (file stem, label, backend)
    ("haiku_nothink", "Claude Haiku 4.5, thinking off", "claude"),
    ("haiku_think", "Claude Haiku 4.5, thinking on (default)", "claude"),
    ("sonnet_nothink", "Claude Sonnet 5.5, thinking off", "claude"),
    ("local_t0", "Qwen3 4B Instruct 2507 (4-bit), local, temperature 0", "local"),
]


def reply_for_page(fmt, out, path):
    r = out.get("reply")
    if fmt == "exact":
        return json.dumps(r, ensure_ascii=False, indent=1) if r is not None else ""
    text = out.get("text") or ""
    if fmt == "whole":  # the full file is long: show what it changed, as a diff against the original
        blocks = re.findall(r"^```[^\n]*\n(.*?)^```", text, re.M | re.S)
        if blocks:
            new = max(blocks, key=len)
            d = "".join(difflib.unified_diff(T.read(path).replace("\r\n", "\n").splitlines(True),
                                             new.splitlines(True), "original", "model's file", n=1))
            return f"[whole file, {len(new)} characters; shown as its diff against the original]\n" + (d or "(identical to the original)")
    return text


def bench():
    models, runs = [], {}
    for stem, label, backend in BENCH_MODELS:
        f = os.path.join(RAW, "bench", stem + ".jsonl")
        if not os.path.exists(f):
            continue
        recs = list({(r["task"], r["format"]): r for r in map(json.loads, open(f))}.values())   # a resumed run keeps its last record
        models.append({"id": stem, "label": label, "backend": backend})
        out = {}
        raw_keep = []
        for r in recs:
            atts = []
            for a in r["attempts"]:
                o = a["out"]; u = o.get("usage") or {}
                rep = clean(reply_for_page(r["format"], o, r["path"]))
                if atts and rep == atts[0]["full"]:
                    shown = "(identical to the first reply)"
                elif len(rep) > 700:
                    shown = rep[:700] + f"\n[... {len(rep) - 700} more characters; the full reply is in src/recordings/]"
                else:
                    shown = rep
                atts.append({
                    "full": rep, "reply": shown,
                    "out": u.get("output_tokens", u.get("completion_tokens")),
                    "inp": (u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0))
                           if backend == "claude" else u.get("prompt_tokens"),
                    "sec": o.get("seconds"), "think": (u.get("output_tokens_details") or {}).get("thinking_tokens") or 0,
                    "res": {k: [int(v["applied"]), int(v["ok"]), "" if v["ok"] else clean(v["why"])[:220]] for k, v in a["results"].items()},
                    "err": clean(a["error"])[:500] if a["error"] else None})
                keep = {k: v for k, v in o.items() if k != "raw"}
                raw_keep.append({"task": r["task"], "format": r["format"], "attempt": a["attempt"], "out": deep(keep),
                                 "results": deep(a["results"])})
            for x in atts:
                x.pop("full")
            out.setdefault(r["task"], {})[r["format"]] = atts
        runs[stem] = out
        with open(os.path.join(REC, f"bench_{stem}.jsonl"), "w") as fo:
            for x in raw_keep:
                fo.write(json.dumps(x, ensure_ascii=False) + "\n")
    tasks = [{"id": tid, "file": path, "ask": ins} for tid, path, ins, _ in T.TASKS]
    sys.path.insert(0, os.path.join(HERE, "editbench"))
    import bench as BM
    return {"models": models, "tasks": tasks, "primary": PRIMARY, "runs": runs, "spec": BM.SPEC, "system": BM.SYSTEM,
            "lines": {p: T.read(p).count("\n") for p in sorted({t[1] for t in T.TASKS})}}


# ------------------------------------------------------------------ Claude Code: stream timeline, interrupt, limits
def ids_map():
    m = {}
    def lab(prefix, v):
        if v not in m:
            m[v] = f"{prefix}{sum(1 for k in m.values() if k.startswith(prefix)) + 1}"
        return m[v]
    return lab


def redact_record(r, lab):
    """A Claude Code stream-json record, reduced and relabelled (no ids, no account fields)."""
    r = json.loads(json.dumps(r))
    t = r.get("type")
    if t == "system" and r.get("subtype") == "init":
        keep = {k: r.get(k) for k in ("type", "subtype", "model", "permissionMode", "tools", "claude_code_version")}
        keep["cwd"] = "/work"
        return keep
    if t == "rate_limit_event":
        return None
    for k in ("session_id", "uuid", "parent_tool_use_id", "request_id"):
        r.pop(k, None)
    msg = r.get("message") or (r.get("event") or {}).get("message")
    if isinstance(msg, dict) and "id" in msg:
        msg["id"] = lab("m", msg["id"])
    def walk(o):
        if isinstance(o, dict):
            if "signature" in o:          # thinking blocks: keep that thinking happened, drop the signature
                o.pop("signature", None)
                if "thinking" in o:
                    o["thinking"] = o["thinking"] or "(thinking; text not returned)"
            for k in ("id", "tool_use_id"):
                if isinstance(o.get(k), str) and o[k].startswith("toolu_"):
                    o[k] = lab("t", o[k])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(r)
    return deep(r)


def cc():
    out = {}
    # stream timeline
    lab = ids_map(); recs = []
    for line in open(os.path.join(RAW, "cc", "stream_sonnet.jsonl")):
        w = json.loads(line); r = json.loads(w["line"])
        rr = redact_record(r, lab)
        if rr is not None:
            recs.append({"t_ms": w["t_ms"], **rr})
    # argument deltas split paths into fragments that no pattern can match: rejoin each block's deltas,
    # redact the whole string, and cut it back into the same number of pieces (timing and counts kept)
    groups, cur_i = {}, 0
    for k, x in enumerate(recs):
        e = x.get("event") or {}
        if e.get("type") == "message_start":
            cur_i += 1
        if e.get("type") == "content_block_delta" and e["delta"].get("type") == "input_json_delta":
            groups.setdefault((cur_i, e["index"]), []).append(k)
    for ks in groups.values():
        full = clean("".join(recs[k]["event"]["delta"]["partial_json"] for k in ks))
        n = len(ks); step = -(-len(full) // n) if n else 1
        for j, k in enumerate(ks):
            recs[k]["event"]["delta"]["partial_json"] = full[j * step:(j + 1) * step]
    with open(os.path.join(REC, "cc_stream_sonnet.jsonl"), "w") as f:
        for x in recs:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    calls, blocks, cur = [], [], None
    open_blocks = {}
    for x in recs:
        if x.get("type") == "stream_event":
            e = x["event"]; et = e["type"]
            if et == "message_start":
                cur = {"start": x["t_ms"], "end": None, "blocks": []}; calls.append(cur)
            elif et == "content_block_start":
                cb = e["content_block"]
                b = {"i": e["index"], "kind": cb["type"], "name": cb.get("name", ""), "id": cb.get("id", ""), "start": x["t_ms"], "stop": None, "deltas": 0}
                cur["blocks"].append(b); open_blocks[e["index"]] = b
            elif et == "content_block_delta" and e["delta"]["type"] == "input_json_delta":
                open_blocks[e["index"]]["deltas"] += 1
            elif et == "content_block_stop":
                open_blocks[e["index"]]["stop"] = x["t_ms"]
            elif et == "message_delta":
                cur["end"] = x["t_ms"]; cur["stop_reason"] = e["delta"].get("stop_reason")
        elif x.get("type") == "user":
            for c in x["message"]["content"]:
                if isinstance(c, dict) and c.get("type") == "tool_result":
                    for cl in calls:
                        for b in cl["blocks"]:
                            if b["id"] == c["tool_use_id"]:
                                b["result"] = x["t_ms"]
                                txt = c["content"] if isinstance(c["content"], str) else json.dumps(c["content"])
                                b["result_text"] = clean(txt)[:160]
        elif x.get("type") == "assistant":
            for c in x["message"]["content"]:
                if c.get("type") == "tool_use":
                    for cl in calls:
                        for b in cl["blocks"]:
                            if b["id"] == c["id"]:
                                b["input"] = clean(json.dumps(c["input"]))[:160]
        elif x.get("type") == "result":
            out["stream_result"] = {k: x.get(k) for k in ("num_turns", "duration_ms", "total_cost_usd", "subtype")}
    out["stream"] = calls
    # interrupt
    lab = ids_map(); rows = []
    for line in open(os.path.join(RAW, "cc", "interrupt.jsonl")):
        r = json.loads(line)
        if r["class"] in ("RateLimitEvent",):
            continue
        m = json.loads(json.dumps(r["msg"]))
        for k in ("session_id", "uuid"):
            m.pop(k, None)
        if r["class"] == "SystemMessage":
            d = m.get("data", {})
            m = {"subtype": m.get("subtype"), "data": {k: d.get(k) for k in ("model", "permissionMode", "tools", "claude_code_version", "estimated_tokens")}}
        rr = redact_record({"type": "x", "message": m}, lab)["message"]
        rows.append({"t": r["t"], "phase": r["phase"], "class": r["class"], "msg": rr})
    with open(os.path.join(REC, "cc_interrupt_sdk.jsonl"), "w") as f:
        for x in rows:
            f.write(json.dumps(x, ensure_ascii=False) + "\n")
    out["interrupt"] = [x for x in rows if x["class"] in ("AssistantMessage", "UserMessage", "ResultMessage", "HarnessEvent")]
    for x in out["interrupt"]:
        if x["class"] == "ResultMessage":
            x["msg"] = {k: x["msg"].get(k) for k in ("subtype", "is_error", "num_turns", "stop_reason", "total_cost_usd", "result")}
        if x["class"] == "AssistantMessage":
            x["msg"] = {"content": x["msg"].get("content"), "model": x["msg"].get("model")}
    # limits
    lim = {}
    for name in ("cc_maxturns", "cc_budget"):
        lab = ids_map(); recs = []
        for line in open(os.path.join(RAW, "cc", name + ".jsonl")):
            rr = redact_record(json.loads(line), lab)
            if rr is not None:
                recs.append(rr)
        with open(os.path.join(REC, name + ".jsonl"), "w") as f:
            for x in recs:
                f.write(json.dumps(x, ensure_ascii=False) + "\n")
        res = [x for x in recs if x.get("type") == "result"][-1]
        calls_ = [c.get("name") + " " + clean(json.dumps(c.get("input")))[:70] for x in recs if x.get("type") == "assistant"
                  for c in x["message"]["content"] if c.get("type") == "tool_use"]
        results = sum(1 for x in recs if x.get("type") == "user" for c in x["message"]["content"]
                      if isinstance(c, dict) and c.get("type") == "tool_result")
        lim[name] = {"res": {k: res.get(k) for k in ("subtype", "is_error", "num_turns", "stop_reason", "total_cost_usd", "errors")},
                     "calls": calls_, "results": results}
    out["limits"] = lim
    return out


# ------------------------------------------------------------------ tokens of one recorded conversation
def tok():
    d = json.load(open(os.path.join(HERE, "data", "tok_native_demo.json")))
    req = None
    f = os.path.join(RAW, "runs", "stop", "careful_s1.jsonl")
    recs = [json.loads(l) for l in open(f)]
    start = next(r for r in recs if r["kind"] == "start")
    t1 = next(r for r in recs if r["kind"] == "turn" and r["turn"] == 1)
    calls = [{"id": "call_" + str(i + 1), "type": "function", "function": c["function"]} for i, c in enumerate(t1["tool_calls"])]
    # region of every token, from character offsets in the rendered text
    text = "".join(t[1] for t in d["toks"])
    sys_end = text.index("<|im_end|>")
    k0 = text.index("<tools>\n{"); k1 = text.index("</tools>", k0) + len("</tools>")
    spans = []   # (start, end, region)
    pos = 0
    for m in re.finditer(r"<\|im_start\|>(\w+)\n(.*?)<\|im_end\|>", text, re.S):
        role, body = m.group(1), m.group(2)
        reg = {"system": "S", "assistant": "G"}.get(role, "R" if "<tool_response>" in body else "U")
        spans.append((m.start(), m.end(), reg))
    def region(off):
        if k0 <= off < k1:
            return "T"
        for a_, b_, r_ in spans:
            if a_ <= off < b_:
                return r_
        return "G" if off >= spans[-1][1] else "S"
    regs, off = [], 0
    for t in d["toks"]:
        regs.append(region(off)); off += len(t[1])
    return {"toks": d["toks"], "cuts": d["cuts"], "reg": "".join(regs), "first_tail": d["first_tail"], "rev": d["revision"],
            "transformers": d["transformers"], "tools": start["tools"], "system": start["system"],
            "user": clean(d["user"]), "calls": calls,
            "usage1": t1["usage"], "finish1": t1["finish_reason"]}


# ------------------------------------------------------------------ stop lab: native.py runs on the local model
STOP_RUNS = [(f"{r}_s{k}", r, k, 0.7) for k in range(1, 6) for r in ("naive", "careful", "verify")]
STOP_EXTRA = [("try1", "naive_t0", "naive", 0, 0.0)]   # the first run at temperature 0, before the stop rules existed


def short_args(a):
    t = json.dumps(a, ensure_ascii=False)
    return t if len(t) <= 90 else t[:87] + "..."


def stop_runs():
    out = []
    files = [(os.path.join(RAW, "runs", "stop", f + ".jsonl"), f, r, k, tmp) for f, r, k, tmp in STOP_RUNS]
    files += [(os.path.join(RAW, "runs", src + ".jsonl"), lab, r, k, tmp) for src, lab, r, k, tmp in STOP_EXTRA]
    for path, lab, rule, seed, temp in files:
        if not os.path.exists(path):
            continue
        recs = [json.loads(l) for l in open(path)]
        red = []
        turns = []
        for x in recs:
            x = deep(x)
            for c in x.get("tool_calls") or []:
                c["id"] = "call"
            red.append(x)
            if x["kind"] != "turn":
                continue
            turns.append({"n": x["turn"], "fin": x["finish_reason"], "pt": x["usage"].get("prompt_tokens"),
                          "ct": x["usage"].get("completion_tokens"), "sec": x["seconds"], "spent": x["spent"],
                          "text": (x["content"] or "").strip()[:200], "note": x.get("harness_note", "")[:200],
                          "calls": [[c["name"], c["status"], short_args(c["args"]), c["key"], c["times_asked"],
                                     (c["output"] or "")[:160]] for c in x["results"]],
                          "pass": int(bool(x.get("passing_after", x.get("passing_before"))))})
        stop = next((x for x in red if x["kind"] == "stop"), {})
        ver = next((x for x in red if x["kind"] == "verdict"), {})
        with open(os.path.join(REC, f"stop_{lab}.jsonl"), "w") as f:
            for x in red:
                f.write(json.dumps(x, ensure_ascii=False) + "\n")
        out.append({"id": lab, "rule": rule, "seed": seed, "temp": temp, "turns": turns,
                    "stop": stop.get("reason"), "spent": stop.get("spent"), "passed": int(bool(ver.get("passed")))})
    return out


# ------------------------------------------------------------------ parallel calls: parent recordings + stop lab
def parallel(stop):
    import collections
    by = collections.defaultdict(collections.Counter)
    root = os.path.join(HERE, "..", "..", "src", "trace", "recordings")
    nfiles = 0
    for f in sorted(glob.glob(os.path.join(root, "*.jsonl"))):
        nfiles += 1
        msgs = {}
        for l in open(f):
            r = json.loads(l)
            if r.get("type") != "assistant":
                continue
            m = r["message"]
            for c in m.get("content", []):
                if c.get("type") == "tool_use":
                    msgs.setdefault((m.get("id"), m.get("model")), []).append(c["name"])
        for (mid, model), v in msgs.items():
            by[model][min(len(v), 3)] += 1
    loc = collections.Counter(min(len(t["calls"]), 3) for r in stop for t in r["turns"] if t["calls"])
    rows = [["Claude Sonnet 5.5 (Claude Code)", by["claude-sonnet-5-5"]], ["Claude Haiku 4.5 (Claude Code)", by["claude-haiku-4-5-20251001"]],
            ["Qwen3 4B, local (native.py)", loc]]
    return {"files": nfiles, "rows": [[n, c.get(1, 0), c.get(2, 0), c.get(3, 0)] for n, c in rows]}


# ------------------------------------------------------------------ error-message experiment
def aci():
    out = {}
    for stem in ("haiku_nothink", "local_t0"):
        f = os.path.join(RAW, "bench", f"aci_{stem}.jsonl")
        if not os.path.exists(f):
            continue
        rows, red = {}, []
        for l in open(f):
            r = json.loads(l)
            k = (r["task"], r["format"])
            rows.setdefault(k, {"task": r["task"], "format": r["format"], "native": int(bool(r["native_retry_ok"])),
                                "native_msg": clean(r["native_message"])[:500]})
            rows[k][r["level"]] = int(bool(r["ok"]))
            rows[k][r["level"] + "_msg"] = clean(r["message"])[:700]
            o = dict(r["out"]); o.pop("raw", None)
            red.append(deep({**r, "out": o}))
        with open(os.path.join(REC, f"aci_{stem}.jsonl"), "w") as fo:
            for x in red:
                fo.write(json.dumps(x, ensure_ascii=False) + "\n")
        out[stem] = list(rows.values())
    return out


# ------------------------------------------------------------------ the action boundary (local model)
def boundary():
    f = os.path.join(RAW, "boundary", "boundary.jsonl")
    if not os.path.exists(f):
        return None
    recs = [deep(json.loads(l)) for l in open(f)]
    with open(os.path.join(REC, "boundary.jsonl"), "w") as fo:
        for r in recs:
            fo.write(json.dumps(r, ensure_ascii=False) + "\n")
    A, Bc = {}, []
    for r in recs:
        if r["part"] == "A":
            m = re.search(r"^ACTION\s+\{.*\}\s*$", r["text"], re.M)
            after = r["text"][m.end():].strip() if m else r["text"]
            k = r["state"] + ("|stop" if r["stop"] else "|nostop")
            a = A.setdefault(k, {"n": 0, "past": 0, "noaction": 0, "tokens": []})
            a["n"] += 1; a["past"] += int(bool(after)); a["noaction"] += int(not m); a["tokens"].append(r["usage"]["completion_tokens"])
        else:
            raw = r.get("raw") or r["text"]
            Bc.append({"state": r["state"], "seed": r["seed"], "finish": r["finish"], "raw": raw, "ids": r.get("ids") or [],
                       "user": int(raw.lstrip().startswith("<|im_start|>user")), "resp": int("<tool_response>" in raw),
                       "call": int("<tool_call>" in raw), "real": [x[:200] for x in r["real_results"]]})
    tokmap = {}
    tf = os.path.join(HERE, "data", "boundary_tokens.json")
    if os.path.exists(tf):
        tokmap = json.load(open(tf))
    ex = next((b for b in Bc if b["user"] and b["call"]), Bc[0] if Bc else None)
    example = None
    if ex and ex["ids"] and tokmap:
        example = {"toks": [[i, tokmap.get(str(i), "?")] for i in ex["ids"]], "text": ex["raw"], "opener": "<|im_start|>user",
                   "n": sum(1 for b in Bc if b["state"] == ex["state"]), "n_fab": sum(1 for b in Bc if b["state"] == ex["state"] and b["user"]),
                   "caption": "Past the end-of-turn token the model did not wait for a tool result: it opened a new turn as the user, rephrased the task, and asked for tool calls inside that user turn. The server parsed those as tool_calls and returned finish_reason \"" + ex["finish"] + "\": a harness reading this reply would execute calls that the model wrote while pretending to be the user."}
    for b in Bc:
        b.pop("ids", None)
    return {"A": A, "B": Bc, "example": example}


if __name__ == "__main__":
    HB = {"bench": bench(), "cc": cc(), "tok": tok(), "stop": stop_runs()}
    HB["par"] = parallel(HB["stop"])
    HB["aci"] = aci()
    HB["boundary"] = boundary()
    js = "// generated by src/build_data.py from the redacted recordings in src/recordings/; do not edit\nwindow.HB=" + \
         json.dumps(HB, ensure_ascii=False, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_hb_data.js"), "w").write(js)
    print("22_js_hb_data.js", len(js), "bytes")
