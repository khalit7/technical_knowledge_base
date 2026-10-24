"""Claude as a plain completion model, through the subscription CLI (no API key on this machine).

One call = `claude -p` with tools off, our own system prompt (replacing Claude Code's), no MCP servers, no user
settings, no session saved. The CLI still adds about 420 tokens of its own context (measured on the harnesses root).
Every call is appended to a JSONL log with prompt, reply, usage and the CLI's API-price equivalent.
"""
import json, os, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
CWD = os.path.join(os.path.dirname(HERE), "cwd")
os.makedirs(CWD, exist_ok=True)


def claude_complete(system, user, model="haiku", log=None, tag="", timeout=300):
    cmd = ["claude", "-p", user, "--output-format", "json", "--no-session-persistence",
           "--setting-sources", "project", "--strict-mcp-config", "--tools", "",
           "--model", model, "--system-prompt", system]
    t0 = time.time()
    for attempt in range(3):
        p = subprocess.run(cmd, cwd=CWD, capture_output=True, text=True, timeout=timeout)
        try:
            r = json.loads(p.stdout)
        except Exception:
            r = {"is_error": True, "result": (p.stdout or "")[-500:] + (p.stderr or "")[-500:]}
        if not r.get("is_error"):
            break
        time.sleep(5)
    rec = {"tag": tag, "model": model, "s": round(time.time() - t0, 2), "system_chars": len(system),
           "user": user, "system": system, "reply": r.get("result", ""), "usage": r.get("usage", {}),
           "modelUsage": r.get("modelUsage", {}), "cost": r.get("total_cost_usd"), "is_error": r.get("is_error", False),
           "num_turns": r.get("num_turns")}
    if log:
        with open(log, "a") as f:
            f.write(json.dumps(rec) + "\n")
    if r.get("is_error"):
        raise RuntimeError("claude call failed: " + str(r.get("result"))[:300])
    return r.get("result", "") or ""


if __name__ == "__main__":
    print(claude_complete("You answer in one word.", "Say OK.", log=os.path.join(os.path.dirname(HERE), "test_claude.jsonl")))
