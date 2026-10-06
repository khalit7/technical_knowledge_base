"""Mem0 2.2.1 (pip mem0ai, open-source library) on the twelve sessions, then search for each question.

Writer model: Claude Haiku 4.5 through llm_claude.py (Mem0's extraction system prompt alone is 7,924 tokens with the
Qwen tokenizer, over the shared local server's ~8K limit). Embeddings: bge-small-en-v1.5 via embed_server.py.
Vector store: Qdrant in local (embedded) mode. Telemetry off (MEM0_TELEMETRY=False).
Live use is simulated: while session k is added, the prompt's "Current Date"/"Observation Date" is session k's date
(the OSS add() has no timestamp parameter: "Platform-only temporal parameter. Not supported in OSS.").
Usage: python run_mem0.py OUTDIR
"""
import json, os, sys, time
os.environ["MEM0_TELEMETRY"] = "False"
os.environ["MAX_THINKING_TOKENS"] = "0"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conv import SESSIONS, QUESTIONS
from llm_claude import claude_complete

OUT = os.path.abspath(sys.argv[1])
os.makedirs(OUT, exist_ok=True)
os.environ["MEM0_DIR"] = os.path.join(OUT, "mem0dir")
LOG = os.path.join(OUT, "llm_calls.jsonl")

from mem0 import Memory
import mem0.configs.prompts as P

CUR = {"date": None}
_orig = P._resolve_dates
P._resolve_dates = lambda current_date=None, observation_date=None: (CUR["date"], CUR["date"])


class ClaudeLLM:
    def __init__(self):
        self.n = 0

    def generate_response(self, messages, response_format=None, tools=None, tool_choice="auto", **kw):
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        user = "\n\n".join(m["content"] for m in messages if m["role"] != "system")
        self.n += 1
        return claude_complete(system, user, model="haiku", log=LOG, tag=f"mem0.extract.{CUR['date']}")


cfg = {
    "vector_store": {"provider": "qdrant", "config": {"path": os.path.join(OUT, "qdrant"), "collection_name": "sam",
                                                       "embedding_model_dims": 384, "on_disk": True}},
    "embedder": {"provider": "openai", "config": {"model": "bge-small-en-v1.5", "api_key": "local",
                                                  "openai_base_url": "http://127.0.0.1:8711/v1", "embedding_dims": 384}},
    "llm": {"provider": "openai", "config": {"model": "unused", "api_key": "unused", "openai_base_url": "http://127.0.0.1:9/v1"}},
    "history_db_path": os.path.join(OUT, "history.db"),
}
m = Memory.from_config(cfg)
m.llm = ClaudeLLM()

res = {"library": "mem0ai 2.2.1", "writer": "claude-haiku-4-5 via claude -p", "sessions": []}
for s in SESSIONS:
    CUR["date"] = s["date"]
    msgs = [{"role": r, "content": t} for r, t in s["turns"]]
    t0 = time.time()
    err = None
    try:
        out = m.add(msgs, user_id="sam", metadata={"created_at": s["date"] + "T12:00:00+00:00", "session_date": s["date"]})
    except Exception as e:
        out, err = {"results": []}, repr(e)[:300]
    store = m.get_all(filters={"user_id": "sam"}, top_k=500)
    items = store.get("results", store) if isinstance(store, dict) else store
    res["sessions"].append({"date": s["date"], "s": round(time.time() - t0, 1), "error": err,
                            "events": out.get("results", out) if isinstance(out, dict) else out,
                            "store": [{"id": x["id"], "memory": x["memory"], "created_at": x.get("created_at")} for x in items]})
    print(s["date"], len(items), "memories", err or "", flush=True)

CUR["date"] = "2026-10-06"
res["retrieval"] = {}
for q in QUESTIONS:
    t0 = time.time()
    r = m.search(q["q"], top_k=10, filters={"user_id": "sam"}, explain=True)
    items = r.get("results", r) if isinstance(r, dict) else r
    res["retrieval"][q["id"]] = {"s": round(time.time() - t0, 3), "hits": [
        {"memory": x["memory"], "created_at": x.get("created_at"), "score": round(x.get("score", 0), 4),
         "details": {k: round(v, 4) if isinstance(v, float) else v for k, v in (x.get("score_details") or {}).items()}} for x in items]}
res["n_llm_calls"] = m.llm.n
json.dump(res, open(os.path.join(OUT, "mem0.json"), "w"), indent=1)
print("done", m.llm.n, "calls")
