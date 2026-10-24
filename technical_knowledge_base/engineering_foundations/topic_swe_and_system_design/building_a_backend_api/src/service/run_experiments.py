"""Service-internals experiments for "Building a backend API" (about 70 seconds, loopback only).

Starts exp_app.py with uvicorn several times and records, into ../inputs/service_runs.json:
  styles    50 concurrent requests that each wait 500 ms, written as async+blocking, async+await, plain def,
            and async+blocking again with 4 worker processes (per-request send and receive times)
  trace     the order middleware, dependency and handler run in, and the ASGI scope the app receives
  bg        response time with follow-up work done inline against handed to BackgroundTasks
  shutdown  a slow request, an idle keep-alive connection and a background job in flight when SIGTERM
            arrives, with uvicorn's default and with --timeout-graceful-shutdown 1
  settings  pydantic-settings: which source wins, what a missing setting does, how a secret prints
Run from this folder:
  uv run --no-project --python 3.12 --with fastapi==0.162.0 --with uvicorn==0.54.0 \
     --with pydantic-settings==2.16.1 --with httpx==0.28.1 python run_experiments.py
"""
import asyncio, http.client, importlib.metadata as md, json, os, platform, signal, socket, statistics
import subprocess, sys, tempfile, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "inputs", "service_runs.json")
mono = time.monotonic


class Server:
    """uvicorn exp_app:app in a child process; server events (stdout JSON lines) and log lines (stderr) are kept."""

    def __init__(self, port, *extra, env=None):
        self.port, self.events, self.logs = port, [], []
        e = dict(os.environ, **(env or {}))
        self.p = subprocess.Popen([sys.executable, "-m", "uvicorn", "exp_app:app", "--port", str(port),
                                   "--log-level", "info", "--no-access-log", *extra],
                                  cwd=HERE, env=e, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        threading.Thread(target=self._read, args=(self.p.stdout, True), daemon=True).start()
        threading.Thread(target=self._read, args=(self.p.stderr, False), daemon=True).start()
        for _ in range(200):
            try:
                socket.create_connection(("127.0.0.1", port), 0.2).close()
                break
            except OSError:
                time.sleep(0.05)
        else:
            raise SystemExit("server did not start")
        time.sleep(0.3 if not extra else 1.5)   # workers need a moment to all be up

    def _read(self, f, is_ev):
        for line in f:
            t = mono()
            if is_ev:
                try:
                    self.events.append(json.loads(line))
                except ValueError:
                    pass
            else:
                self.logs.append({"t": round(t, 4), "log": line.strip()})

    def stop(self):
        if self.p.poll() is None:
            self.p.send_signal(signal.SIGTERM)
            self.p.wait(15)


def get(port, path, conn=None, timeout=10):
    """One GET; returns (status or error name, monotonic send time, monotonic end time)."""
    t0 = mono()
    try:
        c = conn or http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
        c.request("GET", path)
        r = c.getresponse()
        r.read()
        return r.status, t0, mono()
    except Exception as e:  # the error class is the result we record
        return type(e).__name__, t0, mono()


async def burst(port, path, n):
    import httpx
    lim = httpx.Limits(max_connections=n * 2, max_keepalive_connections=n * 2)
    async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{port}", limits=lim, timeout=60) as c:
        await asyncio.gather(*(c.get("/pid") for _ in range(n)))        # open and warm the connections
        async def one(i):
            t0 = mono()
            r = await c.get(path)
            return {"i": i, "status": r.status_code, "pid": r.json().get("pid"), "t0": t0, "t1": mono()}
        start = mono()
        rows = await asyncio.gather(*(one(i) for i in range(n)))
    pids = sorted({r["pid"] for r in rows})
    for r in rows:
        r["worker"] = pids.index(r.pop("pid")) + 1
        r["send_ms"] = round((r.pop("t0") - start) * 1000, 1)
        r["recv_ms"] = round((r.pop("t1") - start) * 1000, 1)
    return rows


def styles():
    out = {}
    for name, path, extra in [("async_blocking", "/block", ()), ("async_await", "/await", ()),
                              ("plain_def", "/thread", ()), ("async_blocking_4_workers", "/block", ("--workers", "4"))]:
        s = Server(8790, *extra)
        try:
            rows = asyncio.run(burst(8790, path, 50))
        finally:
            s.stop()
        lat = [r["recv_ms"] - r["send_ms"] for r in rows]
        out[name] = {"path": path, "workers": 4 if extra else 1, "n": 50, "wait_ms": 500,
                     "wall_ms": round(max(r["recv_ms"] for r in rows), 1),
                     "p50_ms": round(statistics.median(lat), 1), "max_ms": round(max(lat), 1),
                     "requests": sorted(rows, key=lambda r: r["recv_ms"])}
        time.sleep(0.5)
    return out


def trace_and_bg():
    s = Server(8791)
    try:
        t0 = mono()
        c = http.client.HTTPConnection("127.0.0.1", 8791, timeout=10)
        c.request("GET", "/trace", headers={"Authorization": "Bearer sk_test_alice"})
        body = json.loads(c.getresponse().read())
        t1 = mono()
        time.sleep(0.2)
        order = [e["ev"] for e in s.events if t0 <= e["t"] <= t1 + 0.1]
        # background work: client-observed response time, inline against BackgroundTasks (median of 7 each)
        res = {}
        for path in ["/inline", "/bg?seconds=0.5&name=bg"]:
            ms = []
            for _ in range(7):
                st, a, b = get(8791, path)
                ms.append((b - a) * 1000)
                time.sleep(0.6)
            res[path.split("?")[0]] = round(statistics.median(ms), 1)
        st, a, b = get(8791, "/bg?seconds=0.5&name=timed")
        time.sleep(0.8)
        done = [e["t"] for e in s.events if e["ev"] == "timed: background work done"]
        res["bg_done_after_response_ms"] = round((done[0] - b) * 1000, 1) if done else None
    finally:
        s.stop()
    scope = body["scope"]
    return {"order": order, "scope": scope, "user": body["user"]}, res


def shutdown(timeout_graceful):
    extra = ("--timeout-graceful-shutdown", str(timeout_graceful)) if timeout_graceful else ()
    s = Server(8792, *extra)
    T = mono()
    res, th = {}, []

    def at(delay, name, fn):
        def run():
            time.sleep(max(0, T + delay - mono()))
            res[name] = fn()
        t = threading.Thread(target=run)
        t.start()
        th.append(t)

    keep = http.client.HTTPConnection("127.0.0.1", 8792, timeout=10)
    at(0.1, "keepalive_first", lambda: get(8792, "/pid", conn=keep))
    at(0.2, "slow_request", lambda: get(8792, "/slow?seconds=3"))
    at(0.3, "bg_job", lambda: get(8792, "/bg?seconds=3&name=job"))
    time.sleep(max(0, T + 1.0 - mono()))
    sig_t = mono()
    s.p.send_signal(signal.SIGTERM)
    at(1.3, "new_connection_after_sigterm", lambda: get(8792, "/pid"))
    at(1.4, "keepalive_after_sigterm", lambda: get(8792, "/pid", conn=keep))
    s.p.wait(20)
    exit_t = mono()
    for t in th:
        t.join()
    rel = lambda x: round((x - T) * 1000)
    clients = {k: {"result": v[0], "sent_ms": rel(v[1]), "done_ms": rel(v[2])} for k, v in res.items()}
    server = [{"ms": rel(e["t"]), "ev": e["ev"]} for e in s.events]
    logs = [{"ms": rel(l["t"]), "log": l["log"]} for l in s.logs if "Started server process" not in l["log"]
            and "Uvicorn running" not in l["log"] and "Finished server process" not in l["log"]]
    return {"timeout_graceful_shutdown": timeout_graceful, "sigterm_ms": rel(sig_t), "exit_ms": rel(exit_t),
            "returncode": s.p.returncode, "clients": clients, "server_events": server, "uvicorn_log": logs}


def settings():
    from pydantic import SecretStr, ValidationError
    from pydantic_settings import BaseSettings, SettingsConfigDict
    out = {"layers": []}
    with tempfile.TemporaryDirectory() as d:
        envf, secd = os.path.join(d, ".env"), os.path.join(d, "secrets")
        os.mkdir(secd)

        class Settings(BaseSettings):
            model_config = SettingsConfigDict(env_prefix="CHAT_", env_file=envf, secrets_dir=secd)
            model_name: str = "small"
            database_url: str = "sqlite://"
            provider_key: SecretStr = SecretStr("unset")

        for k in list(os.environ):
            if k.startswith("CHAT_"):
                del os.environ[k]
        out["layers"].append({"added": "default in the class", "model_name": Settings().model_name})
        open(os.path.join(secd, "chat_model_name"), "w").write("from-secrets-dir")
        out["layers"].append({"added": "file in secrets_dir", "model_name": Settings().model_name})
        open(envf, "w").write("CHAT_MODEL_NAME=from-dotenv\n")
        out["layers"].append({"added": ".env file", "model_name": Settings().model_name})
        os.environ["CHAT_MODEL_NAME"] = "from-environment"
        out["layers"].append({"added": "environment variable", "model_name": Settings().model_name})
        out["layers"].append({"added": "argument in code", "model_name": Settings(model_name="from-init").model_name})
        del os.environ["CHAT_MODEL_NAME"]
        os.environ["CHAT_PROVIDER_KEY"] = "sk-live-123"
        sset = Settings()
        out["secret_repr"] = repr(sset.provider_key)
        out["settings_repr"] = repr(sset)
        out["secret_value_call"] = "provider_key.get_secret_value()"
        del os.environ["CHAT_PROVIDER_KEY"]

        class Required(BaseSettings):
            model_config = SettingsConfigDict(env_prefix="CHAT_")
            database_url: str

        try:
            Required()
        except ValidationError as e:
            out["missing_error"] = str(e).splitlines()[:3]
    return out


if __name__ == "__main__":
    t = time.time()
    data = {"meta": {"date": time.strftime("%Y-%m-%d"), "machine": "Apple M1 Pro laptop, loopback",
                     "python": platform.python_version(),
                     **{p: md.version(p) for p in ["fastapi", "uvicorn", "starlette", "anyio", "pydantic",
                                                   "pydantic-settings", "httpx"]}}}
    data["styles"] = styles()
    data["trace"], data["bg"] = trace_and_bg()
    data["shutdown"] = [shutdown(None), shutdown(1)]
    data["settings"] = settings()
    json.dump(data, open(OUT, "w"), indent=1)
    print(f"wrote {OUT} in {time.time() - t:.0f} s")
    for k, v in data["styles"].items():
        print(k, v["wall_ms"], v["p50_ms"], v["max_ms"])
