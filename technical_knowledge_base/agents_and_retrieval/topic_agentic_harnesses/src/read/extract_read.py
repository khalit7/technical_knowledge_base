#!/usr/bin/env python3
"""Reading tab data: built only from the redacted recordings already in this repo
(src/trace/recordings, src/loop/recordings, src/loop/gate_cases.json). No new model runs.
Writes ../parts/22_js_rd_data.js (window.AHREAD). Run: python3 src/read/extract_read.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
TR = os.path.join(SRC, "trace", "recordings")
LP = os.path.join(SRC, "loop", "recordings")
OUT = os.path.join(SRC, "parts", "22_js_rd_data.js")


def clip(s, n):
    s = str(s).replace("—", ", ")
    return s if len(s) <= n else s[: n - 1] + "…"


def tool_label(name, inp):
    if name == "Bash":
        return clip(inp.get("command", ""), 80)
    if name in ("Read", "Write"):
        return inp.get("file_path", "").replace("/work/", "")
    if name == "Edit":
        old = inp.get("old_string", "").splitlines()
        new = [l.strip() for l in inp.get("new_string", "").splitlines() if l not in old]
        return inp.get("file_path", "").replace("/work/", "") + ": now " + clip(" / ".join(new), 70)
    if name in ("Grep", "Glob"):
        return clip(inp.get("pattern", ""), 60)
    return clip(json.dumps(inp), 60)


def claude_code_run(label):
    """Per model call: fresh input, cache write, cache read, output, thinking; blocks it produced; results."""
    calls, order, results = {}, [], {}
    res = None
    for line in open(os.path.join(TR, label + ".jsonl")):
        d = json.loads(line)
        t = d.get("type")
        if t == "assistant":
            m = d["message"]
            mid = m["id"]
            if mid not in calls:
                calls[mid] = {"blocks": [], "model": m.get("model")}
                order.append(mid)
            for b in m["content"]:
                if b["type"] == "thinking":
                    calls[mid]["blocks"].append({"k": "think"})
                elif b["type"] == "text":
                    calls[mid]["blocks"].append({"k": "text", "s": clip(b["text"], 160)})
                elif b["type"] == "tool_use":
                    calls[mid]["blocks"].append({"k": "tool", "name": b["name"], "s": tool_label(b["name"], b["input"]), "id": b["id"]})
            u = m.get("usage") or {}
            calls[mid]["u"] = u
        elif t == "stream_event" and d["event"].get("type") == "message_delta":
            # final usage of the most recent call (output tokens complete here)
            if order:
                calls[order[-1]]["u"] = d["event"]["usage"]
        elif t == "user":
            c = d["message"]["content"]
            if isinstance(c, list):
                for b in c:
                    if b.get("type") == "tool_result":
                        txt = b["content"] if isinstance(b["content"], str) else " ".join(x.get("text", "") for x in b["content"] if isinstance(x, dict))
                        results[b["tool_use_id"]] = {"s": clip(txt, 150), "err": bool(b.get("is_error")), "len": len(txt)}
        elif t == "result":
            res = d
    out = []
    for mid in order:
        c = calls[mid]
        u = c["u"]
        blocks = []
        for b in c["blocks"]:
            if b["k"] == "tool":
                r = results.get(b["id"], {})
                b = dict(b, r=r.get("s", ""), err=r.get("err", False), rlen=r.get("len", 0))
                b.pop("id")
            blocks.append(b)
        # merge repeated thinking markers
        merged = []
        for b in blocks:
            if b["k"] == "think" and merged and merged[-1]["k"] == "think":
                continue
            merged.append(b)
        out.append({"in": u.get("input_tokens", 0), "cw": u.get("cache_creation_input_tokens", 0),
                    "cr": u.get("cache_read_input_tokens", 0), "out": u.get("output_tokens", 0),
                    "th": (u.get("output_tokens_details") or {}).get("thinking_tokens", 0), "b": merged})
    meta = json.load(open(os.path.join(TR, label + ".meta.json")))
    mu = res["modelUsage"]
    model = list(mu)[0]
    return {"label": label, "model": model, "calls": out, "cost": res["total_cost_usd"],
            "api_ms": res["duration_api_ms"], "ctxwin": mu[model]["contextWindow"],
            "post": meta["post_tests"].strip(), "wall": meta["meta"].split("wall=")[1].split("s")[0]}


def step0():
    rec = [json.loads(l) for l in open(os.path.join(LP, "s0_haiku.jsonl"))]
    turn = [r for r in rec if r["kind"] == "turn"][0]
    ver = [r for r in rec if r["kind"] == "verdict"][0]
    u = turn["usage"]
    text = turn["text"]
    expl = text.split("```")[-1].strip()
    return {"in": u["input_tokens"], "out": u["output_tokens"], "th": u["output_tokens_details"]["thinking_tokens"],
            "sec": turn["seconds"], "expl": clip(expl, 260), "post": ver["output"].strip(), "passed": ver["passed"]}


def summary(label):
    res = None
    for line in open(os.path.join(TR, label + ".jsonl")):
        d = json.loads(line)
        if d.get("type") == "result":
            res = d
    meta = json.load(open(os.path.join(TR, label + ".meta.json")))
    ncalls = len({json.loads(l)["message"]["id"] for l in open(os.path.join(TR, label + ".jsonl")) if '"type": "assistant"' in l})
    return {"label": label, "calls": ncalls, "cost": res["total_cost_usd"], "wall": int(meta["meta"].split("wall=")[1].split("s")[0]),
            "pass": meta["post_tests"].strip().endswith("0 failed")}


def loop_cost(label, prices):
    """API-price equivalent of a Loop lab harness run: sum over its model calls (list prices per MTok)."""
    tot, n = 0.0, 0
    for line in open(os.path.join(LP, label + ".jsonl")):
        d = json.loads(line)
        if d.get("kind") == "turn":
            u = d["usage"]; cc = u.get("cache_creation") or {}
            tot += (u["input_tokens"] * prices["in"] + cc.get("ephemeral_1h_input_tokens", 0) * prices["w1h"]
                    + cc.get("ephemeral_5m_input_tokens", 0) * prices["w5m"] + u["cache_read_input_tokens"] * prices["read"]
                    + u["output_tokens"] * prices["out"]) / 1e6
            n += 1
    return round(tot, 5), n


def cc_loop_cost(label):
    for line in open(os.path.join(LP, label + ".jsonl")):
        d = json.loads(line)
        if "total_cost_usd" in d:
            return d["total_cost_usd"], d.get("num_turns")


# Sonnet 5.5 list prices per MTok (FACTS.md, ahtrace: platform.claude.com pricing, read 2026-10-05)
SONNET55 = {"in": 2, "w5m": 2.5, "w1h": 4, "read": 0.2, "out": 10}
s5c, s5n = loop_cost("s5_sonnet", SONNET55)
ccc, ccn = cc_loop_cost("cc_sonnet_fair")

gates = json.load(open(os.path.join(SRC, "loop", "gate_cases.json")))
data = {
    "cc": claude_code_run("std_haiku_1"),
    "s0": step0(),
    "runs": [summary(l) for l in ["std_haiku_1", "std_haiku_2", "std_haiku_3", "std_sonnet_1", "std_sonnet_2", "std_sonnet_3"]],
    "loopcmp": {"ours_cost": s5c, "ours_calls": s5n, "cc_cost": ccc},
    "gates": [{"tool": g["tool"], "args": g["args"], "note": g["note"], "v": g["verdict"], "why": g["why"]} for g in gates],
}
js = "// Reading tab data: generated by src/read/extract_read.py from redacted recordings in src/trace and src/loop. Do not edit.\nwindow.AHREAD=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
for bad in ["/Users/", "Users-", "khalid", "glpat", "sk-ant", "—"]:
    assert bad not in js, bad
open(OUT, "w").write(js)
print("wrote", OUT, len(js), "bytes;", len(data["cc"]["calls"]), "calls")
