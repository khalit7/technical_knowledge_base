# PostToolUse hook for every tool: append one JSON line per tool call to .claude/hook_log.jsonl.
import json, os, sys, time
d = json.load(sys.stdin)
inp = d.get("tool_input", {})
resp = d.get("tool_response")
row = {"t": round(time.time(), 2), "event": d.get("hook_event_name"), "tool": d.get("tool_name"),
       "input": {k: (v if len(str(v)) < 120 else str(v)[:120] + "...") for k, v in inp.items()},
       "response_chars": len(json.dumps(resp)) if resp is not None else 0, "stdin_keys": sorted(d.keys())}
with open(os.path.join(os.environ.get("CLAUDE_PROJECT_DIR", "."), ".claude", "hook_log.jsonl"), "a") as f:
    f.write(json.dumps(row) + "\n")
