#!/usr/bin/env python3
"""Stand-in for the Claude Code CLI: starts the real CLI (REAL_CLI) and copies every stdin and
stdout line to WIRE_LOG as JSON {t, dir, line}, plus the argv. Recording only."""
import json, os, subprocess, sys, threading, time
real = os.environ["REAL_CLI"]; log = os.environ.get("WIRE_LOG")
args = sys.argv[1:]
if not log or args[:1] in (["-v"], ["--version"]):
    os.execv(real, [real] + args)
t0 = time.time(); lock = threading.Lock(); f = open(log, "a")
def w(d, line):
    with lock:
        f.write(json.dumps({"t": round(time.time() - t0, 3), "dir": d, "line": line}) + "\n"); f.flush()
w("argv", json.dumps(args))
p = subprocess.Popen([real] + args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, bufsize=0)
def pump_in():
    for line in sys.stdin.buffer:
        w("in", line.decode("utf-8", "replace").rstrip("\n"))
        try: p.stdin.write(line); p.stdin.flush()
        except BrokenPipeError: break
    try: p.stdin.close()
    except Exception: pass
threading.Thread(target=pump_in, daemon=True).start()
for line in p.stdout:
    w("out", line.decode("utf-8", "replace").rstrip("\n"))
    sys.stdout.buffer.write(line); sys.stdout.buffer.flush()
sys.exit(p.wait())
