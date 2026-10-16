#!/usr/bin/env python3
"""Launch lab: build out/hangs.json and out/texts_extra.json (hang cards, summary table, tools, drills, DNS) from the
failure runs, and copy the quoted logs, scrubbed, to raw_scrubbed/.

usage: python3 la_hangs.py <evidence root>
Times: t_err is from the first process of the job starting (the earliest node task) to the first error line.
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
RAW = os.path.join(HERE, "..", "raw_scrubbed")
sys.path.insert(0, HERE)
from la_collect import scrub  # noqa: E402

GH = "https://github.com/pytorch/pytorch/blob/v2.14.1/"


def gh(path, a, b=None):
    frag = f"#L{a}" + (f"-L{b}" if b else "")
    lab = f"{path.split('/')[-1]}:{a}" + (f"-{b}" if b else "")
    return f'<a href="{GH}{path}{frag}" target="_blank" rel="noopener noreferrer">{lab}</a>'


def jl(p):
    with open(p) as f:
        return json.load(f)


def sub_ts(d):
    return float(open(os.path.join(d, "submit.txt")).read().split()[0])


def keep(path, dest, drop=()):
    """Copy a log, scrubbed, dropping C++ frame noise; return the scrubbed text."""
    t = scrub(open(path, errors="replace").read())
    lines = [l for l in t.splitlines() if not re.match(r"^(frame #|Exception raised from|<omitting)", l)]
    lines = [l for l in lines if not any(re.search(x, l) for x in drop)]
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w") as f:
        f.write("\n".join(lines) + "\n")
    return "\n".join(lines)


def tail_err(text, n=3, pat=r"Error|error|Timed out|timed out"):
    ls = [l for l in text.splitlines() if re.search(pat, l) and not l.startswith("  File")]
    return "\n".join(ls[-n:])


def main():
    root = sys.argv[1]
    H, X = [], {}
    sl, k8, ry = (os.path.join(root, s) for s in ("slurm", "k8s", "ray"))
    kr = os.path.join(root, "k8s_runs")

    # ---- 1. a node that never arrives: Slurm (c10d dynamic) ----
    d = os.path.join(sl, "la-miss"); s0 = sub_ts(d); a = jl(os.path.join(d, "agent_c1.json"))
    txt = keep(os.path.join(d, "job.out"), os.path.join(RAW, "slurm", "la-miss", "job.out"))
    t_start = a["task_ts"]; t_err = a["rdzv"][0]["t1"] - t_start
    H.append({"id": "sl-miss", "sys": "slurm", "short": "Slurm: node missing", "label": "a node that never starts torchrun",
              "what": "Node 1's task sleeps instead of starting torchrun (<code>LA_POD1='sleep 100000;'</code>), as if its node hung during set-up. Node 0's torchrun joins the c10d rendezvous at <code>c1:29500</code> and waits for a second participant.",
              "timeout": f"(the rendezvous join timeout, 600 s by default: {gh('torch/distributed/elastic/rendezvous/dynamic_rendezvous.py', 144)}). For ten minutes the job log is empty; the last lines are:",
              "t_err": round(t_err, 1), "err": "job 72 nodes c[1-2] rendezvous c1:29500\n...  (nothing for ten minutes)\n" + tail_err(txt, 6, r"RendezvousTimeoutError$|srun"),
              "after": "The exception has no message at all. torchrun exits 1 on node 0; <code>srun --kill-on-bad-exit=1</code> then kills node 1's task. Slurm records the job step as FAILED (exit 1) and, because the batch script ends with an <code>echo</code>, the job itself as COMPLETED: check <code>sacct</code> steps, not just the job line.",
              "src": "Raw log: <code>src/launch/raw_scrubbed/slurm/la-miss/job.out</code>."})
    X["sl_miss_s"] = round(t_err, 1)

    # ---- 2. Kubernetes (static) ----
    d = os.path.join(k8, "la-miss"); s0 = sub_ts(d); a = jl(os.path.join(kr, "la-miss", "agent_la-miss-node-0-0.json"))
    log = glob.glob(os.path.join(d, "la-miss-node-0-0-*.log"))[0]
    txt = keep(log, os.path.join(RAW, "k8s", "la-miss", "pod0.log"))
    t_err = a["rdzv"][0]["t1"] - a["task_ts"]
    ev = jl(os.path.join(d, "events_all.json"))["items"]
    fail_t = [e for e in ev if e["involvedObject"]["name"] == "la-miss" and e["reason"] == "ReachedMaxRestarts"]
    H.append({"id": "k8s-miss", "sys": "k8s", "short": "Kubernetes: pod missing", "label": "a pod that never starts torchrun",
              "what": "Pod 1 sleeps instead of starting torchrun. Pod 0's torchrun (static rendezvous, <code>--node-rank=0</code>) starts the TCPStore and waits for both agents to connect.",
              "timeout": f"(not 600 s: torchrun's launcher sets the rendezvous <code>timeout</code> to 900 s when none is given, {gh('torch/distributed/launcher/api.py', 125, 130)}, which overrides the static backend's own 600 s default, {gh('torch/distributed/elastic/rendezvous/static_tcp_rendezvous.py', 28)}). The pod's log is empty until:",
              "t_err": round(t_err, 1), "err": tail_err(txt, 2, r"DistStoreError"),
              "after": "The message comes from the store server: 1 of the 2 expected agents (pod 0 itself) connected. Pod 0 exits 1, the Job deletes pod 1, hits <code>backoffLimit: 0</code> (\"Job has reached the specified backoff limit\") and the JobSet fails with ReachedMaxRestarts (\"jobset failed due to reaching max number of restarts\"), 30 s later while pod 1 is terminated. Kueue then releases the quota.",
              "src": "Raw log and events: <code>src/launch/raw_scrubbed/k8s/la-miss/</code>."})
    X["k8s_miss_s"] = round(t_err, 1)
    with open(os.path.join(RAW, "k8s", "la-miss", "events.txt"), "w") as f:
        for e in sorted(ev, key=lambda e: e.get("lastTimestamp") or e.get("eventTime") or ""):
            if e["involvedObject"]["name"].startswith("la-miss"):
                f.write(f'{e.get("lastTimestamp") or e.get("eventTime")}  {e["involvedObject"]["kind"]:8s} {e["involvedObject"]["name"]:28s} {e["reason"]:20s} {e["message"]}\n')

    # ---- 3. Ray: a worker that cannot be placed ----
    d = os.path.join(ry, "la-miss")
    if os.path.isdir(d):
        drv = jl(os.path.join(d, "driver.json"))
        txt = keep(os.path.join(d, "driver.out"), os.path.join(RAW, "ray", "la-miss", "driver.out"), drop=(r"RayTrainWorker",))
        errs = [l for l in txt.splitlines() if "Error in control loop iteration" in l]
        tries = [l for l in txt.splitlines() if "Attempting to start training worker group" in l]
        first = [l for l in txt.splitlines() if "Requesting resources" in l][:1]
        H.append({"id": "ray-miss", "sys": "ray", "short": "Ray: worker unplaceable", "label": "a worker that can never be placed",
                  "what": "Ray Train is asked for 5 workers of <code>{CPU: 1, fake_gpu: 1}</code> while the cluster has 4 fake GPUs: the fifth worker can never start, the Ray version of a node that never arrives. No process of the job has started yet; the controller is waiting for a placement group.",
                  "timeout": "(Ray Train's worker-group start timeout, <code>RAY_TRAIN_WORKER_GROUP_START_TIMEOUT_S</code>, 60 s by default: ray/train/v2/_internal/constants.py lines 43-44, raised in worker_group.py lines 300-305; the controller's lines carry no timestamp, so the time is the configured one). The controller prints:",
                  "t_err": 60.0, "err": "\n".join(first + tries[:1] + [errs[0][:600] if errs else ""]),
                  "after": f"Then it tries again, and again: {len(tries)} attempts and {len(errs)} timeouts, one a minute, in the {len(errs)} or so minutes before the driver was stopped by hand. With <code>FailureConfig(max_failures=0)</code> the job still never failed by itself: a startup timeout is treated as a scheduling problem to retry (the message's cause (1) is autoscaling), not as a training failure. On a fixed-size cluster, watch for this line rather than for the job to die.",
                  "src": "Raw log: <code>src/launch/raw_scrubbed/ray/la-miss/driver.out</code> (worker lines dropped)."})
        X["ray_miss_s"] = 60.0
        X["ray_miss_tries"] = len(tries)

    # ---- 4. wrong MASTER_ADDR: Kubernetes short name ----
    d = os.path.join(k8, "la-badaddr"); a = jl(os.path.join(kr, "la-badaddr", "agent_la-badaddr-node-0-0.json"))
    log = glob.glob(os.path.join(d, "la-badaddr-node-0-0-*.log"))[0]
    txt = keep(log, os.path.join(RAW, "k8s", "la-badaddr", "pod0.log"))
    p1 = keep(os.path.join(d, "pod1_first_lines_copied_from_kubectl_logs_at_t20s.txt"), os.path.join(RAW, "k8s", "la-badaddr", "pod1_first_lines.log"))
    dns0 = scrub(open(os.path.join(kr, "la-badaddr", "dns_0.txt")).read()).splitlines()
    dns1 = scrub(open(os.path.join(kr, "la-badaddr", "dns_1.txt")).read()).splitlines()
    t_err = a["rdzv"][0]["t1"] - a["task_ts"]
    H.append({"id": "k8s-addr", "sys": "k8s", "short": "Kubernetes: short host name", "label": "MASTER_ADDR without the Service name",
              "what": "<code>--master-addr=la-badaddr-node-0-0</code> instead of <code>la-badaddr-node-0-0.la-badaddr</code>: the pod's short host name. In pod 0 it resolves (the kubelet writes the pod's own name into <code>/etc/hosts</code>); in pod 1 it does not, because cluster DNS only knows the name under the headless Service. <code>getent hosts</code> in each pod at start-up: pod 0 <code>" + (dns0[1] if len(dns0) > 1 else "") + "</code>; pod 1 printed nothing.",
              "timeout": "(the same 900 s: pod 0 hosts the store and waits for 2 agents; pod 1 keeps retrying the name lookup, its client deadline also 900 s). Pod 1 logs a warning on every retry, with growing back-off:",
              "t_err": round(t_err, 1), "err": "\n".join(p1.splitlines()[:3]) + "\n...\n" + tail_err(txt, 1, r"DistStoreError"),
              "after": "Pod 0's final error is identical to the missing-pod case: from pod 0's log alone you cannot tell a missing node from an unreachable one. Pod 1's log tells you: a name that does not resolve there.",
              "src": "Raw logs: <code>src/launch/raw_scrubbed/k8s/la-badaddr/</code>."})
    X["k8s_addr_s"] = round(t_err, 1)

    # ---- 5. wrong MASTER_ADDR: Slurm typo ----
    d = os.path.join(sl, "la-typo"); a = jl(os.path.join(d, "agent_c2.json"))
    txt = keep(os.path.join(d, "job.out"), os.path.join(RAW, "slurm", "la-typo", "job.out"))
    warn = [l for l in txt.splitlines() if "cannot be retrieved" in l]
    t_err = a["t_exit"] - a["task_ts"]
    H.append({"id": "sl-typo", "sys": "slurm", "short": "Slurm: typo in address", "label": "a rendezvous host that does not exist",
              "what": "<code>--rdzv-endpoint=c9:29500</code>: no node is called c9. No agent hosts the store (none matches the name), so both try to connect as clients.",
              "timeout": f"(the c10d backend's store client timeout, <code>read_timeout</code> 60 s by default, {gh('torch/distributed/elastic/rendezvous/c10d_rendezvous_backend.py', 148)}; yet the job took far longer than 60 s to fail: each name lookup and back-off sits between the deadline checks of the retry loop, {gh('torch/csrc/distributed/c10d/TCPStore.cpp', 308, 353)}). {len(warn)} warnings like the first ones, then:",
              "t_err": round(t_err, 1), "err": "\n".join(warn[:2]) + "\n...\n" + tail_err(txt, 2, r"DistNetworkError|RendezvousConnectionError"),
              "after": "The message says 60000 ms; the wall clock said " + f"{t_err:.0f} s. Read the timestamps, not the number in the message.",
              "src": "Raw log: <code>src/launch/raw_scrubbed/slurm/la-typo/job.out</code>."})
    X["sl_typo_s"] = round(t_err, 1)

    # ---- 6. localhost: two runs ----
    for run, ident in (("la-local2", "sl-local"), ("la-local", "sl-coll")):
        d = os.path.join(sl, run)
        if not os.path.exists(os.path.join(d, "job.out")):
            continue
        ags = {os.path.basename(p): jl(p) for p in glob.glob(os.path.join(d, "agent_*.json"))}
        txt = keep(os.path.join(d, "job.out"), os.path.join(RAW, "slurm", run, "job.out"))
        st = min(x["task_ts"] for x in ags.values())
        ends = [x["rdzv"][0]["t1"] for x in ags.values() if x["rdzv"]]
        t_err = (min(ends) if ends else max(x.get("t_exit", st) for x in ags.values())) - st
        if ident == "sl-local":
            H.append({"id": ident, "sys": "slurm", "short": "Slurm: localhost", "label": "MASTER_ADDR=localhost on two nodes",
                      "what": "<code>--rdzv-endpoint=localhost:29500</code>. On each node <code>localhost</code> is that node, so each torchrun decides it is the host (its name matches the endpoint), starts its own store, joins it, and waits for a second participant that is waiting in another store on the other node.",
                      "timeout": "(the 600 s join timeout again; nothing is logged before it):",
                      "t_err": round(t_err, 1), "err": tail_err(txt, 3, r"RendezvousTimeoutError|srun: error"),
                      "after": "Two half-rendezvous, each complete in its own eyes except for the head count. The fix is a name every node resolves to the same machine: the first host of the allocation.",
                      "src": f"Raw log: <code>src/launch/raw_scrubbed/slurm/{run}/job.out</code>."})
            X["sl_local_s"] = round(t_err, 1)
        else:
            H.append({"id": ident, "sys": "slurm", "short": "Slurm: port collision", "label": "localhost while another job holds port 29500",
                      "what": "The first localhost run shared nodes c1 and c2 with the missing-node run (both asked for 2 CPUs per node, so Slurm packed them together). On c1 the other job's torchrun already listened on port 29500. This job's c1 agent tried to host its store there, could not bind, and fell back to connecting as a client, silently joining the other job's store under its own rendezvous id (the fallback is in " + gh("torch/distributed/elastic/rendezvous/c10d_rendezvous_backend.py", 154, 184) + ").",
                      "timeout": "(it waited the other job's full 600 s, then failed when that job's store went away):",
                      "t_err": round(t_err, 1), "err": tail_err(txt, 3, r"DistNetworkError|RendezvousConnectionError"),
                      "after": "The message points at a crashed server; the real cause is two jobs on one node using the same port. Unique ports per job (or the scheduler's job id in the port), or one job per node, prevent it.",
                      "src": f"Raw log: <code>src/launch/raw_scrubbed/slurm/{run}/job.out</code>."})
            X["sl_coll_s"] = round(t_err, 1)

    # ---- 7. world size mismatch ----
    d = os.path.join(sl, "la-ws")
    pr = {p: jl(p) for p in glob.glob(os.path.join(d, "probe_rank*.json"))}
    txt = keep(os.path.join(d, "job.out"), os.path.join(RAW, "slurm", "la-ws", "job.out"))
    st = min(p["t0"] for p in pr.values())
    t_err = min(p["t_pg_err"] for p in pr.values() if p.get("t_pg_err")) - st
    H.append({"id": "sl-ws", "sys": "slurm", "short": "Slurm: wrong WORLD_SIZE", "label": "WORLD_SIZE=4 with 3 processes",
              "what": "No torchrun: <code>srun</code> starts 3 tasks and the script maps <code>RANK=$SLURM_PROCID</code>, but hard-codes <code>WORLD_SIZE=4</code> (<code>la_ws.sbatch</code>). All three call <code>init_process_group(env://)</code>; rank 0 hosts the store.",
              "timeout": "(the process group timeout: 120 s in the running example, 30 minutes by default). Ranks 1 and 2 print:",
              "t_err": round(t_err, 1), "err": tail_err(txt, 4, r"timed out after|DistStoreError"),
              "after": "The key they waited for, <code>/default_pg/0//cpu//0/0</code>, is gloo's address entry for a rank that does not exist. Rank 0 never errors: srun terminates it after the others exit.",
              "src": "Raw log: <code>src/launch/raw_scrubbed/slurm/la-ws/job.out</code>."})
    X["sl_ws_s"] = round(t_err, 1)

    # ---- 8. a rank stuck after start ----
    d = os.path.join(k8, "la-stall"); rr = os.path.join(kr, "la-stall")
    pr = {jl(p)["rank"]: jl(p) for p in glob.glob(os.path.join(rr, "probe_rank*.json"))}
    s1 = max(json.loads(l)["ts"] for l in open(os.path.join(rr, "rank0.jsonl")) if '"step"' in l)
    errs = sorted((p["t_err"], r, p["error"]) for r, p in pr.items() if p.get("t_err"))
    t_err = errs[0][0] - s1
    logs = {}
    for f in glob.glob(os.path.join(d, "la-stall-node-0-*.log")):
        idx = re.search(r"node-0-(\d)", f).group(1)
        logs[idx] = keep(f, os.path.join(RAW, "k8s", "la-stall", f"pod{idx}.log"))
    errtxt = "\n".join(f"rank {r} (+{t - s1:.1f} s): {scrub(e)}" for t, r, e in errs)
    H.append({"id": "k8s-stall", "sys": "k8s", "short": "Kubernetes: rank stuck", "label": "one rank stalls after step 1",
              "what": "All four ranks start and run step 1; then rank 3 stalls (<code>--slow-rank 3 --slow-ms 600000</code>). The others enter step 2 and wait for it inside DDP's collectives.",
              "timeout": "(the process group timeout, <code>--timeout-s 60</code> here; 30 minutes by default for gloo, 10 for NCCL). Time measured from step 1. Each waiting rank reports something different:",
              "t_err": round(t_err, 1), "err": errtxt,
              "after": "All three timed out within a few milliseconds of each other, 60 s after step 1. Rank 0's message blames a crash of a remote worker: another rank's timeout had just closed its connections, so the message describes a consequence, not the cause. torchrun's summary on each pod names a \"Root Cause (first observed failure)\": rank 0 on pod 0 and rank 2 on pod 1. The stalled rank 3 appears only as \"exitcode: -15 (SIGTERM)\", killed by its agent. The real culprit is the rank that is behind, which the flight recorder below shows.",
              "src": "Raw logs: <code>src/launch/raw_scrubbed/k8s/la-stall/</code>."})
    X["stall_s"] = round(t_err, 1)

    # ---- summary table ----
    rows = "".join(f'<tr><td data-h="Case"><b>{h["short"]}</b></td><td data-h="First error after">{h["t_err"]:.0f} s</td><td data-h="Governed by">{h["gov"] if "gov" in h else ""}</td></tr>' for h in H)
    json.dump(H, open(os.path.join(OUT, "hangs.json"), "w"), indent=1)
    json.dump(X, open(os.path.join(OUT, "hangs_numbers.json"), "w"), indent=1)
    print("hangs", len(H), X)


if __name__ == "__main__":
    main()
