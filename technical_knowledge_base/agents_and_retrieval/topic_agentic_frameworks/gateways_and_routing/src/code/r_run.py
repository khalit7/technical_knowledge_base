"""Answer every router task with one model. Usage: python r_run.py local|haiku TASKS OUT [RAWDIR]
local: the shared mlx_lm.server (Qwen3-4B-Instruct-2507-4bit), temperature 0, max_tokens 512, one locked request at a time.
haiku: claude -p with no tools and a replaced system prompt (Claude Haiku 4.5 on the subscription), one call per task.
Every answer is graded by exact match of the last 'ANSWER:' line against the stored answer."""
import json, os, re, subprocess, sys, time

SYS = ("Answer the user's question. You may think briefly first. Finish with a final line of the form "
       "'ANSWER: <answer>' and nothing after it. Never use the em-dash character.")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..")))  # scratchpad/agents for mlx_call


def norm(s):
    s = s.strip().strip("`*'\". ").lower()
    return re.sub(r"\s+", " ", s)


def grade(text, gold):
    m = re.findall(r"ANSWER:\s*(.+)", text or "")
    got = norm(m[-1]) if m else None
    return got, (got == norm(gold))


def run_local(t):
    from mlx_call import chat
    t0 = time.time()
    r = chat({"model": "mlx-community/Qwen3-4B-Instruct-2507-4bit", "temperature": 0, "max_tokens": 512,
              "messages": [{"role": "system", "content": SYS}, {"role": "user", "content": t["q"]}]})
    return {"text": r["choices"][0]["message"]["content"], "usage": r.get("usage"), "seconds": round(time.time() - t0, 2)}


def run_haiku(t, rawdir):
    wd = os.path.join(HERE, "..", "cl_run")
    os.makedirs(wd, exist_ok=True)
    cmd = ["claude", "-p", t["q"], "--output-format", "stream-json", "--verbose", "--no-session-persistence",
           "--setting-sources", "project", "--strict-mcp-config", "--model", "haiku", "--tools", "",
           "--system-prompt", SYS, "--max-turns", "1"]
    t0 = time.time()
    p = subprocess.run(cmd, cwd=wd, capture_output=True, text=True, timeout=300)
    raw = p.stdout
    open(os.path.join(rawdir, t["id"] + ".jsonl"), "w").write(raw)
    res = [json.loads(l) for l in raw.splitlines() if l.startswith("{") and '"type":"result"' in l.replace(" ", "")]
    r = res[-1] if res else {}
    return {"text": r.get("result"), "usage": r.get("usage"), "cost_usd": r.get("total_cost_usd"),
            "model_usage": r.get("modelUsage"), "seconds": round(time.time() - t0, 2), "is_error": r.get("is_error")}


if __name__ == "__main__":
    who, tasks, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    rawdir = sys.argv[4] if len(sys.argv) > 4 else None
    if rawdir:
        os.makedirs(rawdir, exist_ok=True)
    done = json.load(open(out)) if os.path.exists(out) else {}
    for t in tasks:
        if t["id"] in done:
            continue
        if os.path.exists(os.path.join(HERE, "..", "STOP")):
            break
        r = run_local(t) if who == "local" else run_haiku(t, rawdir)
        r["got"], r["correct"] = grade(r["text"], t["a"])
        done[t["id"]] = r
        json.dump(done, open(out, "w"), indent=1)
        print(t["id"], t["family"], r["correct"], r["got"], r["seconds"], flush=True)
