"""stdin to stdout: replace [[key]] with the measured value from numbers.json; stop on an unknown key."""
import json, re, sys, os
N = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "numbers.json")))
def fmt(v):
    return f"{v:,}" if isinstance(v, int) and abs(v) >= 10000 else str(v)
t = sys.stdin.read()
bad = sorted({k for k in re.findall(r"\[\[([a-z0-9_]+)\]\]", t) if k not in N})
if bad: sys.stderr.write("unknown number keys: " + ", ".join(bad) + "\n"); sys.exit(1)
sys.stdout.write(re.sub(r"\[\[([a-z0-9_]+)\]\]", lambda m: fmt(N[m.group(1)]), t))
