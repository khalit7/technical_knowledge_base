"""Build parts/22_js_fmem_data.js (window.FMEM) from src/recordings only. Run by build.sh.

Everything the page shows about the runs comes from here: what each system stored after each session, what it
retrieved, every answer and its grade, evidence recall, call and token counts, and the values quoted in the prose (V).
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "recordings")
sys.path.insert(0, os.path.join(HERE, "code"))
from conv import SESSIONS, QUESTIONS, GOLD, EVIDENCE, EVK, grade, transcript, full_history

def L(n):
    p = os.path.join(R, n)
    return json.load(open(p)) if os.path.exists(p) else None

V = {}
QI = {q["id"]: q for q in QUESTIONS}
D = lambda s: (s or "")[:10] or None
S = [{"d": s["date"], "t": [[r, t] for r, t in s["turns"]]} for s in SESSIONS]
Q = [{"id": q["id"], "t": q["t"], "q": q["q"], "g": GOLD[q["id"]], "ev": EVIDENCE[q["id"]], "k": EVK.get(q["id"], [])} for q in QUESTIONS]
for t in ("IE", "MS", "KU", "TR", "ABS"):
    V["nq." + t] = sum(q["t"] == t for q in QUESTIONS)
V["full_chars"] = len(full_history())
V["full_tokens"] = format(round(len(full_history()) / 4 / 100) * 100, ",")  # 4 chars per token, stated as approximate

# ---------- Mem0 2.2.1 ----------
# Memories re-extracted from an earlier session's messages (the prompt's "Last k Messages" spans sessions): found with a
# word-overlap heuristic, then checked by hand; two heuristic hits were false positives and are excluded.
CARRY = {(8, 2), (8, 3), (8, 4), (9, 0), (9, 1), (9, 2), (9, 3), (9, 4), (10, 1), (10, 2), (10, 3), (10, 4), (10, 5)}
m0 = L("mem0_haiku.json")
M0 = None
if m0:
    seen, after = {}, []
    for k, s in enumerate(m0["sessions"]):
        for j, e in enumerate(s["events"]):
            seen[e["id"]] = {"t": e["memory"], "s": k, "c": (k, j) in CARRY}
        after.append([e["id"] for e in sorted(s["store"], key=lambda x: (x["created_at"] or ""))])
    ids = list(seen)
    M0 = {"mem": [seen[i] for i in ids], "after": [[ids.index(i) for i in a if i in seen] for a in after],
          "ev": [[ids.index(e["id"]) for e in s["events"]] for s in m0["sessions"]],
          "ret": {q: [[h["memory"], D(h["created_at"]), h["score"]] for h in r["hits"]] for q, r in m0["retrieval"].items()},
          "calls": [{"in": (c["in"] or 0) + (c["cache_w"] or 0) + (c["cache_r"] or 0), "out": c["out"], "s": c["s"], "cost": c["cost"],
                     "existing": len(re.findall(r'"id": "\d+"', c["user"].split("## Existing Memories")[1].split("## New Messages")[0])) if "## Existing Memories" in c["user"] else None,
                     "lastk": len([l for l in c["user"].split("## Last k Messages")[1].split("## Recently")[0].strip().split("\n") if l.strip()]) if "## Last k Messages" in c["user"] else None}
                    for c in m0["calls"]]}
    V["m0.n"] = len(ids); V["m0.carry"] = len(CARRY); V["m0.calls"] = len(m0["calls"])
    V["m0.in_avg"] = format(round(sum(c["in"] for c in M0["calls"]) / len(M0["calls"])), ",")
    V["m0.cost"] = "$%.3f" % sum(c["cost"] for c in M0["calls"])
    V["m0.ret_ms"] = round(1000 * sum(r["s"] for r in m0["retrieval"].values()) / len(m0["retrieval"]))
V["mem0_prompt_tokens"] = "7,924"  # counted with the Qwen3-4B tokenizer from mem0/configs/prompts.py (see README)

# ---------- paper loop ----------
PA = {}
for w in ("haiku", "local"):
    p = L(f"paper_{w}.json")
    if not p:
        continue
    PA[w] = {"s": [{"x": s["extracted"], "ops": s["ops"], "st": s["store"]} for s in p["sessions"]], "calls": len(p["calls"])}
    ex = [c for c in p["calls"] if c["tag"] == "paper.extract"]
    PA[w]["lost"] = [[k, ex[k]["raw"][:400]] for k, s in enumerate(p["sessions"]) if not s["extracted"]]
    V[f"pa.{w}.lost"] = len(PA[w]["lost"])
    from collections import Counter
    c = Counter(o["op"] for s in p["sessions"] for o in s["ops"])
    V[f"pa.{w}.n"] = len(p["store"]); V[f"pa.{w}.upd"] = c.get("UPDATE", 0); V[f"pa.{w}.del"] = c.get("DELETE", 0)
    V[f"pa.{w}.add"] = c.get("ADD", 0); V[f"pa.{w}.noop"] = c.get("NOOP", 0); V[f"pa.{w}.ign"] = c.get("IGNORED", 0)

# ---------- Graphiti ----------
# Hand judgement of every edge that was closed (invalid_at set): is the closing correct? key = start of the fact text.
VERDICT = json.load(open(os.path.join(HERE, "inputs", "graphiti_verdicts.json"))) if os.path.exists(os.path.join(HERE, "inputs", "graphiti_verdicts.json")) else {}
GR = {}
for w in ("haiku", "local"):
    g = L(f"graphiti_{w}.json")
    if not g:
        continue
    edges, idx = [], {}
    for k, s in enumerate(g["sessions"]):
        for e in s["edges"]:
            key = e["fact"]
            if key not in idx:
                idx[key] = len(edges)
                edges.append({"f": e["fact"], "va": e["valid_at"], "ia": None, "s0": k, "sc": None})
            x = edges[idx[key]]
            if e["invalid_at"] and x["sc"] is None:
                x["sc"] = k; x["ia"] = e["invalid_at"]
            if e["valid_at"]:
                x["va"] = e["valid_at"]
    for x in edges:
        x["v"] = VERDICT.get(w, {}).get(x["f"][:60])
    from collections import Counter
    pr = Counter(c["prompt"] for c in g["calls"])
    GR[w] = {"e": edges, "per": [len(s["edges"]) for s in g["sessions"]], "err": [s["error"] for s in g["sessions"]],
             "ncalls": [s["calls"] for s in g["sessions"]], "prompts": pr.most_common(),
             "failed": sum(1 for c in g["calls"] if not c["ok"]),
             "ret": {q: [[h["fact"], h["valid_at"], h["invalid_at"]] for h in r["hits"]] for q, r in g["retrieval"].items()},
             "nodes": [[n["name"], n["summary"]] for n in (g.get("nodes") or {}).get("entities", [])]}
    V[f"gr.{w}.edges"] = len(edges); V[f"gr.{w}.closed"] = sum(1 for x in edges if x["sc"] is not None)
    V[f"gr.{w}.calls"] = len(g["calls"]) or len(g.get("llm") or []); V[f"gr.{w}.failed"] = GR[w]["failed"]
    V[f"gr.{w}.tried"] = len(g["sessions"]); GR[w]["stopped"] = g.get("stopped_after")
    V[f"gr.{w}.lost"] = sum(1 for e in GR[w]["err"] if e)
    V[f"gr.{w}.wrong"] = sum(1 for x in edges if x["v"] == "wrong")
    V[f"gr.{w}.nodated"] = sum(1 for x in edges if not x["va"])

# ---------- Letta ----------
lt = L("letta_local.json")
LT = None
if lt:
    ses = []
    for s in lt["sessions"]:
        ses.append({"calls": [[x["tool"], x.get("args", "")[:500]] for x in s["steps"] if x["type"] == "call"],
                    "say": " ".join(x["text"] for x in s["steps"] if x["type"] == "assistant")[:600],
                    "h": s["blocks"].get("human", ""), "p": s["blocks"].get("persona", ""), "a": s["archival"], "s": s["s"]})
    ans = {}
    for q, a in (lt.get("answers") or {}).items():
        ans[q] = {"a": a["answer"], "calls": [[x["tool"], x.get("args", "")[:300]] for x in a["steps"] if x["type"] == "call"],
                  "rets": [x.get("ret", "")[:600] for x in a["steps"] if x["type"] == "return"], "s": a["s"]}
    LT = {"ses": ses, "ans": ans, "tools": lt.get("tools"), "agent_type": lt.get("agent_type")}
    V["lt.arch"] = len(ses[-1]["a"]) if ses else 0
    V["lt.core_edits"] = sum(1 for s in ses for c in s["calls"] if c[0] in ("memory_insert", "memory_replace"))
    V["lt.arch_ins"] = sum(1 for s in ses for c in s["calls"] if c[0] == "archival_memory_insert")
    if ans:
        V["lt.searched"] = sum(1 for a in ans.values() if any(c[0] in ("archival_memory_search", "conversation_search") for c in a["calls"]))
        V["lt.nans"] = len(ans)
    rets = [x for a in (lt.get("answers") or {}).values() for x in a["steps"] if x["type"] == "return" and x.get("tool") == "conversation_search"]
    V["lt.cs_n"] = len(rets); V["lt.cs_empty"] = sum("No results" in x.get("ret", "") for x in rets)
    calls = lt.get("llm") or []
    V["lt.calls"] = len(calls)

# ---------- answers and grades ----------
A = {}
ans = L("answers.json") or {}
if LT and LT["ans"]:
    ans["letta|local"] = {q: {"answer": a["a"]} for q, a in LT["ans"].items()}
for key, d in ans.items():
    A[key] = {q: [d[q]["answer"], bool(grade(QI[q], d[q]["answer"]))] for q in d}
    V["score." + key.replace("|", ".").replace("graphiti_", "gr_").replace("paper_", "pa_")] = sum(v[1] for v in A[key].values())
V["score.full.haiku"] = V.get("score.full.haiku")

# ---------- evidence recall: did the needed words reach the prompt? (no model; abstention questions excluded) ----------
def ev_ok(q, text):
    t = text.lower()
    return all(any(w in t for w in g) for g in EVK[q["id"]])
EV = {}
ctx = {"full": lambda q: full_history()}
if M0:
    ctx["mem0"] = lambda q: "\n".join(h[0] for h in M0["ret"][q])
for w in GR:
    ctx["graphiti_" + w] = (lambda w: lambda q: "\n".join(h[0] for h in GR[w]["ret"][q]))(w)
for w in PA:
    ctx["paper_" + w] = (lambda w: lambda q: "\n".join(PA[w]["s"][-1]["st"].values()))(w)
if LT and LT["ans"]:
    ctx["letta"] = lambda q: (LT["ses"][-1]["h"] + "\n" + "\n".join(LT["ans"][q]["rets"])) if q in LT["ans"] else ""
if LT:
    ctx["lettastore"] = lambda q: LT["ses"][-1]["h"] + "\n" + "\n".join(LT["ses"][-1]["a"])
for name, f in ctx.items():
    EV[name] = {q["id"]: ev_ok(q, f(q["id"])) for q in QUESTIONS if not q.get("abstain")}
    V["ev." + name] = sum(EV[name].values())
V["ev.n"] = sum(1 for q in QUESTIONS if not q.get("abstain"))

# ---------- costs ----------
def csum(calls, claude):
    if not calls:
        return None
    if claude:
        tin = sum((c.get("in") or 0) + (c.get("cache_w") or 0) + (c.get("cache_r") or 0) for c in calls)
        return {"n": len(calls), "in": tin, "out": sum(c.get("out") or 0 for c in calls), "s": round(sum(c["s"] for c in calls)),
                "cost": round(sum(c.get("cost") or 0 for c in calls), 4)}
    return {"n": len(calls), "in": sum(c.get("in") or 0 for c in calls), "out": sum(c.get("out") or 0 for c in calls),
            "s": round(sum(c["s"] for c in calls)), "cost": None}
CTX = {}
for key, d in ans.items():
    sysk = key.split("|")[0]
    cc = [a.get("context_chars") for a in d.values() if a.get("context_chars") is not None]
    if cc:
        CTX[sysk] = round(sum(cc) / len(cc))
COST = []
if m0:
    COST.append({"k": "mem0", "w": csum(m0["calls"], True), "rs": round(1000 * sum(r["s"] for r in m0["retrieval"].values()) / len(m0["retrieval"])), "ctx": CTX.get("mem0")})
p = L("paper_haiku.json")
if p:
    COST.append({"k": "paper_haiku", "w": csum(p.get("llm"), True), "rs": 0, "ctx": CTX.get("paper_haiku")})
for w in ("haiku", "local"):
    g = L(f"graphiti_{w}.json")
    if g:
        COST.append({"k": "graphiti_" + w, "w": csum(g["llm"], w == "haiku"), "rs": round(1000 * sum(r["s"] for r in g["retrieval"].values()) / len(g["retrieval"])), "ctx": CTX.get("graphiti_" + w)})
p = L("paper_local.json")
if p:
    COST.append({"k": "paper_local", "w": {"n": len(p["calls"]), "in": sum(c.get("in") or 0 for c in p["calls"]), "out": sum(c.get("out") or 0 for c in p["calls"]), "s": round(sum(c["s"] for c in p["calls"])), "cost": None}, "rs": 0, "ctx": CTX.get("paper_local")})
if lt:
    nses = len(lt["sessions"])
    llm = lt.get("llm") or []
    # the proxy log covers ingestion and answering; split by count of calls made during ingestion (usage step_count)
    ning = sum(((s.get("usage") or {}).get("step_count") or 0) for s in lt["sessions"])
    COST.append({"k": "letta", "w": csum(llm[:ning], False), "rd": csum(llm[ning:], False), "rs": None, "ctx": None})
COST.append({"k": "full", "w": None, "rs": 0, "ctx": CTX.get("full")})
for c in COST:
    if c["w"]:
        V["cost." + c["k"] + ".n"] = c["w"]["n"]

FMEM = {"COST": COST, "S": S, "Q": Q, "M0": M0, "PA": PA, "GR": GR, "LT": LT, "A": A, "EV": EV, "V": V}
out = "// generated by src/build_data.py from src/recordings; do not edit\nwindow.FMEM=" + json.dumps(FMEM, ensure_ascii=False, separators=(",", ":")) + ";\n"
out = out.replace("</", "<\\/")
open(os.path.join(HERE, "parts", "22_js_fmem_data.js"), "w").write(out)
print("data", len(out), "bytes;", {k: V[k] for k in sorted(V) if k.startswith("score") or k.startswith("ev.")})
