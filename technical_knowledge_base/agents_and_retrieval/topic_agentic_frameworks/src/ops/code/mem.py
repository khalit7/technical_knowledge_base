"""Three memory layers, implemented minimally, on one multi-session conversation, plus two baselines.

  none    : the question alone
  full    : every past session pasted in (the upper bound while history still fits)
  facts   : Mem0-style (arXiv 2504.19413): extract candidate facts, then ADD / UPDATE / DELETE / NOOP
            against the stored facts; the store keeps only the current text of each fact
  graph   : Zep/Graphiti-style (arXiv 2501.13956): facts as edges between entities with valid_at; a new
            edge that contradicts an old one sets the old edge's invalid_at (nothing is deleted)
  paging  : Letta/MemGPT-style (arXiv 2310.08560): the model edits a small always-in-context core block
            with tool calls, can push text to archival storage, and searches archival and recall
            (the raw message log) with tool calls when answering

Usage: python mem.py OUT.json        (model: env BASE_URL, MODEL; temperature 0)
Retrieval is simplified: the fact store and graph are small, so all of it is shown to the answering call;
search tools use keyword overlap, not embeddings. Every model call is logged in OUT.json.
"""
import json, os, re, sys, time
from openai import OpenAI
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mem_data import SESSIONS, ASK_DATE, QUESTIONS, grade

client = OpenAI(base_url=os.environ["BASE_URL"], api_key="local", max_retries=0)
MODEL = os.environ["MODEL"]
CALLS = []


def llm(system, user, tools=None, messages=None, tag="", max_tokens=600):
    msgs = messages or [{"role": "system", "content": system}, {"role": "user", "content": user}]
    t0 = time.time()
    kw = {"tools": tools} if tools else {}
    r = client.chat.completions.create(model=MODEL, messages=msgs, temperature=0, max_tokens=max_tokens, **kw)
    m = r.choices[0].message
    CALLS.append({"tag": tag, "s": round(time.time() - t0, 2), "in": r.usage.prompt_tokens, "out": r.usage.completion_tokens,
                  "raw": (m.content or "")[:800], "tool_calls": [c.function.name + " " + (c.function.arguments or "")[:300] for c in (m.tool_calls or [])]})
    return m


def parse_json(text, default):
    """Tolerant JSON reader: the 4B model sometimes writes several JSON arrays, one per line, or wraps them in
    a code fence. Every top-level JSON value in the text is decoded; lists are concatenated."""
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if m:
        text = m.group(1)
    dec, vals, i = json.JSONDecoder(), [], 0
    while i < len(text):
        if text[i] in "[{":
            try:
                v, j = dec.raw_decode(text, i)
                vals.append(v)
                i = j
                continue
            except Exception:
                pass
        i += 1
    if not vals:
        return default
    if isinstance(default, list):
        out = []
        for v in vals:
            out.extend(v if isinstance(v, list) else [v])
        return out
    return vals[0]


def transcript(sess):
    return "\n".join(f"{r}: {t}" for r, t in sess["turns"])


# ---------------- facts (Mem0-style) ----------------
EXTRACT = ("You extract durable facts about the user and their project from a conversation, for long-term memory. "
           "Return only a JSON list of short standalone fact strings. Include the date only if it matters.")
UPDATE = ("You maintain a memory store. You get the existing memories (with ids) and new facts. For each new fact decide: "
          "ADD (new information), UPDATE (an existing memory about the same thing should be rewritten; give its id and the new text), "
          "DELETE (an existing memory is now false; give its id), or NOOP (already known). "
          'Return only a JSON list like [{"op":"ADD","text":"..."},{"op":"UPDATE","id":"m2","text":"..."},{"op":"DELETE","id":"m1"},{"op":"NOOP"}].')


def run_facts():
    store, log, nid = {}, [], 0
    for s in SESSIONS:
        facts = parse_json(llm(EXTRACT, f"Conversation on {s['date']}:\n{transcript(s)}", tag="facts.extract").content, [])
        facts = [f if isinstance(f, str) else json.dumps(f) for f in facts]
        existing = "\n".join(f"{k}: {v}" for k, v in store.items()) or "(empty)"
        ops = parse_json(llm(UPDATE, f"Existing memories:\n{existing}\n\nNew facts:\n" + "\n".join("- " + f for f in facts),
                             tag="facts.update").content, [])
        applied = []
        for o in ops if isinstance(ops, list) else []:
            op = str(o.get("op", "")).upper()
            if op == "ADD" and o.get("text"):
                nid += 1; store[f"m{nid}"] = o["text"]; applied.append({"op": "ADD", "id": f"m{nid}", "text": o["text"]})
            elif op == "UPDATE" and o.get("id") in store and o.get("text"):
                applied.append({"op": "UPDATE", "id": o["id"], "old": store[o["id"]], "text": o["text"]}); store[o["id"]] = o["text"]
            elif op == "DELETE" and o.get("id") in store:
                applied.append({"op": "DELETE", "id": o["id"], "old": store.pop(o["id"])})
            elif op == "NOOP":
                applied.append({"op": "NOOP"})
        log.append({"date": s["date"], "extracted": facts, "ops": applied, "store": dict(store)})
    ctx = "Memories about the user:\n" + "\n".join(f"- {v}" for v in store.values())
    return ctx, log


# ---------------- graph (Zep-style) ----------------
EDGES = ("Extract facts from the conversation as edges of a knowledge graph. Return only a JSON list of objects "
         '{"subject": entity, "relation": UPPER_SNAKE_CASE verb, "object": entity, "fact": one sentence}. '
         "Use the user's name as the subject for facts about the user.")
INVALIDATE = ("You check a knowledge graph for contradictions. You get existing edges that are still valid (with ids) and new edges. "
              "An existing edge is invalidated if a new edge makes it no longer true (a replacement, a change, someone leaving). "
              'Return only a JSON list of the ids of existing edges that are no longer true, for example ["e1","e4"], or [].')


def run_graph():
    edges, log, nid = [], [], 0
    for s in SESSIONS:
        new = parse_json(llm(EDGES, f"Conversation on {s['date']}:\n{transcript(s)}", tag="graph.extract").content, [])
        new = [e for e in new if isinstance(e, dict) and e.get("fact")]
        active = [e for e in edges if not e["invalid_at"]]
        inv = []
        if active and new:
            listing = "\n".join(f"{e['id']}: {e['fact']}" for e in active)
            inv = parse_json(llm(INVALIDATE, f"Existing valid edges:\n{listing}\n\nNew edges:\n" + "\n".join("- " + e["fact"] for e in new),
                                 tag="graph.invalidate").content, [])
            inv = [i for i in inv if isinstance(i, str)]
        for e in edges:
            if e["id"] in inv and not e["invalid_at"]:
                e["invalid_at"] = s["date"]
        added = []
        for e in new:
            nid += 1
            ed = {"id": f"e{nid}", "subject": str(e.get("subject", "")), "relation": str(e.get("relation", "")),
                  "object": str(e.get("object", "")), "fact": e["fact"], "valid_at": s["date"], "invalid_at": None}
            edges.append(ed); added.append(ed["id"])
        log.append({"date": s["date"], "added": added, "invalidated": inv, "edges": json.loads(json.dumps(edges))})
    lines = []
    for e in edges:
        span = f"valid from {e['valid_at']}" + (f" until {e['invalid_at']} (no longer true)" if e["invalid_at"] else " (still true)")
        lines.append(f"- {e['fact']} [{span}]")
    return "Knowledge graph facts with their validity:\n" + "\n".join(lines), log


# ---------------- paging (Letta / MemGPT-style) ----------------
CORE_LIMIT = 300


def fn(name, desc, props):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {
        "type": "object", "properties": {k: {"type": "string", "description": d} for k, d in props.items()}, "required": list(props)}}}


MEM_TOOLS = [fn("core_memory_append", f"Append a line to the core memory block about the user (always visible; limit {CORE_LIMIT} characters).", {"text": "text to append"}),
             fn("core_memory_replace", "Replace exact old text in the core memory block with new text.", {"old": "exact old text", "new": "new text"}),
             fn("archival_memory_insert", "Store a longer note in archival memory (not visible until searched).", {"text": "note"})]
SEARCH_TOOLS = [fn("archival_memory_search", "Keyword search over archival memory.", {"query": "keywords"}),
                fn("conversation_search", "Keyword search over every past message (recall storage).", {"query": "keywords"})]


def kw_search(items, query, k=4):
    q = set(re.findall(r"[a-z0-9$]+", query.lower()))
    scored = sorted(((len(q & set(re.findall(r"[a-z0-9$]+", t.lower()))), t) for t in items), key=lambda x: -x[0])
    return [t for s, t in scored if s > 0][:k]


def paging_system(core, extra=""):
    return ("You are an assistant with a memory system. Your context is small, so you keep what matters about the user in the CORE MEMORY block below, "
            f"which you edit with tools (limit {CORE_LIMIT} characters; when it is full, replace outdated lines or move detail to archival memory). "
            "Keep it current: when a fact changes, replace the old line. " + extra +
            f"\n\nCORE MEMORY ({len(core)}/{CORE_LIMIT} chars):\n" + (core or "(empty)"))


def run_paging():
    core, archival, recall, log = "", [], [], []
    for s in SESSIONS:
        recall += [f"[{s['date']}] {r}: {t}" for r, t in s["turns"]]
        msgs = [{"role": "system", "content": paging_system(core, "After a conversation, update your memory with the tools, then reply DONE.")},
                {"role": "user", "content": f"Conversation on {s['date']} just ended:\n{transcript(s)}\n\nUpdate your memory now."}]
        acts = []
        for _ in range(6):
            m = llm(None, None, tools=MEM_TOOLS, messages=msgs, tag="paging.update")
            msgs.append(m.model_dump(exclude_none=True))
            if not m.tool_calls:
                break
            for c in m.tool_calls:
                a = parse_json(c.function.arguments, {}) if c.function.arguments else {}
                n = c.function.name
                if n == "core_memory_append":
                    t = str(a.get("text", ""))
                    if len(core) + len(t) + 1 > CORE_LIMIT:
                        res = f"error: core memory full ({len(core)}/{CORE_LIMIT}); replace or archive something first"
                    else:
                        core = (core + "\n" + t).strip(); res = "ok"
                elif n == "core_memory_replace":
                    old, new = str(a.get("old", "")), str(a.get("new", ""))
                    if old and old in core and len(core) - len(old) + len(new) <= CORE_LIMIT:
                        core = core.replace(old, new, 1); res = "ok"
                    else:
                        res = "error: old text not found or result too long"
                elif n == "archival_memory_insert":
                    archival.append(f"[{s['date']}] {a.get('text', '')}"); res = "ok"
                else:
                    res = "error: unknown tool"
                acts.append({"tool": n, "args": a, "result": res})
                msgs.append({"role": "tool", "tool_call_id": c.id, "content": res})
            msgs[0] = {"role": "system", "content": paging_system(core, "After a conversation, update your memory with the tools, then reply DONE.")}
        log.append({"date": s["date"], "actions": acts, "core": core, "archival": list(archival)})
    return (core, archival, recall), log


def answer_paging(state, q):
    core, archival, recall = state
    msgs = [{"role": "system", "content": paging_system(core, f"Today is {ASK_DATE}. If the core memory does not answer the question, search archival memory or the conversation history first. Answer in one or two sentences.")},
            {"role": "user", "content": q}]
    acts = []
    for _ in range(4):
        m = llm(None, None, tools=SEARCH_TOOLS, messages=msgs, tag="paging.answer", max_tokens=200)
        msgs.append(m.model_dump(exclude_none=True))
        if not m.tool_calls:
            return m.content or "", acts
        for c in m.tool_calls:
            a = parse_json(c.function.arguments, {}) if c.function.arguments else {}
            hits = kw_search(archival if c.function.name == "archival_memory_search" else recall, str(a.get("query", "")))
            acts.append({"tool": c.function.name, "query": a.get("query"), "hits": hits})
            msgs.append({"role": "tool", "tool_call_id": c.id, "content": "\n".join(hits) or "no results"})
    return "(no answer within 4 steps)", acts


def answer(ctx, q, tag):
    sys_p = f"You are a helpful assistant. Today is {ASK_DATE}. Answer in one or two sentences."
    if ctx:
        sys_p += " Use this memory of past conversations with the user:\n\n" + ctx
    return llm(sys_p, q, tag=tag, max_tokens=200).content or ""


def main(out):
    res = {"model": MODEL, "date": time.strftime("%Y-%m-%d"), "systems": {}}
    full = "\n\n".join(f"Conversation on {s['date']}:\n{transcript(s)}" for s in SESSIONS)
    t = time.time(); fctx, flog = run_facts(); res["facts_build_s"] = round(time.time() - t, 1)
    t = time.time(); gctx, glog = run_graph(); res["graph_build_s"] = round(time.time() - t, 1)
    t = time.time(); pstate, plog = run_paging(); res["paging_build_s"] = round(time.time() - t, 1)
    res["build"] = {"facts": flog, "graph": glog, "paging": plog}
    res["contexts"] = {"none": "", "full": full, "facts": fctx, "graph": gctx, "paging_core": pstate[0]}
    for name, ctx in (("none", ""), ("full", full), ("facts", fctx), ("graph", gctx)):
        res["systems"][name] = []
        for q in QUESTIONS:
            a = answer(ctx, q["q"], f"{name}.answer")
            res["systems"][name].append({"id": q["id"], "answer": a, "pass": grade(q, a)})
    res["systems"]["paging"] = []
    for q in QUESTIONS:
        a, acts = answer_paging(pstate, q["q"])
        res["systems"]["paging"].append({"id": q["id"], "answer": a, "pass": grade(q, a), "searches": acts})
    res["calls"] = CALLS
    json.dump(res, open(out, "w"), indent=1)
    for k, v in res["systems"].items():
        print(k, sum(x["pass"] for x in v), "/", len(v))


main(sys.argv[1])
