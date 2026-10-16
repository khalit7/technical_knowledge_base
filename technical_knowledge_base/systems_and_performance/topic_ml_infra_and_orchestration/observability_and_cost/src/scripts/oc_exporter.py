"""A tiny Prometheus exporter for the topic's local clusters (Observability and cost child page, prefix oc).

What it exposes on 127.0.0.1:<port>/metrics, in the Prometheus text format:
  - the running example's own progress, read from its per-rank JSON logs (the training job's view):
      oc_train_step, oc_train_last_step_timestamp_seconds, oc_train_start_timestamp_seconds, oc_train_gloss,
      oc_train_tokens_total, oc_train_ended, oc_train_ckpt_seconds (last write), oc_train_ckpt_total
  - Kueue's ClusterQueue usage and quota, read from the object's status (the gauge Kueue can export itself,
      kueue_cluster_queue_resource_usage, is behind enableClusterQueueResources, off in the default config):
      oc_kueue_usage, oc_kueue_quota, oc_kueue_workloads{state}
  - Slurm's view (Slurm 24.11 has no metrics endpoint): parsed from squeue and scontrol, like the community
      exporters do: oc_slurm_gres_gpu{state}, oc_slurm_cpus{state}, oc_slurm_jobs{state}, oc_slurm_pending{reason},
      oc_slurm_node_up, and each node container's cgroup CPU: oc_node_cpu_seconds_total
  - its own cost: oc_exporter_poll_seconds{source}

Sources are polled in a background thread (every POLL seconds), so a scrape only formats the cache.
Run (host, stdlib only): OC_SOURCES=k8s,slurm OC_K8S_LOGS=<host folder>/logs KUBECTL="sh <k.sh>" python3 oc_exporter.py 19811
"""
import json, os, re, subprocess, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 19811
POLL = float(os.environ.get("OC_POLL", "2"))
SOURCES = set(os.environ.get("OC_SOURCES", "k8s,slurm").split(","))
K8S_LOGS = os.environ.get("OC_K8S_LOGS", "")
KUBECTL = os.environ.get("KUBECTL", "kubectl").split()
SLURM_CTL = os.environ.get("OC_SLURM_CTL", "mi-slurm-ctl")
SLURM_NODES = os.environ.get("OC_SLURM_NODES", "mi-slurm-c1,mi-slurm-c2,mi-slurm-c3").split(",")
RUN_PREFIX = os.environ.get("OC_RUN_PREFIX", "oc-")
TOKENS_PER_STEP = 32 * 64            # the running example's global batch x context

cache = {"lines": [], "t": 0}
lock = threading.Lock()


def sh(args, timeout=10):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout).stdout
    except Exception:
        return ""


def esc(v):
    return str(v).replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def fmt(name, labels, value):
    lab = ",".join(f'{k}="{esc(v)}"' for k, v in labels.items())
    return f"{name}{{{lab}}} {value}" if lab else f"{name} {value}"


def parse_logs(system, run, files):
    """files: {rank: text}. Returns metric lines for one run."""
    out, last_g, ended = [], None, 0
    for rank, text in sorted(files.items()):
        step = None; last_ts = None; start_ts = None; ck_s = None; ck_n = 0
        for line in text.splitlines():
            try:
                r = json.loads(line)
            except ValueError:
                continue
            ev = r.get("ev")
            if ev == "start":
                start_ts = r["ts"]
            elif ev in ("step", "end"):
                step, last_ts = r["step"], r["ts"]
                if rank == 0 and r.get("gloss") is not None:
                    last_g = r["gloss"]
                if ev == "end" and rank == 0:
                    ended = 1
            elif ev == "ckpt":
                ck_s, ck_n = r["secs"], ck_n + 1
        L = {"system": system, "run": run, "rank": rank}
        if start_ts is not None:
            out.append(fmt("oc_train_start_timestamp_seconds", L, start_ts))
        if step is not None:
            out.append(fmt("oc_train_step", L, step))
            out.append(fmt("oc_train_last_step_timestamp_seconds", L, last_ts))
            if rank == 0:
                out.append(fmt("oc_train_tokens_total", {"system": system, "run": run}, step * TOKENS_PER_STEP))
        if rank == 0 and ck_s is not None:
            out.append(fmt("oc_train_ckpt_seconds", {"system": system, "run": run}, ck_s))
            out.append(fmt("oc_train_ckpt_total", {"system": system, "run": run}, ck_n))
    if last_g is not None:
        out.append(fmt("oc_train_gloss", {"system": system, "run": run}, last_g))
    out.append(fmt("oc_train_ended", {"system": system, "run": run}, ended))
    return out


def qty(s):
    s = str(s)
    m = re.fullmatch(r"([0-9.]+)(m|Ki|Mi|Gi|Ti|k|M|G)?", s)
    if not m:
        return 0.0
    v, u = float(m.group(1)), m.group(2) or ""
    return v * {"": 1, "m": 1e-3, "Ki": 1024, "Mi": 1024**2, "Gi": 1024**3, "Ti": 1024**4, "k": 1e3, "M": 1e6, "G": 1e9}[u]


def poll_k8s():
    out = []
    if K8S_LOGS and os.path.isdir(K8S_LOGS):
        for run in sorted(os.listdir(K8S_LOGS)):
            if not run.startswith(RUN_PREFIX):
                continue
            d = os.path.join(K8S_LOGS, run); files = {}
            for f in os.listdir(d):
                m = re.fullmatch(r"rank(\d+)\.jsonl", f)
                if m:
                    with open(os.path.join(d, f)) as fh:
                        files[int(m.group(1))] = fh.read()
            out += parse_logs("k8s", run, files)
    txt = sh(KUBECTL + ["get", "clusterqueue", "-o", "json"])
    try:
        items = json.loads(txt)["items"]
    except Exception:
        items = []
    for cq in items:
        name = cq["metadata"]["name"]; st = cq.get("status", {})
        for rg in cq["spec"].get("resourceGroups", []):
            for fl in rg.get("flavors", []):
                for r in fl.get("resources", []):
                    out.append(fmt("oc_kueue_quota", {"cluster_queue": name, "flavor": fl["name"], "resource": r["name"]}, qty(r["nominalQuota"])))
        for fl in st.get("flavorsUsage", []):
            for r in fl.get("resources", []):
                out.append(fmt("oc_kueue_usage", {"cluster_queue": name, "flavor": fl["name"], "resource": r["name"]}, qty(r.get("total", 0))))
        for k, lab in (("pendingWorkloads", "pending"), ("admittedWorkloads", "admitted"), ("reservingWorkloads", "reserving")):
            out.append(fmt("oc_kueue_workloads", {"cluster_queue": name, "state": lab}, st.get(k, 0)))
    return out


def poll_slurm():
    out = []
    txt = sh(["docker", "exec", SLURM_CTL, "sh", "-c",
              "squeue -h -o '%i|%T|%r|%b|%D|%j'; echo ===; scontrol show node -o; echo ===; "
              "for f in /shared/logs/" + RUN_PREFIX + "*/rank*.jsonl; do [ -f \"$f\" ] && echo \"### $f\" && cat \"$f\"; done"], timeout=15)
    parts = txt.split("===\n")
    if len(parts) < 3:
        return out
    q, nodes, logs = parts[0], parts[1], parts[2]
    states, reasons = {}, {}
    for line in q.splitlines():
        f = line.split("|")
        if len(f) < 6:
            continue
        states[f[1]] = states.get(f[1], 0) + 1
        if f[1] == "PENDING":
            reasons[f[2]] = reasons.get(f[2], 0) + 1
    for s in ("RUNNING", "PENDING", "COMPLETING"):
        out.append(fmt("oc_slurm_jobs", {"state": s.lower()}, states.get(s, 0)))
    for r, n in reasons.items():
        out.append(fmt("oc_slurm_pending", {"reason": r}, n))
    tot = {"gpu": 0, "cpu": 0}; alloc = {"gpu": 0, "cpu": 0}
    for line in nodes.splitlines():
        m = re.search(r"NodeName=(\S+)", line)
        if not m:
            continue
        node = m.group(1)
        st = re.search(r"State=(\S+)", line).group(1)
        up = 0 if re.search(r"DOWN|DRAIN|NOT_RESPONDING|FAIL", st) else 1
        out.append(fmt("oc_slurm_node_up", {"node": node, "state": st}, up))
        ct = re.search(r"CfgTRES=(\S+)", line); at = re.search(r"AllocTRES=(\S*)", line)
        for src, acc in ((ct, tot), (at, alloc)):
            if src:
                for kv in src.group(1).split(","):
                    if "=" in kv:
                        k, v = kv.split("=", 1)
                        if k == "gres/gpu":
                            acc["gpu"] += qty(v)
                        elif k == "cpu":
                            acc["cpu"] += qty(v)
    for k in ("gpu", "cpu"):
        name = "oc_slurm_gres_gpu" if k == "gpu" else "oc_slurm_cpus"
        out.append(fmt(name, {"state": "total"}, tot[k]))
        out.append(fmt(name, {"state": "alloc"}, alloc[k]))
    runs = {}
    cur = None
    for line in logs.splitlines():
        if line.startswith("### "):
            m = re.search(r"/shared/logs/([^/]+)/rank(\d+)\.jsonl", line)
            cur = (m.group(1), int(m.group(2))) if m else None
            if cur:
                runs.setdefault(cur[0], {})[cur[1]] = ""
        elif cur:
            runs[cur[0]][cur[1]] += line + "\n"
    for run, files in runs.items():
        out += parse_logs("slurm", run, files)
    for c in SLURM_NODES:
        st = sh(["docker", "exec", c, "cat", "/sys/fs/cgroup/cpu.stat"])
        m = re.search(r"usage_usec (\d+)", st)
        if m:
            out.append(fmt("oc_node_cpu_seconds_total", {"system": "slurm", "node": c.replace("mi-slurm-", "")}, int(m.group(1)) / 1e6))
    return out


def loop():
    while True:
        lines = []
        for src, f in (("k8s", poll_k8s), ("slurm", poll_slurm)):
            if src in SOURCES:
                t = time.time()
                try:
                    lines += f()
                except Exception as e:                       # keep serving the last good values
                    lines.append(f"# poll error {src}: {esc(e)}")
                lines.append(fmt("oc_exporter_poll_seconds", {"source": src}, round(time.time() - t, 4)))
        with lock:
            cache["lines"], cache["t"] = lines, time.time()
        time.sleep(POLL)


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_response(404); self.end_headers(); return
        with lock:
            body = "\n".join(cache["lines"] + [fmt("oc_exporter_last_poll_timestamp_seconds", {}, cache["t"])]) + "\n"
        b = body.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    threading.Thread(target=loop, daemon=True).start()
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
