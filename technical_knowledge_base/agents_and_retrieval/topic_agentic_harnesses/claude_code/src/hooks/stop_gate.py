# Stop hook: do not let the agent finish while the tests fail (once; stop_hook_active prevents a loop).
import json, os, subprocess, sys
d = json.load(sys.stdin)
if d.get("stop_hook_active"):
    sys.exit(0)
r = subprocess.run([sys.executable, "tests/test_core.py"], capture_output=True, text=True,
                   cwd=os.environ.get("CLAUDE_PROJECT_DIR", "."))
if r.returncode != 0:
    fails = [l for l in r.stdout.splitlines() if l.startswith("FAIL")]
    print(json.dumps({"decision": "block", "reason": "Stop hook: the test suite still fails, so the task is not done. " + " | ".join(fails)}))
sys.exit(0)
