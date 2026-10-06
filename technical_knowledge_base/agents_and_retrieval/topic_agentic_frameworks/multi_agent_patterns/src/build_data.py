"""Build parts/30_js_data.js from the redacted recordings in recordings/ only (never from the scratchpad).
usage: python3 build_data.py
"""
import datetime as dt, glob, gzip, json, os, re, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(HERE, "recordings")
OUT = os.path.join(HERE, "parts", "20_js_data.js")
TRUTH = json.load(open(os.path.join(HERE, "inputs", "audit_truth.json")))
KEY = {(t["file"], t["function"]) for t in TRUTH["mismatches"]}


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()


def load(p):
    if not os.path.exists(p) and os.path.exists(p + ".gz"):
        p = p + ".gz"
    f = gzip.open(p, "rt") if p.endswith(".gz") else open(p)
    return [json.loads(l) for l in f if l.strip()]


def short_tool(c):
    n, i = c.get("name"), c.get("input") or {}
    if n == "Read":
        f = os.path.basename(i.get("file_path", ""))
        return f + ("" if not (i.get("offset") or i.get("limit")) else f" (lines {i.get('offset') or 1}+{i.get('limit') or ''})")
    if n == "Agent":
        return i.get("description", "")[:60]
    if n == "Bash":
        c = re.sub(r"\s+", " ", i.get("command", "")).replace("python3 board.py ", "")
        c = re.sub(r"^(claim|vclaim|post|verdict) v?w\d+ ?", r"\1 ", c)
        return c[:40]
    if n in ("Grep", "Glob"):
        return (i.get("pattern") or "")[:50]
    return ""


def lanes(path, t0, label):
    """Group a stream-json file's model calls by agent (main thread or subagent)."""
    recs = load(path)
    names, starts = {}, {}
    for r in recs:
        if r.get("type") == "system" and r.get("subtype") == "task_started":
            names[r["tool_use_id"]] = r.get("description", "")
    groups = {}
    for r in recs:
        if r.get("type") not in ("assistant", "user") or "timestamp" not in r:
            continue
        g = r.get("parent_tool_use_id") or "main"
        G = groups.setdefault(g, {"msgs": {}, "order": [], "last": 0, "first": None})
        t = ts(r["timestamp"]) - t0
        G["last"] = max(G["last"], t)
        if G["first"] is None:
            G["first"] = t
        if r["type"] != "assistant":
            continue
        m = r["message"]
        mid = m.get("id")
        if mid not in G["msgs"]:
            u = m.get("usage") or {}
            G["msgs"][mid] = {"t": t, "ctx": (u.get("input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0), "tools": []}
            G["order"].append(mid)
        G["msgs"][mid]["t"] = t
        for c in m.get("content") or []:
            if c.get("type") == "tool_use":
                G["msgs"][mid]["tools"].append([c["name"], short_tool(c)])
                if c["name"] == "Agent" and g == "main":
                    starts[c["id"]] = t
    out = []
    for g, G in groups.items():
        calls = [[round(G["msgs"][k]["t"], 2), G["msgs"][k]["ctx"], G["msgs"][k]["tools"]] for k in G["order"]]
        reads = [x for c in calls for x in c[2] if x[0] == "Read"]
        out.append({"name": label if g == "main" else names.get(g, "worker"), "kind": "main" if g == "main" else "sub",
                    "start": round(starts.get(g, 0.0), 2), "end": round(G["last"], 2), "calls": calls,
                    "peak": max([c[1] for c in calls] or [0]), "reads": len(reads),
                    "partial": sum(1 for x in reads if "(lines" in x[1])})
    out.sort(key=lambda L: (L["kind"] != "main", L["start"]))
    return out


def totals(paths):
    tot = {"input": 0, "cache_write": 0, "cache_read": 0, "output": 0, "thinking": 0, "cost": 0.0, "calls": 0}
    for p in paths:
        res = [r for r in load(p) if r.get("type") == "result"]
        if not res:
            continue
        mu = res[-1].get("modelUsage") or {}
        for m in mu.values():
            tot["input"] += m.get("inputTokens", 0)
            tot["cache_write"] += m.get("cacheCreationInputTokens", 0)
            tot["cache_read"] += m.get("cacheReadInputTokens", 0)
            tot["output"] += m.get("outputTokens", 0)
            tot["thinking"] += m.get("thinkingTokens", 0)
        tot["cost"] += res[-1].get("total_cost_usd") or 0
    tot["cost"] = round(tot["cost"], 6)
    tot["processed"] = tot["input"] + tot["cache_write"] + tot["cache_read"]
    return tot


def extra_kind(why):
    """Sort a report that is not a planted bug by its stated reason (keyword rules, checked by hand on every run)."""
    w = (why or "").lower()
    if "valueerror" in w or "malformed" in w or "raise" in w:
        return "valueerror"
    if "thread" in w:
        return "thread"
    if re.search(r"exceed|> ?1|upper bound|greater than 1|bound check|hits ?> ?total|no (upper )?bound|unbound|validat|clamp|between 0 and 1|\[0, ?1\]|0\.0.{0,6}1\.0|negative|0-1", w):
        return "ratio"
    return "other"


def norm(f):
    fn = f.get("file", "").strip()
    return (fn if fn.startswith("fleetops/") else "fleetops/" + os.path.basename(fn), f.get("function", "").strip())


def audit():
    runs = []
    for d in sorted(glob.glob(os.path.join(REC, "audit_*"))):
        s = json.load(open(os.path.join(d, "summary.json")))
        t0 = min(a["t0"] for a in s["agents"])
        L = []
        for a in s["agents"]:
            p = os.path.join(d, os.path.basename(a["path"]))
            lab = os.path.basename(a["path"]).replace(".jsonl", "")
            for ln in lanes(p, a["t0"], lab):
                off = a["t0"] - t0
                ln["start"] = round(ln["start"] + off, 2)
                ln["end"] = round(ln["end"] + off, 2)
                ln["calls"] = [[round(c[0] + off, 2)] + c[1:] for c in ln["calls"]]
                L.append(ln)
        if s["design"] not in ("single", "multi"):
            for ln in L:  # tool arguments are only shown for the single and orchestrator runs
                ln["calls"] = [[c[0], c[1], sum(1 for t in c[2] if t[0] == "Read")] for c in ln["calls"]]
        found = {norm(f) for f in s["answer"] if isinstance(f, dict)}
        xk = {}
        seen = set()
        for f in s["answer"]:
            if isinstance(f, dict) and norm(f) not in KEY and norm(f) not in seen:
                seen.add(norm(f))
                k = extra_kind(f.get("why"))
                xk[k] = xk.get(k, 0) + 1
        r = {"run": s["run"], "design": s["design"], "xk": xk, "model": s["model"], "rep": s["rep"], "wall": s["wall"],
             "tp": len(found & KEY), "fp": len(found - KEY), "found": len(found),
             "hit": sorted(f"{a}:{b}" for a, b in found & KEY), "wrong": sorted(f"{a}:{b}" for a, b in found - KEY)[:60],
             "tot": totals([os.path.join(d, os.path.basename(a["path"])) for a in s["agents"]]), "lanes": L}
        x = s.get("extra") or {}
        if "claims" in x:
            r["claims"] = {k: [v["worker"], v["t"]] for k, v in x["claims"].items()}
        if "posted" in x:
            r["posted"] = len(x["posted"])
            vs = x.get("verdicts") or []
            r["verdicts"] = len(vs)
            pk = [norm(p) in KEY for p in x["posted"]]
            yes = {v["id"] for v in vs if v["verdict"].lower().startswith(("y", "mismatch"))}
            checked = {v["id"] for v in vs}
            kinds = [None if k else extra_kind(p.get("why")) for p, k in zip(x["posted"], pk)]
            r["vk"] = {}
            for i, kd in enumerate(kinds):
                if kd is None:
                    continue
                e = r["vk"].setdefault(kd, [0, 0, 0])  # kept, rejected, unchecked
                e[0 if i in yes else 1 if i in checked else 2] += 1
            r["vt"] = {"real_kept": sum(1 for i, k in enumerate(pk) if k and i in yes),
                       "real_dropped": sum(1 for i, k in enumerate(pk) if k and i in checked and i not in yes),
                       "false_kept": sum(1 for i, k in enumerate(pk) if not k and i in yes),
                       "false_dropped": sum(1 for i, k in enumerate(pk) if not k and i in checked and i not in yes),
                       "unchecked": sum(1 for i in range(len(pk)) if i not in checked)}
        if s["design"] == "multi":
            # the briefs the lead wrote
            recs = load(os.path.join(d, "lead.jsonl"))
            r["briefs"] = [c["input"].get("prompt", "") for x2 in recs if x2.get("type") == "assistant" and not x2.get("parent_tool_use_id")
                           for c in x2["message"]["content"] if c.get("type") == "tool_use" and c.get("name") == "Agent"]
        runs.append(r)
    return {"truth": [f"{t['file']}:{t['function']}" for t in TRUTH["mismatches"]],
            "kinds": {f"{t['file']}:{t['function']}": t["kind"] for t in TRUTH["mismatches"]},
            "modules": TRUTH["modules"], "claims": TRUTH["public_functions"], "runs": runs}


def result_of(p):
    for r in load(p):
        if r.get("type") == "result":
            return r
    return None


def debate():
    pz = json.load(open(os.path.join(HERE, "inputs", "puzzles9.json")))
    d = os.path.join(REC, "deb9")
    out = []
    ans = re.compile(r"ANSWER:\s*\**\s*([KNkn\s,]+)", re.I)
    for p in pz["puzzles"][:30]:
        row = {"id": p["id"], "truth": p["answer"], "text": p["text"], "calls": {}}
        for lab in ["s1", "s2", "s3", "s4", "s5", "d1", "d2", "d3", "j"]:
            f = os.path.join(d, f"{p['id']}_{lab}.jsonl")
            if not (os.path.exists(f) or os.path.exists(f + ".gz")):
                continue
            r = result_of(f)
            if not r:
                continue
            m = ans.findall(r.get("result") or "")
            a = re.sub(r"[^KN]", "", m[-1].upper()) if m else None
            u = r.get("usage") or {}
            row["calls"][lab] = {"a": a or None, "in": (u.get("input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0),
                                 "out": u.get("output_tokens") or 0, "cost": r.get("total_cost_usd") or 0,
                                 "ms": r.get("duration_ms") or 0, "tail": (r.get("result") or "")[-130:]}
        out.append(row)
    return {"n_people": pz["n_people"], "puzzles": out}


def write():
    out = []
    for d in sorted(glob.glob(os.path.join(REC, "write_*")) + glob.glob(os.path.join(REC, "wopen_*"))):
        s = json.load(open(os.path.join(d, "summary.json")))
        c = s["check"]
        out.append({"run": s["run"], "spec": "open" if s["run"].startswith("wopen") else "pinned", "design": s["design"], "rep": s["rep"], "wall": s["wall"], "cost": s["cost"],
                    "ok": all(c.get(k) for k in ("ran", "is_table", "has_count", "has_distinct", "has_top", "top_order")),
                    "check": {k: v for k, v in c.items() if k != "md"}, "md": c.get("md"),
                    "report_py": s.get("report_py"), "render_py": s.get("render_py"), "contract": s.get("contract")})
    return out


def handoffs():
    d = os.path.join(REC, "handoff_runs")
    proxy = load(os.path.join(d, "proxy.jsonl")) if os.path.exists(os.path.join(d, "proxy.jsonl.gz")) else []
    out = []
    for f in sorted(glob.glob(os.path.join(d, "*.json"))):
        r = json.load(open(f))
        reqs = []
        for q in proxy:
            if r["t0"] - 0.5 <= q["t0"] <= r["t1"] + 0.5 and isinstance(q.get("request"), dict):
                rq, rs = q["request"], q.get("response") or {}
                sysm = next((m.get("content") for m in rq.get("messages", []) if m.get("role") == "system"), "") or ""
                who = re.search(r"You (?:are the|run a|are part of)[^.]*", sysm.split("\n\n")[-1])
                msg = (rs.get("choices") or [{}])[0].get("message") or {}
                reqs.append({"tools": [t["function"]["name"] for t in rq.get("tools", [])],
                             "agent": (who.group(0) if who else sysm[-80:])[:90],
                             "msgs": [[m.get("role"), (m.get("content") or "")[:170] if isinstance(m.get("content"), str) else "",
                                       [tc["function"]["name"] for tc in m.get("tool_calls") or []]] for m in rq.get("messages", [])],
                             "usage": rs.get("usage") or {}, "reply": (msg.get("content") or "")[:400],
                             "calls": [[tc["function"]["name"], tc["function"].get("arguments", "")] for tc in msg.get("tool_calls") or []]})
        if str(r["rep"]) != "1":  # the step-through shows run 1 of each design; other runs keep counts only
            for q in reqs:
                q["msgs"] = []
                q["reply"] = q["reply"][:80]
        out.append({"design": r["design"], "rep": r["rep"], "temperature": r["temperature"], "final": r["final"],
                    "last_agent": r["last_agent"], "tool_calls": r["tool_calls"], "score": r["score"], "error": r["error"],
                    "secs": round(r["t1"] - r["t0"], 1), "reqs": reqs})
    return out


def root():
    """The parent page's single-versus-multi result, read from its redacted recordings."""
    base = os.path.join(HERE, "..", "..", "src", "orch", "recordings")
    out = {}
    for k, run in (("s", "agent"), ("m", "multi")):
        s = json.load(open(os.path.join(base, run, "summary.json")))
        e = s["events"][0]
        mu = list(e["modelUsage"].values())[0]
        out[k] = {"cost": e["cost"], "wall": s["wall"], "hid": sum(1 for h in s["hidden"] if h[1]), "nhid": len(s["hidden"]),
                  "proc": mu["inputTokens"] + mu["cacheCreationInputTokens"] + mu["cacheReadInputTokens"]}
    return out


def probe():
    r = result_of(os.path.join(REC, "probe", "empty_fanout_prompt.jsonl"))
    u = r["usage"]
    return {"overhead": u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"]}


def count_sessions():
    n = 0
    for f in glob.glob(os.path.join(REC, "*", "*.jsonl.gz")):
        if os.path.basename(f) == "proxy.jsonl.gz":
            continue
        n += 1
    return n


def main():
    data = {"audit": audit(), "debate": debate(), "write": write(), "handoffs": handoffs(), "root": root(),
            "probe": probe(), "corpus": json.load(open(os.path.join(HERE, "inputs", "audit_corpus_stats.json"))),
            "n_sessions": count_sessions()}
    js = "window.FM=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    js = js.replace("</", "<\\/")
    open(OUT, "w").write(js)
    print("wrote", OUT, len(js), "bytes")


main()
