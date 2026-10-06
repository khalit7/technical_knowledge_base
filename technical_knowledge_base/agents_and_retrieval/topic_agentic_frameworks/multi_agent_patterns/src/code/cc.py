"""Shared helper: one `claude -p` run recorded as stream-json, with the flags every run here uses.
Raw output goes to fmulti/raw/<run>/<label>.jsonl (scratchpad only; redacted copies go to the repo)."""
import json, os, subprocess, time, threading

HERE = os.path.dirname(os.path.abspath(__file__))
FM = os.path.dirname(HERE)
RAW = os.path.join(FM, "raw")
NOEM = "Never use the em-dash character."
_lock = threading.Lock()


def log(msg):
    with _lock:
        with open(os.path.join(FM, "runs.log"), "a") as f:
            f.write(time.strftime("%H:%M:%S ") + msg + "\n")


def claude(run, label, prompt, cwd, model="haiku", tools=None, system=None, append=None, agents=None,
           allowed=None, extra=None, env=None, timeout=3600):
    os.makedirs(os.path.join(RAW, run), exist_ok=True)
    if prompt.startswith("-"):
        prompt = "Task:\n" + prompt
    cmd = ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose", "--no-session-persistence",
           "--setting-sources", "project", "--strict-mcp-config", "--model", model]
    if tools is not None:
        cmd += ["--tools", tools]
    if system is not None:
        cmd += ["--system-prompt", system + " " + NOEM]
        if append:
            cmd += ["--append-system-prompt", append]
    else:
        cmd += ["--append-system-prompt", ((append + " ") if append else "") + NOEM]
    if agents is not None:
        cmd += ["--agents", json.dumps(agents), "--forward-subagent-text"]
    if allowed:
        cmd += ["--allowedTools", allowed]
    if extra:
        cmd += extra
    e = dict(os.environ)
    if env:
        e.update(env)
    log(f"start {run}/{label}")
    t0 = time.time()
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=e)
    wall = time.time() - t0
    path = os.path.join(RAW, run, label + ".jsonl")
    with open(path, "w") as f:
        f.write(p.stdout)
    if p.stderr.strip():
        with open(os.path.join(RAW, run, label + ".stderr.txt"), "w") as f:
            f.write(p.stderr)
    res = None
    for line in p.stdout.splitlines():
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get("type") == "result":
            res = r
    log(f"end {run}/{label} wall {wall:.1f}s cost {res and res.get('total_cost_usd')} err {res and res.get('is_error')}")
    return dict(wall=round(wall, 3), t0=t0, result=res, path=path)


def final_json_array(text):
    """Last JSON array in a reply."""
    if not text:
        return None
    j = text.rfind("]")
    while j >= 0:
        i = text.rfind("[", 0, j)
        while i >= 0:
            try:
                v = json.loads(text[i:j + 1])
                if isinstance(v, list):
                    return v
            except Exception:
                pass
            i = text.rfind("[", 0, i)
        j = text.rfind("]", 0, j)
    return None
