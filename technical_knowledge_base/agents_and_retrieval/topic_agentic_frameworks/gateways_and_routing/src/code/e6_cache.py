"""E6 and E7: the gateway's response cache, and its format translation, on the local model.

Proxy model "local" = mlx-community/Qwen3-4B-Instruct-2507-4bit behind the shared server, reached through
the locking proxy (one request at a time across agents). Cache: LiteLLM in-memory ("local"), default TTL.
E6 steps (each a chat completion, max_tokens 60):
  a  question Q at temperature 0             (expect miss)
  b  the same request again                  (expect hit)
  c  Q at temperature 0.9                    (miss: temperature is part of the key)
  d  the same temperature-0.9 request again  (hit: the 'random' answer comes back word for word)
  e  Q with one extra space                  (miss: the key is exact text)
  f  Q at temperature 0 with cache no-cache  (miss: bypass, then stored)
E7: one Anthropic Messages API request (POST /v1/messages) to the same model name.
Output runs/e6_cache.json
"""
import json, sys, time
import httpx

BASE = "http://127.0.0.1:8610"
H = {"Authorization": "Bearer sk-fgw-local-demo"}
Q = "In one sentence: why does an LLM gateway retry a request that failed with HTTP 429?"
steps = [
    ("a", "Q, temperature 0", {"temperature": 0}, Q),
    ("b", "same request again", {"temperature": 0}, Q),
    ("c", "Q, temperature 0.9", {"temperature": 0.9}, Q),
    ("d", "same temperature 0.9 request again", {"temperature": 0.9}, Q),
    ("e", "Q with one extra space, temperature 0", {"temperature": 0}, Q.replace("why does", "why  does")),
    ("f", "Q, temperature 0, cache no-cache", {"temperature": 0, "cache": {"no-cache": True}}, Q),
]
out = {"litellm": "1.104.0", "model": "mlx-community/Qwen3-4B-Instruct-2507-4bit (local model on Apple M1 Pro)",
       "date": time.strftime("%Y-%m-%d"), "question": Q, "steps": []}
with httpx.Client(timeout=600) as c:
    for k, label, extra, q in steps:
        t0 = time.time()
        r = c.post(BASE + "/v1/chat/completions", headers=H,
                   json={"model": "local", "max_tokens": 60, "messages": [{"role": "user", "content": q}], **extra})
        dt = time.time() - t0
        b = r.json()
        hd = {h: r.headers.get(h) for h in ("x-litellm-cache-key", "x-litellm-response-cost", "x-litellm-response-duration-ms")}
        hit = (b.get("_hidden_params") or {}).get("cache_hit")
        step = {"step": k, "label": label, "params": extra, "status": r.status_code, "seconds": round(dt, 3),
                "text": b["choices"][0]["message"]["content"] if r.status_code == 200 else str(b)[:200],
                "usage": b.get("usage"), "headers": hd}
        out["steps"].append(step)
        print(k, r.status_code, round(dt, 3), hd["x-litellm-cache-key"], (step["text"] or "")[:60], flush=True)
    # E7: Anthropic-format request through the same gateway
    t0 = time.time()
    r = c.post(BASE + "/v1/messages", headers={**H, "anthropic-version": "2023-06-01"},
               json={"model": "local", "max_tokens": 60, "system": "Answer in one short sentence.",
                     "messages": [{"role": "user", "content": "Name one reason to put a gateway in front of model providers."}]})
    out["anthropic_messages"] = {"status": r.status_code, "seconds": round(time.time() - t0, 3), "response": r.json()}
    print("E7", r.status_code, json.dumps(r.json())[:300])
json.dump(out, open(sys.argv[1], "w"), indent=1)
