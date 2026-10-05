"""Measured comparison: the axum service (tokserve) against the same service in FastAPI.

Same machine, same load generator (oha), same request bodies, short bursts repeated in rounds
(the laptop is shared, so every run records the load average and we report median and spread).

Experiment A (closed loop, max throughput): oha keeps C connections busy for D seconds.
Experiment O (open loop, fixed rate, latency corrected for coordinated omission).
Experiment B (blocking the runtime): tokserve with 2 workers, CPU-heavy /count_log load,
   and /health latency measured at a fixed rate alongside, with counting inline vs spawn_blocking.

Usage: python3 bench.py OUT.json [rounds]
Env: TOKSERVE, UVICORN, OHA (paths), DATA (chat.jsonl). Run from src/rs/bench/.
"""
import json, os, signal, subprocess, sys, time, socket, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
TOKSERVE, UVICORN, OHA, DATA = (os.environ[k] for k in ("TOKSERVE", "UVICORN", "OHA", "DATA"))
PYAPP = os.path.join(HERE, "..", "code", "py")
BODY = os.path.join(HERE, "inputs", "count_body.json")
OUT = sys.argv[1]
ROUNDS = int(sys.argv[2]) if len(sys.argv) > 2 else 3
DUR = "3s"
BIG = os.environ.get("DATA_BIG", DATA)  # experiment B's body: 20,000 lines (same generator, seed 7)


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


def wait_up(port, t=15):
    end = time.time() + t
    while time.time() < end:
        try:
            socket.create_connection(("127.0.0.1", port), 0.2).close(); return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("server did not start")


def start(cfg, port, extra=()):
    kind, workers = cfg.split("-")
    if kind == "axum":
        cmd = [TOKSERVE, "--addr", f"127.0.0.1:{port}", "--workers", workers, *extra]
        env = dict(os.environ, RUST_LOG="warn")
        p = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        cmd = [UVICORN, "app:app", "--port", str(port), "--workers", workers, "--log-level", "warning", "--no-access-log"]
        p = subprocess.Popen(cmd, cwd=PYAPP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    wait_up(port)
    time.sleep(1.0 if kind == "fastapi" else 0.2)  # let uvicorn's workers finish importing
    return p


def tree_rss_mb(pid):
    """Resident memory of the process and its children (uvicorn workers), in MB."""
    pids = [str(pid)]
    try:
        kids = subprocess.run(["pgrep", "-P", str(pid)], capture_output=True, text=True).stdout.split()
        pids += kids
        rss = subprocess.run(["ps", "-o", "rss=", "-p", ",".join(pids)], capture_output=True, text=True).stdout.split()
        return sum(int(x) for x in rss) / 1024, len(pids)
    except Exception:
        return float("nan"), 0


def oha(port, path, args):
    cmd = [OHA, "--no-tui", "--output-format", "json", "--worker-threads", "2", *args, f"http://127.0.0.1:{port}{path}"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    j = json.loads(r.stdout)
    s, p = j["summary"], j["latencyPercentiles"]
    codes = j.get("statusCodeDistribution", {})
    return {"rps": s["requestsPerSec"], "p50_ms": p["p50"] * 1000, "p90_ms": p["p90"] * 1000,
            "p99_ms": p["p99"] * 1000, "p999_ms": p.get("p99.9", float("nan")) * 1000,
            "ok_frac": s["successRate"], "codes": codes, "load1": os.getloadavg()[0]}


LOADS = {
    "health": ("/health", ["-c", "32", "-z", DUR]),
    "count": ("/count", ["-c", "32", "-z", DUR, "-m", "POST", "-T", "application/json", "-D", BODY]),
    "count_log": ("/count_log", ["-c", "8", "-z", DUR, "-m", "POST", "-D", DATA]),
}
OPEN = {  # fixed arrival rates every configuration sustains; latency measured from the scheduled send time
    "count@1000/s": ("/count", ["-q", "1000", "-c", "64", "-z", DUR, "--latency-correction", "-m", "POST", "-T", "application/json", "-D", BODY]),
    "count_log@20/s": ("/count_log", ["-q", "20", "-c", "16", "-z", DUR, "--latency-correction", "-m", "POST", "-D", DATA]),
}
CFGS = ["axum-1", "axum-4", "fastapi-1", "fastapi-4"]


def sample_rss(proc, stop_after, peak):
    """Poll RSS while oha runs in the foreground of another thread."""
    import threading
    def run():
        while not stop_after.is_set():
            m, n = tree_rss_mb(proc.pid); peak[0] = max(peak[0], m); peak[1] = n
            time.sleep(0.25)
    t = threading.Thread(target=run, daemon=True); t.start(); return t


def experiment_a(results):
    import threading
    for rnd in range(ROUNDS):
        order = CFGS if rnd % 2 == 0 else CFGS[::-1]   # alternate order between rounds
        for cfg in order:
            port = free_port(); proc = start(cfg, port)
            try:
                idle, nproc = tree_rss_mb(proc.pid)
                for name, (path, args) in LOADS.items():  # warm-up: 1 s of each load
                    oha(port, path, [a if a != DUR else "1s" for a in args])
                for name, (path, args) in {**LOADS, **OPEN}.items():
                    stop, peak = threading.Event(), [0.0, 0]
                    th = sample_rss(proc, stop, peak)
                    r = oha(port, path, args)
                    stop.set(); th.join()
                    r.update(cfg=cfg, load=name, round=rnd, idle_rss_mb=idle, peak_rss_mb=peak[0], processes=nproc)
                    results.append(r)
                    print(f"r{rnd} {cfg:10} {name:15} {r['rps']:9.0f} rps  p50 {r['p50_ms']:7.2f}  p99 {r['p99_ms']:8.2f} ms"
                          f"  rss {peak[0]:6.1f} MB  load {r['load1']:.1f}", flush=True)
            finally:
                if cfg.startswith("fastapi"):
                    os.killpg(proc.pid, signal.SIGTERM)
                else:
                    proc.send_signal(signal.SIGTERM)
                proc.wait(10)


def experiment_b(results):
    """2 async workers; 6 connections hammer /count_log with a 3.9 MB body; /health probed at 100/s open loop."""
    for rnd in range(ROUNDS):
        for mode in (["--inline"], []):
            port = free_port(); proc = start("axum-2", port, mode + ["--max-body", str(64 << 20)])
            try:
                bg = subprocess.Popen([OHA, "--no-tui", "--output-format", "json", "--worker-threads", "1", "-c", "6", "-z", "4s", "-m", "POST", "-D", BIG,
                                       f"http://127.0.0.1:{port}/count_log"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
                time.sleep(0.5)
                r = oha(port, "/health", ["-q", "100", "-c", "16", "-z", "3s", "--latency-correction"])
                bj = json.loads(bg.communicate()[0])
                r["bg_rps"] = bj["summary"]["requestsPerSec"]; r["bg_codes"] = bj.get("statusCodeDistribution", {})
                r["bg_p50_ms"] = bj["latencyPercentiles"]["p50"] * 1000
                r.update(cfg="axum-2", load="health_under_count_log", mode="inline" if mode else "spawn_blocking", round=rnd)
                results.append(r)
                print(f"r{rnd} B {r['mode']:15} bg {r['bg_rps']:.0f} rps {r['bg_codes']} /health p50 {r['p50_ms']:7.2f}  p99 {r['p99_ms']:8.2f}  p99.9 {r['p999_ms']:8.2f} ms  load {r['load1']:.1f}", flush=True)
            finally:
                proc.send_signal(signal.SIGTERM); proc.wait(10)


def summarize(results):
    groups = {}
    for r in results:
        k = (r["cfg"], r["load"], r.get("mode", ""))
        groups.setdefault(k, []).append(r)
    out = []
    for (cfg, load, mode), rs in groups.items():
        def med(f): return statistics.median(x[f] for x in rs)
        def rng(f): return [min(x[f] for x in rs), max(x[f] for x in rs)]
        row = {"cfg": cfg, "load": load, "mode": mode, "n": len(rs)}
        for f in ("rps", "p50_ms", "p99_ms", "p999_ms", "load1"):
            row[f] = med(f); row[f + "_range"] = rng(f)
        if "peak_rss_mb" in rs[0]:
            row["peak_rss_mb"] = med("peak_rss_mb"); row["idle_rss_mb"] = med("idle_rss_mb"); row["processes"] = rs[0]["processes"]
        row["ok_frac_min"] = min(x["ok_frac"] for x in rs)
        out.append(row)
    return out


if __name__ == "__main__":
    which = os.environ.get("EXPERIMENTS", "AB")
    res = []
    t0 = time.time()
    env = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "load_before": os.getloadavg(), "rounds": ROUNDS, "duration": DUR}
    if "A" in which:
        experiment_a(res)
    if "B" in which:
        experiment_b(res)
    env.update(load_after=os.getloadavg(), seconds=round(time.time() - t0))
    json.dump({"env": env, "runs": res, "summary": summarize(res)}, open(OUT, "w"), indent=1)
    print("wrote", OUT, "in", env["seconds"], "s")
