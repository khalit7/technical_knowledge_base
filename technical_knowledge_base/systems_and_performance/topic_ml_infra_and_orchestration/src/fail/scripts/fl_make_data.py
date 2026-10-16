#!/usr/bin/env python3
"""Failure lab: turn the recorded runs (src/fail/runs, scrubbed) and the published tables (src/fail/inputs)
into the small data object the page embeds (parts/33_js_fl_0data.js) and src/fail/fl_data.json.

Every time below is read from a log line (file named in the "src" field); times are seconds after the
injected failure. Run from anywhere:  python3 src/fail/scripts/fl_make_data.py
"""
import json, os, re, glob, statistics, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
FAIL = os.path.dirname(HERE)
RUNS = os.path.join(FAIL, "runs")
SRC = os.path.dirname(FAIL)
PARTS = os.path.join(SRC, "parts")
UTC = dt.timezone.utc
DAY = "2026-10-16"


def jl(path):
    out = []
    for line in open(path):
        for part in line.replace("}{", "}\n{").splitlines():
            part = part.strip()
            if part.startswith("{"):
                out.append(json.loads(part))
    return out


def ev(run, kind, rank=None, nth=0, **match):
    xs = [e for e in jl(os.path.join(RUNS, run, "all.jsonl")) if e["ev"] == kind and (rank is None or e["rank"] == rank)
          and all(e.get(k) == v for k, v in match.items())]
    xs.sort(key=lambda e: e["ts"])
    return xs[nth]


def ts(hms, day=DAY):
    """'04:18:01.002' or '04:18:01' (UTC, the containers' clock) -> unix seconds."""
    h, m, s = hms.split(":")
    sec = float(s.replace(",", "."))
    d = dt.datetime.fromisoformat(f"{day}T{int(h):02d}:{int(m):02d}:00").replace(tzinfo=UTC)
    return d.timestamp() + sec


def grep1(run, fname, pattern, group=1, nth=0):
    txt = open(os.path.join(RUNS, run, fname)).read()
    ms = re.findall(pattern, txt, flags=re.M)
    if not ms:
        raise SystemExit(f"no match for {pattern!r} in {run}/{fname}")
    m = ms[nth]
    return m if isinstance(m, str) else m[group - 1]


def first_line(path):
    """The first unix timestamp (a number above 1e9) in a small file written at the moment of an action."""
    for tok in open(path).read().split():
        try:
            v = float(tok)
        except ValueError:
            continue
        if v > 1e9:
            return v
    raise SystemExit(f"no timestamp in {path}")


def rel(t, t0):
    return round(t - t0, 2)


# sanity: the jsonl "ts" field and the containers' UTC clock agree
c = ev("fl-crash", "crash")
assert abs(c["ts"] - ts("04:12:03.398")) < 0.01, c["ts"]

D = {"generated": DAY}

# ---------------------------------------------------------------- reference losses (src/data/runs/slurm)
ref = {}
for e in jl(os.path.join(SRC, "data", "runs", "slurm", "rank0.jsonl")):
    if e["ev"] == "step":
        ref[e["step"]] = e["gloss"]
D["ref"] = {"steps": sorted(ref), "gloss": [ref[s] for s in sorted(ref)], "src": "src/data/runs/slurm/rank0.jsonl"}


def continuity(run, rank=0, ref_map=ref):
    """Compare gloss after the last resume with the uninterrupted reference at every logged step."""
    es = jl(os.path.join(RUNS, run, "all.jsonl"))
    res = sorted([e for e in es if e["ev"] == "resume" and e["rank"] == rank], key=lambda e: e["ts"])
    t_res = res[-1]["ts"] if res else 0
    pts = sorted([e for e in es if e["ev"] == "step" and e["rank"] == rank and e["ts"] >= t_res], key=lambda e: e["step"])
    rows = [(e["step"], e["gloss"], ref_map.get(e["step"])) for e in pts if e["step"] in ref_map]
    same = sum(1 for _, a, b in rows if a == b)
    maxd = max((abs(a - b) for _, a, b in rows), default=None)
    return {"resumed_from": res[-1]["step"] if res else None, "compared": len(rows), "identical": same, "max_abs_diff": maxd,
            "differ_at": [s for s, a, b in rows if a != b]}


# ---------------------------------------------------------------- failure scenarios
S = []

# Slurm: rank 3 exits with code 13 at step 120 (MAXR=0), then resubmitted by hand
t0 = ev("fl-crash", "crash")["ts"]
S.append({"id": "s-crash", "sys": "slurm", "fail": "crash", "title": "Slurm: one rank crashes (exit 13)", "t0": t0,
  "events": [
    [0, "fail", "rank 3 on c2 exits with code 13 at step 120", "runs/fl-crash/all.jsonl"],
    [rel(ts("04:12:03.552"), t0), "detect", "torchrun on c2: failed (exitcode: 13) local_rank: 1; SIGTERM to its other rank", "runs/fl-crash/job42.out"],
    [rel(ts("04:12:03.929"), t0), "detect", "srun --kill-on-bad-exit cancels the step; torchrun on c1 gets SIGTERM", "runs/fl-crash/job42.out"],
    [rel(ts("04:12:04"), t0), "end", "job 42 FAILED (exit 1). Slurm does not retry a job that failed by itself; --requeue covers node failure and preemption", "runs/fl-crash/sacct42.txt"],
    [rel(ts("04:12:05"), t0), "act", "resubmitted by hand (sbatch, same RUN folder): job 43", "runs/fl-crash/sacct43.txt"],
    [rel(ev("fl-crash", "resume", 0)["ts"], t0), "resume", "all 4 ranks load step_000100.pt and continue", "runs/fl-crash/all.jsonl"]],
  "detect_s": rel(ts("04:12:03.552"), t0), "resume_s": rel(ev("fl-crash", "resume", 0)["ts"], t0), "steps_redone": 120 - 100,
  "outcome": "job FAILED; resubmit resumes from the step-100 checkpoint", "cont": continuity("fl-crash")})

# Slurm: in-job restart by torchrun --max-restarts=2, rendezvous store shared (default): restarts fail
t0 = ev("fl-maxr", "crash")["ts"]
S.append({"id": "s-maxr", "sys": "slurm", "fail": "crash", "title": "Slurm + torchrun --max-restarts=2 (default store sharing)", "t0": t0,
  "events": [
    [0, "fail", "rank 3 exits with code 13 at step 120", "runs/fl-maxr/all.jsonl"],
    [rel(ts("04:13:12.644"), t0), "detect", "torchrun on c2 sees the failure and restarts its workers", "runs/fl-maxr/job44.out"],
    [rel(ts("04:13:13.045"), t0), "detect", "torchrun on c1 sees its rank 0 fail (connection reset) and restarts too", "runs/fl-maxr/job44.out"],
    [rel(ts("04:13:15.512"), t0), "err", "restart 1: Gloo connectFullMesh failed ... SO_ERROR: Connection refused (ranks 1 to 3 dial an address rank 0 no longer listens on)", "runs/fl-maxr/job44.out"],
    [rel(ts("04:13:17.761"), t0), "err", "restart 2: the same error", "runs/fl-maxr/job44.out"],
    [rel(ts("04:13:18"), t0), "end", "job 44 FAILED: both in-job restarts spent, no step after 120 ever ran", "runs/fl-maxr/sacct44.txt"]],
  "detect_s": rel(ts("04:13:12.644"), t0), "resume_s": None, "steps_redone": None,
  "outcome": "in-job restart fails to re-form the process group (repeated: job 46 failed the same way)", "repeat": "fl-maxr-rep"})

t0 = ev("fl-maxr2", "crash")["ts"]
S.append({"id": "s-maxr2", "sys": "slurm", "fail": "crash", "title": "Slurm + torchrun --max-restarts=2, TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1", "t0": t0,
  "events": [
    [0, "fail", "rank 3 exits with code 13 at step 120", "runs/fl-maxr2/all.jsonl"],
    [rel(ev("fl-maxr2", "resume", 0)["ts"], t0), "resume", "both torchruns restart their workers inside the same Slurm job; all ranks resume from step_000100.pt", "runs/fl-maxr2/all.jsonl"],
    [rel(ts("04:15:14"), t0), "end", "job 45 COMPLETED", "runs/fl-maxr2/sacct45.txt"]],
  "detect_s": None, "resume_s": rel(ev("fl-maxr2", "resume", 0)["ts"], t0), "steps_redone": 20,
  "outcome": "restarted inside the job in seconds", "cont": continuity("fl-maxr2")})

pc = [e for e in jl(os.path.join(RUNS, "fl-poison", "all.jsonl")) if e["ev"] == "crash"]
pc.sort(key=lambda e: e["ts"])
t0 = pc[0]["ts"]
S.append({"id": "s-poison", "sys": "slurm", "fail": "crash", "title": "Slurm + --max-restarts=2: a crash that happens every time", "t0": t0,
  "events": [[rel(e["ts"], t0), "fail", f"attempt {i + 1}: rank 3 exits with code 13 at step 120 again", "runs/fl-poison/all.jsonl"] for i, e in enumerate(pc)] +
            [[rel(ts("04:16:36"), t0), "end", "job 47 FAILED after 3 attempts; each redid steps 100 to 120", "runs/fl-poison/sacct47.txt"]],
  "detect_s": None, "resume_s": None, "steps_redone": 40,
  "outcome": "restarts cannot fix a deterministic bug (or a bad batch): budget spent, job FAILED"})

# Slurm: node container killed (docker kill mi-slurm-c2) at step 120
t0 = first_line(os.path.join(RUNS, "fl-node", "kill_time.txt")) if os.path.exists(os.path.join(RUNS, "fl-node", "kill_time.txt")) else None
if t0 is None:
    raise SystemExit("fl-node/kill_time.txt missing")
S.append({"id": "s-node", "sys": "slurm", "fail": "node", "title": "Slurm: a node container killed (docker kill)", "t0": t0,
  "events": [
    [0, "fail", "docker kill mi-slurm-c2 (ranks 2 and 3, slurmd)", "runs/fl-node/kill_time.txt"],
    [rel(ts("04:17:29"), t0), "detect", "ranks on c1 fail at once: the dead peers' sockets are closed (torchrun on c1 reports exitcode 1)", "runs/fl-node/job48.out"],
    [rel(ts("04:17:42"), t0), "detect", "sinfo shows c2 as mixed* (not responding), within one poll of 2 s", "runs/fl-node/poll.txt"],
    [rel(ts("04:18:01.002"), t0), "detect", "slurmctld: error: Nodes c2 not responding, setting DOWN; requeue job JobId=48 due to failure of node c2 (SlurmdTimeout=30 here; default 300)", "runs/fl-node/slurmctld.log"],
    [rel(ts("04:18:02"), t0), "act", "job 48 PENDING, reason BeginTime, eligible at 04:20:02: a requeued job waits about 2 minutes", "runs/fl-node/poll.txt"],
    [rel(ts("04:20:11.093"), t0), "act", "backfill starts job 48 again on c[1,3]", "runs/fl-node/slurmctld.log"],
    [rel(ev("fl-node", "resume", 0)["ts"], t0), "resume", "ranks resume from step_000100.pt on c1 and c3", "runs/fl-node/all.jsonl"]],
  "detect_s": rel(ts("04:18:01.002"), t0), "resume_s": rel(ev("fl-node", "resume", 0)["ts"], t0), "steps_redone": 20,
  "outcome": "NODE_FAIL, requeued automatically, resumed on a healthy node", "cont": continuity("fl-node")})

# Slurm: one rank frozen with SIGSTOP (a hang), process-group timeout 30 s
t0 = first_line(os.path.join(RUNS, "fl-hang", "stop_time.txt"))
S.append({"id": "s-hang", "sys": "slurm", "fail": "hang", "title": "Slurm: one rank hangs (SIGSTOP), timeout 30 s", "t0": t0,
  "events": [
    [0, "fail", "kill -STOP the rank-3 process on c2 after step 120: alive, silent", "runs/fl-hang/stop_time.txt"],
    [rel(ts("04:23:07.618"), t0), "detect", "ranks 0 to 2: RuntimeError: ... Timed out waiting 30000ms for recv operation to complete", "runs/fl-hang/job51.out"],
    [rel(ts("04:23:08"), t0), "end", "job 51 FAILED; torchrun's Root Cause names rank 0 on c1, a healthy rank, and the frozen rank only got SIGTERM", "runs/fl-hang/sacct51.txt"]],
  "detect_s": rel(ts("04:23:07.618"), t0), "resume_s": None, "steps_redone": None,
  "outcome": "nothing notices until the collective timeout; the report blames the wrong rank"})

# Kubernetes: rank crash, JobSet maxRestarts 0
t0 = ev("fl-k1", "crash")["ts"]
S.append({"id": "k-crash0", "sys": "k8s", "fail": "crash", "title": "Kubernetes (JobSet, maxRestarts 0): one rank crashes", "t0": t0,
  "events": [
    [0, "fail", "rank 3 in pod node-0-1 exits with code 13 at step 120", "runs/fl-k1/all.jsonl"],
    [rel(ts("04:32:24.768"), t0), "detect", "pod node-0-1: Error (seen by a 1 s poll)", "runs/fl-k1/poll.txt"],
    [rel(ts("04:32:27"), t0), "end", "Job: BackoffLimitExceeded; JobSet: ReachedMaxRestarts, jobset failed", "runs/fl-k1/events.txt"]],
  "detect_s": rel(ts("04:32:24.768"), t0), "resume_s": None, "steps_redone": None,
  "outcome": "JobSet Failed (the running example's spec allows no restart)"})

t0 = ev("fl-k2", "crash")["ts"]
S.append({"id": "k-crash2", "sys": "k8s", "fail": "crash", "title": "Kubernetes (JobSet, maxRestarts 2): one rank crashes", "t0": t0,
  "events": [
    [0, "fail", "rank 3 exits with code 13 at step 120", "runs/fl-k2/all.jsonl"],
    [rel(ts("04:33:19.452"), t0), "detect", "pod node-0-1: Error", "runs/fl-k2/poll.txt"],
    [rel(ts("04:33:21"), t0), "act", "JobSet: applying RestartJobSet failure policy action; the Job and both pods are recreated", "runs/fl-k2/events.txt"],
    [rel(ts("04:33:22"), t0), "act", "new pods Running on the same workers (image already on the nodes)", "runs/fl-k2/events.txt"],
    [rel(ev("fl-k2", "resume", 0)["ts"], t0), "resume", "all ranks resume from step_000100.pt", "runs/fl-k2/all.jsonl"]],
  "detect_s": rel(ts("04:33:19.452"), t0), "resume_s": rel(ev("fl-k2", "resume", 0)["ts"], t0), "steps_redone": 20,
  "outcome": "whole JobSet recreated and resumed", "cont": continuity("fl-k2")})

t0 = first_line(os.path.join(RUNS, "fl-k3", "pause_time.txt"))
t_taint = first_line(os.path.join(RUNS, "fl-k3", "taint_time.txt"))
S.append({"id": "k-node", "sys": "k8s", "fail": "node", "title": "Kubernetes: a worker node goes silent (docker pause), timeout 30 s", "t0": t0,
  "events": [
    [0, "fail", "docker pause mi-kind-worker2 (pod node-0-1, kubelet frozen)", "runs/fl-k3/pause_time.txt"],
    [rel(ts("04:35:11.958"), t0), "detect", "pod node-0-0 on worker: Error (its ranks hit the 30 s gloo timeout)", "runs/fl-k3/poll.txt"],
    [rel(ts("04:35:13"), t0), "act", "Job deletes pod node-0-1; it stays Terminating: its kubelet cannot confirm", "runs/fl-k3/events.txt"],
    [rel(ts("04:35:35"), t0), "detect", "node NotReady (node-monitor-grace-period 50 s); taints unreachable:NoExecute", "runs/fl-k3/events.txt"],
    [rel(ts("04:40:35"), t0), "act", "TaintManagerEviction after the default 300 s toleration: still Terminating; Job stuck in FailureTarget, JobSet waits", "runs/fl-k3/events_before_taint.txt"],
    [rel(t_taint, t0), "act", "operator: kubectl taint node mi-kind-worker2 node.kubernetes.io/out-of-service=nodeshutdown:NoExecute", "runs/fl-k3/taint_time.txt"],
    [rel(ts("04:42:06.062"), t0), "act", "pod force-deleted; JobSet restart proceeds; new pods on worker and worker3", "runs/fl-k3/poll.txt"],
    [rel(ev("fl-k3", "resume", 0)["ts"], t0), "resume", "all ranks resume from step_000100.pt", "runs/fl-k3/all.jsonl"]],
  "detect_s": rel(ts("04:35:11.958"), t0), "resume_s": rel(ev("fl-k3", "resume", 0)["ts"], t0), "steps_redone": 20,
  "operator_s": rel(t_taint, t0),
  "outcome": "stuck until a person marks the node out of service", "cont": continuity("fl-k3")})

# Ray Train
t0 = ev("fl-r1", "crash")["ts"]
t_connect = ts("04:44:26.558")
secs = float(grep1("fl-r1", "driver.out", r"secs= ([0-9.]+)"))
S.append({"id": "r-crash0", "sys": "ray", "fail": "crash", "title": "Ray Train (max_failures 0): one rank crashes", "t0": t0,
  "events": [
    [0, "fail", "worker of rank 3 exits with code 13 at step 120", "runs/fl-r1/all.jsonl"],
    [rel(t_connect + secs, t0), "end", "trainer.fit() raises WorkerGroupError: Training failed due to worker errors (rank 3: A worker health check failed)", "runs/fl-r1/driver.out"]],
  "detect_s": rel(t_connect + secs, t0), "resume_s": None, "steps_redone": None, "approx": True,
  "outcome": "run fails (the running example's FailureConfig(max_failures=0))"})

t0 = ev("fl-r2", "crash")["ts"]
S.append({"id": "r-crash2", "sys": "ray", "fail": "crash", "title": "Ray Train (max_failures 2): one rank crashes", "t0": t0,
  "events": [
    [0, "fail", "worker of rank 3 exits with code 13 at step 120", "runs/fl-r2/all.jsonl"],
    [rel(ev("fl-r2", "resume", 0)["ts"], t0), "resume", "controller starts a new worker group of 4 (same placement); ranks resume from step_000100.pt", "runs/fl-r2/all.jsonl"]],
  "detect_s": None, "resume_s": rel(ev("fl-r2", "resume", 0)["ts"], t0), "steps_redone": 20,
  "outcome": "worker group replaced and resumed", "cont": continuity("fl-r2")})

t0 = first_line(os.path.join(RUNS, "fl-r3", "kill_time.txt"))
t_back = first_line(os.path.join(RUNS, "fl-r3", "restart_time.txt"))
S.append({"id": "r-node", "sys": "ray", "fail": "node", "title": "Ray: a worker node container killed (docker kill)", "t0": t0,
  "events": [
    [0, "fail", "docker kill mi-ray-w2 (ranks 2 and 3, its raylet)", "runs/fl-r3/kill_time.txt"],
    [rel(ts("04:47:53.319"), t0), "detect", "GCS: Health check failed for node ..., remaining checks 4", "runs/fl-r3/gcs_health.txt"],
    [rel(ts("04:48:07.162"), t0), "act", "controller: Attempting to start training worker group of size 4 (placement group registered): waits for 4 fake_gpu, only 2 alive", "runs/fl-r3/driver.out"],
    [rel(ts("04:48:11.766"), t0), "detect", "GCS: Node is dead because the health check failed", "runs/fl-r3/gcs_health.txt"],
    [rel(t_back, t0), "act", "operator: docker start mi-ray-w2; the node rejoins", "runs/fl-r3/restart_time.txt"],
    [rel(ev("fl-r3", "resume", 0)["ts"], t0), "resume", "worker group of 4 placed; ranks resume from step_000100.pt", "runs/fl-r3/all.jsonl"]],
  "detect_s": rel(ts("04:48:11.766"), t0), "resume_s": rel(ev("fl-r3", "resume", 0)["ts"], t0), "steps_redone": 20,
  "operator_s": rel(t_back, t0),
  "outcome": "waits for capacity: no spare node, so it resumed only when the node came back", "cont": continuity("fl-r3")})

D["scen"] = S

# ---------------------------------------------------------------- with and without checkpoints (Slurm)
def progress(run):
    es = [e for e in jl(os.path.join(RUNS, run, "all.jsonl")) if e["rank"] == 0 and e["ev"] in ("step", "start", "end", "resume")]
    crash = [e for e in jl(os.path.join(RUNS, run, "all.jsonl")) if e["ev"] == "crash"]
    es.sort(key=lambda e: e["ts"])
    t0 = min(e["ts"] - e["t"] for e in es)  # process start of attempt 1
    pts = [[round(e["ts"] - t0, 2), e.get("step", e.get("start_step", 0))] for e in es if e["ev"] in ("step", "start")]
    return {"pts": pts, "crash_t": round(crash[0]["ts"] - t0, 2) if crash else None,
            "end_t": round(max(e["ts"] for e in es if e["ev"] == "end") - t0, 2)}
D["ckpt"] = {"with": progress("fl-crash"), "without": progress("fl-nockpt"), "base": progress("fl-base"),
             "note": "rank 0 progress of three Slurm runs, 200 steps with --step-sleep-ms 150; times from rank 0's process start of the first attempt"}

# ---------------------------------------------------------------- stragglers
def step_ms(run, rank):
    st = {e["step"]: e["ts"] for e in jl(os.path.join(RUNS, run, "all.jsonl")) if e["ev"] == "step" and e["rank"] == rank}
    return round((st[100] - st[10]) / 90 * 1000, 1)
D["strag"] = {"slow_ms": [0, 50, 200], "step_ms": [[step_ms(f"fl-strag{m}", r) for r in range(4)] for m in (0, 50, 200)]}
probe = {}
for m in (0, 50):
    txt = open(os.path.join(RUNS, f"fl-probe{m}", "probe.txt")).read()
    for js in re.findall(r"\{.*?\]\}", txt):
        d = json.loads(js)
        probe.setdefault(m, {})[d["rank"]] = round(statistics.median(d["backward_ms"][10:]), 2)
D["probe"] = {"slow_ms": [0, 50], "backward_median_ms": [[probe[m][r] for r in range(4)] for m in (0, 50)],
              "note": "median time in loss.backward() (which contains DDP's gradient all-reduce), steps 11 to 100, per rank"}

# ---------------------------------------------------------------- health check and drain
hc = open(os.path.join(RUNS, "fl-hc", "hc.txt")).read()
D["hc"] = {"interval_s": 10, "drain_s": [float(x) for x in re.findall(r"drained after ([0-9.]+) s", hc)]}

# ---------------------------------------------------------------- elastic
def elastic(run):
    evs = open(os.path.join(RUNS, run, "events.txt")).read()
    e0 = float(re.search(r"^start ([0-9.]+)", evs, re.M).group(1))
    marks = {k: float(v) - e0 for k, v in re.findall(r"^(kill_B|start_C) ([0-9.]+)", evs, re.M)}
    es = sorted([e for e in jl(os.path.join(RUNS, run, "all.jsonl")) if e["rank"] == 0], key=lambda e: e["ts"])
    pts = [[round(e["ts"] - e0, 2), e.get("step", e.get("start_step", 0)), e["world"]] for e in es if e["ev"] in ("step", "start")]
    starts = [[round(e["ts"] - e0, 2), e["world"], e["start_step"], e["env"].get("torchelastic_restart_count")] for e in es if e["ev"] == "start"]
    gl = {e["step"]: e["gloss"] for e in es if e["ev"] == "step"}
    return {"marks": {k: round(v, 2) for k, v in marks.items()}, "pts": pts, "starts": starts, "gloss": gl}
el3 = elastic("el3")
D["elastic"] = {k: el3[k] for k in ("marks", "pts", "starts")}
# loss of the world-2 stretch against world-4 references at the same steps
cmp_rows = []
w4 = {}
if os.path.exists(os.path.join(RUNS, "el_ref400", "all.jsonl")):
    w4 = {e["step"]: e["gloss"] for e in jl(os.path.join(RUNS, "el_ref400", "all.jsonl")) if e["ev"] == "step" and e["rank"] == 0}
for s in sorted(el3["gloss"]):
    w = [p for p in el3["pts"] if p[1] == s]
    world = w[-1][2] if w else None
    r4 = w4.get(s, ref.get(s))
    if r4 is not None:
        cmp_rows.append([s, world, el3["gloss"][s], r4])
D["elastic"]["cmp"] = cmp_rows
D["elastic"]["store_host_error"] = "torch.distributed.elastic.rendezvous.api.RendezvousConnectionError: The connection to the C10d store has failed. See inner exception for details."
if os.path.exists(os.path.join(RUNS, "el4", "events.txt")):
    D["spare"] = {k: elastic("el4")[k] for k in ("marks", "pts", "starts")}

# ---------------------------------------------------------------- resume exactness (one container, runs/exact)
def g0(n):
    return {e["step"]: e["gloss"] for e in jl(os.path.join(RUNS, "exact", n + ".jsonl")) if e["ev"] == "step" and e["rank"] == 0}
EX = []
for a, b, label in (("w4_ref", "w4_split", "4 ranks, DDP as shipped"), ("w4nr_ref", "w4nr_split", "4 ranks, DDP bucket rebuild switched off"),
                    ("w2_ref", "w2_split", "2 ranks, DDP as shipped")):
    A, B = g0(a), g0(b)
    ks = [k for k in sorted(B) if k in A and k > 100]
    EX.append({"label": label, "compared": len(ks), "differ_at": [k for k in ks if A[k] != B[k]],
               "rows": [[k, A[k], B[k]] for k in ks]})
D["exact"] = EX

# ---------------------------------------------------------------- published: Llama 3 Table 5, OPT
txt = open(os.path.join(FAIL, "inputs", "llama3_sec3_3_4.txt")).read()
i, j = txt.find("Faulty GPU GPU"), txt.find("Table 5 :")
rows = re.findall(r"([A-Za-z0-9/+ ]+?) (GPU|Dependency|Network|Unplanned Maintenance|Host|Unknown) (\d+) ([0-9.]+)%", txt[i:j])
T5 = [[n.strip(), cat, int(k), float(p)] for n, cat, k, p in rows]
assert len(T5) == 18 and sum(r[2] for r in T5) == 419, (len(T5), sum(r[2] for r in T5))
D["l3"] = {"rows": T5, "days": 54, "gpus": 16384, "total": 466, "planned": 47, "unexpected": 419,
           "text_hw_pct": 78, "text_gpu_pct": 58.7, "src": "https://arxiv.org/html/2407.21783v3#S3.SS3.SSS4"}
D["opt"] = {"gpus": 992, "manual": 35, "auto": 70, "hosts": 100, "months": 2, "src": "https://arxiv.org/html/2205.01068v4#S2.SS5"}

rc = os.path.join(FAIL, "fl_recompute.json")   # written by fl_recompute.py (run it first)
if os.path.exists(rc):
    R = json.load(open(rc))
    D["replay"] = R["replay"]
    D["calc"] = {"rates": R["rates"], "t5": R["t5"], "headline_16k": R["headline_16k"]}

os.makedirs(PARTS, exist_ok=True)
js = json.dumps(D, separators=(",", ":"))
open(os.path.join(FAIL, "fl_data.json"), "w").write(json.dumps(D, indent=1))
open(os.path.join(PARTS, "33_js_fl_0data.js"), "w").write(
    "// ---- Failure lab: recorded data (generated by src/fail/scripts/fl_make_data.py; do not edit) ----\nwindow.FL_DATA=" + js + ";\n")
print("bytes", len(js))
for s in S:
    print(f"{s['id']:9s} detect={s['detect_s']} resume={s['resume_s']} redone={s['steps_redone']} cont={s.get('cont')}")
print("strag", D["strag"]["step_ms"]); print("probe", D["probe"]["backward_median_ms"]); print("hc", D["hc"])
print("elastic starts", D["elastic"]["starts"], D["elastic"]["marks"])
print("elastic cmp", [(r[0], r[1], r[2] - r[3]) for r in cmp_rows])
