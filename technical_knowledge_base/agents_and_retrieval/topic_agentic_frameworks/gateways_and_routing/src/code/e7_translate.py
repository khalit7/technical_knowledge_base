"""E7: one Anthropic Messages API request (POST /v1/messages) through LiteLLM to the local model, by two routes:
"local" (openai/ prefix) and "local-lmstudio" (lm_studio/ prefix). The locking proxy logs what reached the server.
Output runs/e7_translate.json"""
import json, sys, time, httpx
H = {"Authorization": "Bearer sk-fgw-local-demo", "anthropic-version": "2023-06-01"}
out = {"litellm": "1.104.0", "date": time.strftime("%Y-%m-%d"), "routes": []}
with httpx.Client(timeout=600) as c:
    for model in ("local", "local-lmstudio"):
        t0 = time.time()
        r = c.post("http://127.0.0.1:8610/v1/messages", headers=H,
                   json={"model": model, "max_tokens": 60, "system": "Answer in one short sentence.",
                         "messages": [{"role": "user", "content": "Name one reason to put a gateway in front of model providers."}]})
        out["routes"].append({"model": model, "status": r.status_code, "seconds": round(time.time() - t0, 3), "t0": t0, "response": r.json()})
        print(model, r.status_code, json.dumps(r.json())[:400], flush=True)
json.dump(out, open(sys.argv[1], "w"), indent=1)
