"""Stand-in server command that records the stdio transport byte for byte: python tee_stdio.py LOG -- CMD...
Copies the client's writes to the server's stdin and the server's stdout back, appending both to LOG as JSON lines."""
import json, subprocess, sys, threading
log, cmd = sys.argv[1], sys.argv[sys.argv.index("--") + 1:]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
lock = threading.Lock()

def rec(d, line):
    with lock, open(log, "a") as f:
        f.write(json.dumps({"dir": d, "line": line.decode(errors="replace")}) + "\n")

def up():
    for line in sys.stdin.buffer:
        rec("client->server", line); p.stdin.write(line); p.stdin.flush()
    p.stdin.close()

threading.Thread(target=up, daemon=True).start()
for line in p.stdout:
    rec("server->client", line); sys.stdout.buffer.write(line); sys.stdout.buffer.flush()
