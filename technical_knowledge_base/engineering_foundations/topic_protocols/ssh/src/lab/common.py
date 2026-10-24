import subprocess, os, time, re, json, sys
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(S, "raw")
REPO_SRC = os.environ.get("PROTO_SRC") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../src")  # topic_protocols/src (private_patterns.py)
sys.path.insert(0, REPO_SRC)
import private_patterns
PRIV = re.compile(private_patterns.alternation())
def redact(t):
    t = t.replace(S, "$LAB").replace(os.path.realpath(S), "$LAB").replace(os.path.expanduser("~"), "~")
    home_parent = os.path.dirname(os.path.expanduser("~"))
    t = re.sub(re.escape(home_parent) + r"/[^/\s]+", "~", t)
    import socket
    for h in {socket.gethostname(), socket.gethostname().split(".")[0]}:
        if h: t = t.replace(h, "laptop")
    return PRIV.sub("[redacted]", t)
def run(cmd, timeout=60, env=None, cwd=None):
    e = dict(os.environ); e.update(env or {})
    t = time.perf_counter()
    p = subprocess.run(cmd, shell=True, cwd=cwd or S, env=e, capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout, p.stderr, (time.perf_counter() - t) * 1000
def save(name, text):
    os.makedirs(RAW, exist_ok=True)
    open(os.path.join(RAW, name), "w").write(redact(text))
def rec(name, cmd, timeout=60, env=None, note=""):
    rc, out, err, ms = run(cmd, timeout, env)
    save(name, f"# {note}\n$ {cmd}\n[exit {rc}, {ms:.0f} ms]\n--- stdout ---\n{out}--- stderr ---\n{err}")
    return rc, out, err, ms
SSH = "ssh -F laptop.conf"
