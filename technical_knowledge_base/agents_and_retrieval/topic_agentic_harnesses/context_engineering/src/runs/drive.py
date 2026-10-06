#!/usr/bin/env python3
"""Drive one multi-turn Claude Code session through --input-format stream-json.
Usage: drive.py CWD OUT.jsonl MSGS.json [extra claude args...]
MSGS.json is a list of user messages (strings). Each is sent after the previous turn's result record.
Env vars of this process pass through (for CLAUDE_CODE_* settings)."""
import json, subprocess, sys, time

cwd, out, msgs_path, extra = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
msgs = json.load(open(msgs_path))
cmd = ["claude", "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
       "--no-session-persistence", "--setting-sources", "project", "--strict-mcp-config",
       "--append-system-prompt", "Never use the em-dash character."] + extra
p = subprocess.Popen(cmd, cwd=cwd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=open(out + ".err", "w"), text=True, bufsize=1)
f = open(out, "w")
def send(t):
    f.write(json.dumps({"type": "driver", "sent": t, "t": time.time()}) + "\n"); f.flush()
    p.stdin.write(json.dumps({"type": "user", "message": {"role": "user", "content": t}}) + "\n"); p.stdin.flush()
i = 0
send(msgs[0]); i = 1
for line in p.stdout:
    f.write(line); f.flush()
    try:
        d = json.loads(line)
    except Exception:
        continue
    if d.get("type") == "result":
        if i < len(msgs):
            send(msgs[i]); i += 1
        else:
            p.stdin.close()
p.wait()
f.close()
print("rc", p.returncode, "turns sent", i)
