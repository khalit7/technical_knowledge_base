"""Failure lab helpers: start local servers, run a command exactly as shown, record its output.

Every recorded command is run through /bin/sh -c with the same text that the page shows; the
variables it uses ($CA, $PY, $CL, ...) are set in the environment, so what the page prints is
what ran. Output (stdout and stderr merged) is saved verbatim, after redaction, to out/<case>.json.
"""
import json, os, re, signal, socket, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
WORK = os.environ.get("FAIL_WORK") or sys.exit("set FAIL_WORK (scratch dir made by run_all.sh)")
PY = os.path.join(WORK, ".venv", "bin", "python")
CONDA = os.path.join(WORK, "mm", "ngx")    # conda-forge env: OpenSSL 3.6 command line tool
NGX = os.path.join(WORK, "ngxb")           # nginx 1.31.6 built from source with the poll event module
WIRE = os.path.normpath(os.path.join(HERE, "..", "wire"))
PKI = os.path.join(WORK, "pki")

# Variables available to every recorded command (shown on the page as $NAME).
ENV = dict(os.environ)
ENV.update({
    "PY": PY,                                   # the lab's Python 3.13 venv
    "CL": os.path.join(HERE, "clients"),        # client scripts (requests, httpx, node fetch, grpc)
    "CA": os.path.join(PKI, "ca.pem"),          # Wire Lab Root CA (make_ca.sh from the On the wire tab)
    "PKI": PKI,
    "WORK": WORK,
    "OPENSSL": os.path.join(CONDA, "bin", "openssl"),
    "NGINX_BIN": os.path.join(NGX, "sbin", "nginx"),
    "LANG": "C", "LC_ALL": "C", "PYTHONDONTWRITEBYTECODE": "1",
})
ENV.pop("NODE_OPTIONS", None)

_SECRET = re.compile(r"(glpat-[A-Za-z0-9_\-]+|sk-ant-[A-Za-z0-9_\-]+|Bearer\s+(?!<)[A-Za-z0-9._\-]{8,})")


def redact(s):
    s = s.replace(WORK, "$WORK").replace(HERE, "$LAB").replace(os.path.expanduser("~"), "~")
    s = re.sub(r"\b2[0-9a-f]{3}(:[0-9a-f]{0,4}){3,7}\b", "<ipv6 redacted>", s)
    s = re.sub(r"\b192\.168\.\d+\.\d+\b", "<LAN address redacted>", s)
    # names that identify this machine's network or its management software: given at run time in
    # FAIL_REDACT ("text=replacement;text=replacement"), never written into the repository
    for pair in filter(None, os.environ.get("FAIL_REDACT", "").split(";")):
        k, _, v = pair.partition("=")
        s = re.sub(k, v, s)
    # lab tokens are signed by the lab's throwaway key; we still shorten any bearer value
    return _SECRET.sub(lambda m: (m.group(0)[:13] + "...<redacted>") if m.group(0).startswith("Bearer") else "<redacted>", s)


def port_free(p):
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)  # TIME_WAIT is not "busy"
    try:
        s.bind(("127.0.0.1", p)); return True
    except OSError:
        return False
    finally:
        s.close()


def wait_port(p, timeout=15):
    t = time.time()
    while time.time() - t < timeout:
        try:
            socket.create_connection(("127.0.0.1", p), 0.3).close(); return True
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"port {p} never opened")


PROCS = []


def start(cmd, env=None, cwd=None, log=None, port=None):
    if port is not None and not port_free(port):
        raise RuntimeError(f"port {port} busy")
    e = dict(ENV); e.update(env or {})
    f = open(os.path.join(WORK, log or "proc.log"), "a")
    p = subprocess.Popen(cmd, env=e, cwd=cwd or HERE, stdout=f, stderr=subprocess.STDOUT, start_new_session=True)
    PROCS.append(p)
    if port is not None:
        wait_port(port)
    return p


def stop(p):
    try:
        os.killpg(p.pid, signal.SIGTERM); p.wait(5)
    except Exception:
        try: os.killpg(p.pid, signal.SIGKILL)
        except Exception: pass


def stop_all():
    while PROCS:
        stop(PROCS.pop())


def run(cmd, env=None, timeout=60, note=None):
    """Run cmd through sh -c, exactly as written. Returns a record for the page."""
    e = dict(ENV); e.update(env or {})
    t = time.perf_counter()
    r = subprocess.run(["/bin/sh", "-c", cmd], env=e, cwd=HERE, capture_output=True, timeout=timeout)
    ms = (time.perf_counter() - t) * 1000
    out = (r.stdout + r.stderr).decode("utf-8", "replace")
    rec = {"cmd": cmd, "out": redact(out.rstrip("\n")), "rc": r.returncode, "ms": round(ms)}
    if note:
        rec["note"] = note
    print(f"--- {cmd}\n{rec['out']}\n(rc={r.returncode}, {ms:.0f} ms)", flush=True)
    return rec


def save(case, recs, **extra):
    os.makedirs(OUT, exist_ok=True)
    d = {"case": case, "recorded": time.strftime("%Y-%m-%d %H:%M %Z"), "runs": recs}
    d.update(extra)
    with open(os.path.join(OUT, case + ".json"), "w") as f:
        json.dump(d, f, indent=1, ensure_ascii=False)


def wire_server(plain_port, tls_port, **env):
    """The On the wire tab's LLM stand-in (src/wire/llm_server.py), on our own ports."""
    e = {"TLS_PORT": str(tls_port), "PLAIN_PORT": str(plain_port)}
    e.update({k: str(v) for k, v in env.items()})
    return start(["sh", os.path.join(WIRE, "serve.sh"), PY, PKI], env=e, log=f"wire_{plain_port}.log", port=plain_port)
