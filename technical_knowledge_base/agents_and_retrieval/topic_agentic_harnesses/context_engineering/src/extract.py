"""Build parts/30_js_data.js (window.HCTX) from the redacted recordings in recordings/ and the small inputs in inputs/.
Run from anywhere: python3 extract.py. Nothing here calls a model; check.py re-runs this and proves the page embeds it."""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
INP = os.path.join(HERE, "inputs")

# Haiku 4.5 list prices, $ per million tokens (FACTS.md, platform.claude.com pricing, read 2026-10-05)
PRICE = {"in": 1.0, "w5": 1.25, "w1h": 2.0, "read": 0.10, "out": 5.0}

def load(label):
    return [json.loads(l) for l in open(os.path.join(REC, label + ".jsonl"))]

def parse_context(text):
    """Parse the markdown table that /context prints."""
    m = re.search(r"\*\*Tokens:\*\* ([\d.]+)k / (\d+)k", text)
    cats = {}
    for name, val in re.findall(r"^\| ([A-Za-z ]+) \| ([\d.]+k?|< ?\d+|\d+) \|", text, re.M):
        if name.strip() in ("Category", "Skill", "Type"):
            continue
        v = val.replace("< ", "<")
        if v.endswith("k"):
            n = round(float(v[:-1]) * 1000)
        elif v.startswith("<"):
            n = int(v[1:])
        else:
            n = int(v)
        cats.setdefault(name.strip(), n)
    skills = re.findall(r"^\| ([\w-]+) \| (Project|Built-in) \| ([~<] ?\d+) \|", text, re.M)
    return {"total": round(float(m.group(1)) * 1000) if m else None, "window": int(m.group(2)) * 1000 if m else None,
            "cats": cats, "skills": [[a, b, c.replace(" ", "")] for a, b, c in skills]}

def session(label):
    recs = load(label)
    seen, calls, turns, events, ctxs, finals = set(), [], [], [], [], []
    for d in recs:
        t, st = d.get("type"), d.get("subtype")
        if t == "driver":
            turns.append({"sent": d["sent"], "call0": len(calls)})
        elif t == "assistant":
            m = d["message"]
            if m.get("model") == "<synthetic>":
                txt = "".join(c.get("text", "") for c in m["content"] if c.get("type") == "text")
                if "Context Usage" in txt:
                    c = parse_context(txt); c["after_call"] = len(calls); ctxs.append(c)
                continue
            if m["id"] not in seen:
                seen.add(m["id"]); u = m["usage"]
                calls.append({"w": "s" if d.get("parent_tool_use_id") else "m", "in": u["input_tokens"],
                              "cw": u["cache_creation_input_tokens"], "cr": u["cache_read_input_tokens"]})
            for c in m["content"]:
                if c.get("type") == "tool_use":
                    arg = c["input"].get("command") or c["input"].get("file_path") or c["input"].get("pattern") or c["input"].get("skill") or c["input"].get("description") or ""
                    events.append({"k": "tool", "at": len(calls) - 1, "name": c["name"], "arg": str(arg).replace("/work/", "")[:90]})
                elif c.get("type") == "text" and c["text"].strip():
                    events.append({"k": "text", "at": len(calls) - 1, "text": c["text"][:400]})
        elif t == "user":
            cs = d["message"].get("content")
            if isinstance(cs, list):
                for c in cs:
                    if c.get("type") == "tool_result":
                        cc = c.get("content"); s = cc if isinstance(cc, str) else " ".join(x.get("text", "") for x in cc if isinstance(x, dict))
                        n = c.get("hctx_full_chars") or len(s)
                        ev = {"k": "res", "at": len(calls) - 1, "err": bool(c.get("is_error")), "chars": n}
                        if c.get("is_error"):
                            ev["head"] = s[:120]
                        events.append(ev)
                    elif c.get("type") == "text" and "being continued from a previous conversation" in c.get("text", ""):
                        events.append({"k": "summary", "at": len(calls), "text": c["text"]})
            elif isinstance(cs, str) and "being continued from a previous conversation" in cs:
                events.append({"k": "summary", "at": len(calls), "text": cs})
        elif t == "system" and st == "compact_boundary":
            md = d["compact_metadata"]
            events.append({"k": "compact", "at": len(calls), "trigger": md["trigger"], "pre": md["pre_tokens"], "post": md.get("post_tokens"), "ms": md.get("duration_ms")})
        elif t == "system" and st == "status" and d.get("compact_result"):
            events.append({"k": "compact_status", "at": len(calls), "result": d["compact_result"], "error": d.get("compact_error")})
        elif t == "system" and st == "permission_denied":
            events.append({"k": "denied", "at": len(calls) - 1, "msg": d.get("message", "")[:160]})
        elif t == "result":
            mu = d.get("modelUsage") or {}
            agg = {"in": 0, "cw": 0, "cr": 0, "out": 0}
            for v in mu.values():
                agg["in"] += v["inputTokens"]; agg["cw"] += v["cacheCreationInputTokens"]; agg["cr"] += v["cacheReadInputTokens"]; agg["out"] += v["outputTokens"]
            finals.append({"after_call": len(calls), "turn": len(turns) - 1, "cost": round(d.get("total_cost_usd") or 0, 6), "mu": agg,
                           "turns": d.get("num_turns"), "ms": d.get("duration_ms"), "text": str(d.get("result"))[:1200]})
    for f in finals:
        sent = turns[f["turn"]]["sent"] if 0 <= f["turn"] < len(turns) else ""
        keep = sent.startswith("Without") or (f["turn"] == 0 and not sent.startswith("/"))
        f["text"] = f["text"][:700] if keep else ""
    if label.startswith("sb_") or label.startswith("sa_"):
        events = [e for e in events if e["k"] in ("summary", "compact")]
    return {"calls": calls, "turns": turns, "events": events, "ctx": ctxs, "finals": finals,
            "model": next((d["model"] for d in recs if d.get("subtype") == "init"), None),
            "version": next((d["claude_code_version"] for d in recs if d.get("subtype") == "init"), None)}

def main():
    D = {"price": PRICE}
    labels = sorted(f[:-6] for f in os.listdir(REC) if f.endswith(".jsonl"))
    D["sessions"] = {}
    for lab in labels:
        if lab.startswith("cache_"):
            continue
        D["sessions"][lab] = session(lab)
    # cache experiment: one call each
    cache = []
    for lab in labels:
        if lab.startswith("cache_"):
            s = session(lab); c = s["calls"][0]
            cache.append({"label": lab, "variant": lab.split("_")[1], "i": int(lab.split("_")[2]), **c})
    D["cache"] = cache
    for f in ("policies.json", "needle_haiku.json", "probe_scores.json", "needle_local.json"):
        p = os.path.join(INP, f)
        if os.path.exists(p):
            D[f.split(".")[0]] = json.load(open(p))
    if "needle_haiku" in D:
        for r in D["needle_haiku"]["rows"]:
            r["reply"] = r["reply"][:220]
    s = "window.HCTX=" + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n"
    s = s.replace(" " + chr(0x2014) + " ", ", ").replace(chr(0x2014), ", ")
    s = s.replace("</", "<\\/")
    open(os.path.join(HERE, "parts", "30_js_data.js"), "w").write("// generated by src/extract.py from src/recordings and src/inputs; do not edit\n" + s)
    print("wrote", len(s), "bytes;", len(D["sessions"]), "sessions,", len(cache), "cache runs")

if __name__ == "__main__":
    main()
