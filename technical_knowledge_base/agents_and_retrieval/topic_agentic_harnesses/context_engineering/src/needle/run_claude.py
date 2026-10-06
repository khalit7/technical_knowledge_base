#!/usr/bin/env python3
"""Run every case through claude -p (no tools), sequentially. Usage: run_claude.py CASES.json OUT.jsonl MODEL"""
import json, os, subprocess, sys, time
cases_path, out, model = sys.argv[1:4]
C = json.load(open(cases_path))
done = set()
if os.path.exists(out):
    done = {json.loads(l)["id"] for l in open(out)}
wd = os.path.join(os.path.dirname(os.path.abspath(out)), "wd")
os.makedirs(wd, exist_ok=True)
for c in C["cases"]:
    if c["id"] in done:
        continue
    t0 = time.time()
    p = subprocess.run(["claude", "-p", "--tools", "", "--system-prompt", C["system"], "--model", model,
                        "--output-format", "json", "--no-session-persistence", "--setting-sources", "project",
                        "--strict-mcp-config", "--max-turns", "1"], input=c["prompt"], capture_output=True, text=True, cwd=wd)
    try:
        r = json.loads(p.stdout)
    except Exception:
        r = {"error": p.stdout[-500:] + p.stderr[-500:]}
    u = r.get("usage", {})
    rec = {"id": c["id"], "task": c["task"], "target": c["target"], "depth": c["depth"], "answer": c["answer"],
           "reply": r.get("result"), "input_total": (u.get("input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0),
           "usage": u, "model": list((r.get("modelUsage") or {}).keys()), "secs": round(time.time() - t0, 1), "error": r.get("error") or (r.get("is_error") and r.get("subtype"))}
    open(out, "a").write(json.dumps(rec) + "\n")
    print(rec["id"], rec["input_total"], repr(rec["reply"])[:60], flush=True)
