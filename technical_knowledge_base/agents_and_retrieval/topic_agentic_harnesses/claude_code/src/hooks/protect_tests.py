# PreToolUse hook for Edit|Write: refuse any change under tests/, answering in JSON instead of an exit code.
import json, sys
d = json.load(sys.stdin)
p = d.get("tool_input", {}).get("file_path", "")
if "/tests/" in p.replace("\\", "/") or p.startswith("tests/"):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
        "permissionDecisionReason": "The tests are the specification: fix the code, not the tests."}}))
sys.exit(0)
