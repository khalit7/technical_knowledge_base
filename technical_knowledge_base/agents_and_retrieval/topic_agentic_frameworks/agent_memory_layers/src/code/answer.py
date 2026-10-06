"""Answer the 25 questions from one memory system's retrieved context, with one reader model.

Every system gets the same instruction; only the memory text differs:
  none      no memory at all
  full      all twelve sessions pasted in (about 1.9K tokens here; the upper bound while history fits)
  mem0      the 10 memories mem0ai 2.2.1's search returned for the question, with their dates
  graphiti  the 10 edges Graphiti's search returned, with valid_at / invalid_at
  lettastore the Letta agent's core block and all its archival notes, pasted whole
  paper_W   every fact in the paper-algorithm store (it is small, so no retrieval step)
Usage: python answer.py SYSTEM READER RUNDIR OUT.json     (READER: local | haiku)
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
from conv import QUESTIONS, ASK_DATE, full_history

SYSTEM, READER, RUN, OUT = sys.argv[1:5]
os.environ["MAX_THINKING_TOKENS"] = "0"
QWEN = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
INSTR = (f"You are Sam's assistant. Today is {ASK_DATE}. Below is your memory of past conversations with Sam. "
         "Answer Sam's question from it in one or two sentences. If the memory does not contain the answer, say you don't know. "
         "Never use the em-dash character.\n\n")


def ctx_for(qid):
    if SYSTEM == "none":
        return "(no memory)"
    if SYSTEM == "full":
        return full_history()
    if SYSTEM == "mem0":
        hits = json.load(open(os.path.join(RUN, "mem0_haiku", "mem0.json")))["retrieval"][qid]["hits"]
        return "Memories (most relevant first):\n" + "\n".join(f"- [{(h['created_at'] or '')[:10]}] {h['memory']}" for h in hits)
    if SYSTEM.startswith("graphiti"):
        w = SYSTEM.split("_")[1]
        hits = json.load(open(os.path.join(RUN, f"gr_{w}", "graphiti.json")))["retrieval"][qid]["hits"]
        return "Facts (most relevant first), with the dates each was true:\n" + "\n".join(
            f"- {h['fact']} [valid from {h['valid_at'] or 'unknown'} to {h['invalid_at'] or 'present'}]" for h in hits)
    if SYSTEM.startswith("paper"):
        st = json.load(open(os.path.join(RUN, f"paper_{SYSTEM.split('_')[1]}.json")))["store"]
        return "Memories:\n" + "\n".join(f"- {v}" for v in st.values())
    if SYSTEM == "lettastore":  # what the Letta agent stored (core block + every archival note), pasted whole
        d = json.load(open(os.path.join(RUN, "letta_local", "letta.json")))
        return "Core memory:\n" + d["final_blocks"].get("human", "") + "\n\nArchival notes:\n" + "\n".join("- " + a for a in d["final_archival"])
    raise SystemExit("unknown system")


def ask(system, user):
    if READER == "haiku":
        from llm_claude import claude_complete
        t0 = time.time()
        txt = claude_complete(system, user, "haiku", os.path.join(RUN, f"answer_calls_haiku.jsonl"), f"answer.{SYSTEM}")
        return txt, {"s": round(time.time() - t0, 2)}
    from mlx_call import chat
    t0 = time.time()
    r = chat({"model": QWEN, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
              "temperature": 0, "max_tokens": 200})
    return r["choices"][0]["message"].get("content") or "", {"s": round(time.time() - t0, 2), "in": r["usage"]["prompt_tokens"], "out": r["usage"]["completion_tokens"]}


out = {"system": SYSTEM, "reader": READER, "answers": {}}
for q in QUESTIONS:
    ctx = ctx_for(q["id"])
    a, meta = ask(INSTR + ctx, q["q"])
    out["answers"][q["id"]] = {"answer": a, "context_chars": len(ctx), **meta}
    print(SYSTEM, READER, q["id"], a[:90].replace("\n", " "), flush=True)
    json.dump(out, open(OUT, "w"), indent=1)
print("done")
