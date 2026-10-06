#!/usr/bin/env python3
"""Run every case against the local mlx_lm.server (OpenAI-compatible), one request at a time. Usage: run_mlx.py CASES.json OUT.jsonl"""
import json, os, sys, time, urllib.request
cases_path, out = sys.argv[1:3]
C = json.load(open(cases_path))
MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
done = {json.loads(l)["id"] for l in open(out)} if os.path.exists(out) else set()
for c in C["cases"]:
    if c["id"] in done:
        continue
    body = {"model": MODEL, "messages": [{"role": "system", "content": C["system"]}, {"role": "user", "content": c["prompt"]}],
            "temperature": 0.0, "max_tokens": 80}
    t0 = time.time()
    try:
        req = urllib.request.Request("http://127.0.0.1:8090/v1/chat/completions", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
        r = json.loads(urllib.request.urlopen(req, timeout=900).read())
        rep, usage, err = r["choices"][0]["message"]["content"], r.get("usage"), None
    except Exception as e:
        rep, usage, err = None, None, str(e)[:300]
    rec = {"id": c["id"], "task": c["task"], "target": c["target"], "depth": c["depth"], "answer": c["answer"], "reply": rep,
           "usage": usage, "secs": round(time.time() - t0, 1), "error": err}
    open(out, "a").write(json.dumps(rec) + "\n")
    print(rec["id"], (usage or {}).get("prompt_tokens"), repr(rep)[:60], err, rec["secs"], flush=True)
    if err:
        print("stopping on error", flush=True); break
