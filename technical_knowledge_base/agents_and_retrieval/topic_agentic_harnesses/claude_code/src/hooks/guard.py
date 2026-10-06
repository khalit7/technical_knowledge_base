# PreToolUse hook for Bash: block rm and in-place sed, whatever the permission rules say.
import json, re, sys
d = json.load(sys.stdin)
cmd = d.get("tool_input", {}).get("command", "")
if re.search(r"(^|[;&|]\s*)rm\s|sed\s+-i", cmd):
    sys.stderr.write("Blocked by the project's guard hook: deleting files and in-place sed are not allowed here. Leave the file in place and say so in your summary.")
    sys.exit(2)
sys.exit(0)
