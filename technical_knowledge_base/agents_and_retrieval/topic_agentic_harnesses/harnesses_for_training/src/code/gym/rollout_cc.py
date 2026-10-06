"""One rollout of Claude Code itself (its own prompt and six built-in tools) on a task, via claude -p.
Commands run on the host in the workspace (Claude Code's own Bash), the verifier in a container.
Usage: rollout_cc.py TASK ROLLOUT_ID OUT_DIR [model alias]"""
import json, os, subprocess, sys, time
from tasks import make_workspace
from verify import reward

task, rid, out_dir = sys.argv[1:4]
model = sys.argv[4] if len(sys.argv) > 4 else "haiku"
name = f"cc-{model}_ccfull_{task}_{rid}"
ws = os.path.join(out_dir, "ws", name)
prompt = make_workspace(task, ws)
cmd = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose", "--no-session-persistence",
       "--setting-sources", "project", "--strict-mcp-config", "--model", model,
       "--tools", "Read,Edit,Write,Bash,Grep,Glob", "--permission-mode", "acceptEdits",
       "--allowedTools", "Bash(python3:*)", "Bash(python:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(grep:*)",
       "--append-system-prompt", "Never use the em-dash character.", "--max-turns", "30"]
t0 = time.time()
p = subprocess.run(cmd, cwd=ws, capture_output=True, text=True, timeout=900, stdin=subprocess.DEVNULL)
path = os.path.join(out_dir, name + ".jsonl")
with open(path, "w") as f:
    f.write(json.dumps({"type": "htrain_meta", "harness": "ccfull", "task": task, "rollout": rid, "model_alias": model,
                        "prompt": prompt, "argv": cmd[3:]}) + "\n")
    f.write(p.stdout)
    rw = reward(task, ws)
    f.write(json.dumps({"type": "htrain_end", "wall_s": round(time.time() - t0, 1), "reward": rw, "stderr": p.stderr[-2000:]}) + "\n")
res = [json.loads(l) for l in p.stdout.splitlines() if l.startswith('{"type":"result"')]
print(name, "reward", rw.get("binary"), rw.get("partial"), "cost", res and res[-1].get("total_cost_usd"))
