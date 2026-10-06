"""The Mem0 PAPER's update loop (arXiv 2504.19413: extract facts, then ADD / UPDATE / DELETE / NOOP against stored
facts), as implemented minimally on the frameworks root's Production stack tab (src/ops/code/mem.py, run_facts),
run here on the twelve sessions with the local model. Shown beside the mem0ai 2.2.1 library, which since 2.0.0
only ADDs. Usage: python mem_paper.py OUT.json [local|haiku]
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from conv import SESSIONS, transcript
from mlx_call import chat

MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
CALLS = []

EXTRACT = ("You extract durable facts about the user and their project from a conversation, for long-term memory. "
           "Return only a JSON list of short standalone fact strings. Include the date only if it matters.")
UPDATE = ("You maintain a memory store. You get the existing memories (with ids) and new facts. For each new fact decide: "
          "ADD (new information), UPDATE (an existing memory about the same thing should be rewritten; give its id and the new text), "
          "DELETE (an existing memory is now false; give its id), or NOOP (already known). "
          'Return only a JSON list like [{"op":"ADD","text":"..."},{"op":"UPDATE","id":"m2","text":"..."},{"op":"DELETE","id":"m1"},{"op":"NOOP"}].')


WRITER = sys.argv[2] if len(sys.argv) > 2 else "local"


def llm(system, user, tag):
    t0 = time.time()
    if WRITER == "haiku":
        from llm_claude import claude_complete
        os.environ["MAX_THINKING_TOKENS"] = "0"
        txt = claude_complete(system, user, "haiku", os.path.splitext(sys.argv[1])[0] + "_calls.jsonl", tag)
        CALLS.append({"tag": tag, "s": round(time.time() - t0, 2), "raw": txt[:1500]})
        return txt
    r = chat({"model": MODEL, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
              "temperature": 0, "max_tokens": 800})
    txt = r["choices"][0]["message"].get("content") or ""
    CALLS.append({"tag": tag, "s": round(time.time() - t0, 2), "in": r["usage"]["prompt_tokens"], "out": r["usage"]["completion_tokens"], "raw": txt[:1500]})
    return txt


def parse_json(text, default):
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if m:
        text = m.group(1)
    dec, vals, i = json.JSONDecoder(), [], 0
    while i < len(text):
        if text[i] in "[{":
            try:
                v, j = dec.raw_decode(text, i); vals.append(v); i = j; continue
            except Exception:
                pass
        i += 1
    if not vals:
        return default
    out = []
    for v in vals:
        out.extend(v if isinstance(v, list) else [v])
    return out


store, log, nid = {}, [], 0
for s in SESSIONS:
    facts = parse_json(llm(EXTRACT, f"Conversation on {s['date']}:\n{transcript(s)}", "paper.extract"), [])
    facts = [f if isinstance(f, str) else json.dumps(f) for f in facts]
    existing = "\n".join(f"{k}: {v}" for k, v in store.items()) or "(empty)"
    ops = parse_json(llm(UPDATE, f"Existing memories:\n{existing}\n\nNew facts:\n" + "\n".join("- " + f for f in facts), "paper.update"), [])
    applied = []
    for o in ops:
        if not isinstance(o, dict):
            continue
        op = str(o.get("op", "")).upper()
        if op == "ADD" and o.get("text"):
            nid += 1; store[f"m{nid}"] = o["text"]; applied.append({"op": "ADD", "id": f"m{nid}", "text": o["text"]})
        elif op == "UPDATE" and o.get("id") in store and o.get("text"):
            applied.append({"op": "UPDATE", "id": o["id"], "old": store[o["id"]], "text": o["text"]}); store[o["id"]] = o["text"]
        elif op == "DELETE" and o.get("id") in store:
            applied.append({"op": "DELETE", "id": o["id"], "old": store.pop(o["id"])})
        elif op == "NOOP":
            applied.append({"op": "NOOP"})
        else:
            applied.append({"op": "IGNORED", "raw": o})
    log.append({"date": s["date"], "extracted": facts, "ops": applied, "store": dict(store)})
    print(s["date"], len(store), "facts", flush=True)
json.dump({"library": "Mem0 paper algorithm, minimal (root's mem.py)", "writer": "local Qwen3-4B" if WRITER == "local" else "claude-haiku-4-5 via claude -p", "sessions": log,
           "store": store, "calls": CALLS}, open(sys.argv[1], "w"), indent=1)
print("done", len(CALLS))
