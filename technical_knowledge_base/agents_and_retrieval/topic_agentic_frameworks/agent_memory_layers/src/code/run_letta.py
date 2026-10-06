"""Letta server 0.16.8 (the last PyPI release of the server, 14 May 2026; the repo was archived on 16 Aug 2026 and the
PyPI name `letta` now ships Letta Code) driven over its REST API, local model through the locking proxy.

Agent: default agent type (letta_v1_agent: tools conversation_search, memory_insert, memory_replace) plus the
archival tools archival_memory_insert and archival_memory_search, blocks `human` (empty) and `persona`, context window
set to 8,192 tokens (the shared local server's limit), temperature 0. Embeddings: bge-small via embed_server.py.
Each session is sent as one user message (the fixed transcript, dated); the agent decides what to store.
Each question is asked in a NEW conversation of the same agent, with its blocks isolated (copies), so questions
cannot see each other; the agent may search recall (conversation_search) and archival memory.
Usage: python run_letta.py OUTDIR
"""
import json, os, sys, time, requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conv import SESSIONS, QUESTIONS, ASK_DATE, transcript

OUT = os.path.abspath(sys.argv[1])
os.makedirs(OUT, exist_ok=True)
B = "http://127.0.0.1:8283/v1"
QWEN = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
LLM = {"model": QWEN, "model_endpoint_type": "openai", "model_endpoint": "http://127.0.0.1:8722/v1", "context_window": 8192,
       "handle": "openai-proxy/" + QWEN, "temperature": 0.0, "max_tokens": 600, "provider_name": "openai"}
EMB = {"embedding_endpoint_type": "openai", "embedding_endpoint": "http://127.0.0.1:8711/v1", "embedding_model": "bge-small-en-v1.5",
       "embedding_dim": 384, "embedding_chunk_size": 300}


def slim(msgs):
    out = []
    for m in msgs:
        t = m.get("message_type")
        if t == "tool_call_message":
            tc = m.get("tool_call") or (m.get("tool_calls") or [{}])[0]
            out.append({"type": "call", "tool": tc.get("name"), "args": (tc.get("arguments") or "")[:600]})
        elif t == "tool_return_message":
            out.append({"type": "return", "tool": m.get("name"), "status": m.get("status"), "ret": str(m.get("tool_return"))[:600]})
        elif t in ("assistant_message", "reasoning_message"):
            out.append({"type": t.split("_")[0], "text": str(m.get("content") or m.get("reasoning") or "")[:800]})
        elif t == "usage_statistics":
            pass
        else:
            out.append({"type": t})
    return out


def blocks(aid):
    r = requests.get(f"{B}/agents/{aid}/core-memory/blocks", timeout=60).json()
    return {b["label"]: b["value"] for b in r}


def archival(aid):
    r = requests.get(f"{B}/agents/{aid}/archival-memory", params={"limit": 200}, timeout=60).json()
    return [p.get("text") for p in r]


a = requests.post(f"{B}/agents/", json={
    "name": "sam_memory", "llm_config": LLM, "embedding_config": EMB, "include_base_tools": True,
    "tools": ["archival_memory_insert", "archival_memory_search"],
    "memory_blocks": [{"label": "human", "value": "", "limit": 2000},
                      {"label": "persona", "value": "I am a helpful assistant that remembers what the user tells me.", "limit": 2000}]},
    timeout=120).json()
aid = a["id"]
res = {"library": "letta 0.16.8 (server)", "writer": "local Qwen3-4B", "agent_type": a.get("agent_type"),
       "tools": [t["name"] for t in a.get("tools", [])], "system_chars": len(a.get("system", "")), "sessions": []}
print(res["agent_type"], res["tools"], flush=True)
for s in SESSIONS:
    msg = f"[This conversation took place on {s['date']}.]\n{transcript(s)}"
    t0 = time.time()
    r = requests.post(f"{B}/agents/{aid}/messages", json={"messages": [{"role": "user", "content": msg}]}, timeout=1800)
    d = r.json() if r.status_code == 200 else {"error": r.text[:500]}
    res["sessions"].append({"date": s["date"], "s": round(time.time() - t0, 1), "status": r.status_code,
                            "steps": slim(d.get("messages", [])), "usage": d.get("usage"), "blocks": blocks(aid),
                            "archival": archival(aid), "error": d.get("error")})
    print(s["date"], r.status_code, round(time.time() - t0, 1), "s", flush=True)
    json.dump(res, open(os.path.join(OUT, "letta.json"), "w"), indent=1)

res["answers"] = {}
for q in QUESTIONS:
    t0 = time.time()
    c = requests.post(f"{B}/conversations/", params={"agent_id": aid}, json={"isolated_block_labels": ["human", "persona"]}, timeout=60)
    cid = c.json()["id"]
    r = requests.post(f"{B}/conversations/{cid}/messages", json={"messages": [{"role": "user", "content": f"(Today is {ASK_DATE}.) {q['q']}"}],
                                                                "streaming": False}, timeout=1800)
    try:
        d = r.json()
    except Exception:
        d = {"error": r.text[:500]}
    if isinstance(d, list):
        d = {"messages": d}
    steps = slim(d.get("messages", []))
    ans = " ".join(x["text"] for x in steps if x["type"] == "assistant")
    res["answers"][q["id"]] = {"s": round(time.time() - t0, 1), "status": r.status_code, "steps": steps, "answer": ans,
                               "usage": d.get("usage"), "error": d.get("error")}
    print(q["id"], r.status_code, round(time.time() - t0, 1), "s", ans[:100].replace("\n", " "), flush=True)
    json.dump(res, open(os.path.join(OUT, "letta.json"), "w"), indent=1)
res["final_blocks"] = blocks(aid)
res["final_archival"] = archival(aid)
json.dump(res, open(os.path.join(OUT, "letta.json"), "w"), indent=1)
print("done")
