#!/usr/bin/env python3
"""Ray child page: core experiments on the topic's Ray 2.59.0 cluster (head with 0 CPUs, workers ray-w1 and
ray-w2 with 2 CPUs and an 80 MB object store each). Run as the driver on the head:

  docker exec mi-ray-head python /shared/ry/ry_core.py <section>   (section: tasks | objects | spill | fault | lineage)

Every line printed is one JSON record. Times are wall-clock on a shared laptop (Apple M1 Pro, Docker Desktop VM):
rough. Placements, counts, error types and messages are deterministic. Logs of task runs that must survive a node
loss are appended to /shared/ry/out/runs.log (the shared volume).
"""
import json, os, socket, sys, time
import numpy as np
import ray
from ray.util.scheduling_strategies import NodeAffinitySchedulingStrategy

SEC = sys.argv[1] if len(sys.argv) > 1 else "tasks"
OUT = "/shared/ry/out"
os.makedirs(OUT, exist_ok=True)
ray.init(address="auto", logging_level="ERROR", log_to_driver=False)
NODES = {n["NodeManagerHostname"]: n["NodeID"] for n in ray.nodes() if n["Alive"]}
HOST_OF = {v: k for k, v in NODES.items()}
T0 = time.time()


def emit(**kw):
    kw["t"] = round(time.time() - T0, 4)
    print(json.dumps(kw), flush=True)


def on(host, soft=False):
    return NodeAffinitySchedulingStrategy(node_id=NODES[host], soft=soft)


def runlog(tag, **kw):
    with open(os.path.join(OUT, "runs.log"), "a") as f:
        f.write(json.dumps({"tag": tag, "host": socket.gethostname(), "pid": os.getpid(), "ts": round(time.time(), 3), **kw}) + "\n")


def where(refs):
    try:
        loc = ray.experimental.get_object_locations(refs)
        return [{"nodes": sorted(HOST_OF.get(n, n) for n in v.get("node_ids", [])), "size": v.get("object_size")} for v in loc.values()]
    except Exception as e:  # noqa
        return "error: " + repr(e)[:200]


def err(e):
    s = str(e).strip().splitlines()
    return {"type": type(e).__name__, "mro": [c.__name__ for c in type(e).__mro__][:5], "msg": " | ".join(x.strip() for x in s[:6])[:900]}


@ray.remote
def noop():
    return socket.gethostname()


@ray.remote
def nap(i, s):
    t = time.time()
    time.sleep(s)
    return {"i": i, "host": socket.gethostname(), "pid": os.getpid(), "start": t, "end": time.time()}


@ray.remote
class Counter:
    def __init__(self):
        self.n = 0
    def incr(self):
        self.n += 1
        return self.n
    def host(self):
        return socket.gethostname(), os.getpid()
    def die(self):
        os._exit(1)


if SEC == "tasks":
    emit(ev="cluster", nodes=sorted(NODES), resources=ray.cluster_resources())
    ray.get([noop.remote() for _ in range(8)])  # warm the worker pools
    # 1. round trip of one tiny task, one at a time
    lat = []
    for _ in range(100):
        t = time.perf_counter(); ray.get(noop.remote()); lat.append(time.perf_counter() - t)
    emit(ev="task_rtt", n=100, median_ms=round(1000 * float(np.median(lat)), 3), p90_ms=round(1000 * float(np.percentile(lat, 90)), 3))
    # 2. 1,000 tiny tasks submitted together
    t = time.perf_counter(); hosts = ray.get([noop.remote() for _ in range(1000)]); dt = time.perf_counter() - t
    emit(ev="task_batch", n=1000, secs=round(dt, 3), per_task_ms=round(1000 * dt / 1000, 3), hosts={h: hosts.count(h) for h in sorted(set(hosts))})
    # 3. an actor: creation, then calls one at a time, then 1,000 queued calls
    t = time.perf_counter(); c = Counter.remote(); h = ray.get(c.host.remote()); dt = time.perf_counter() - t
    emit(ev="actor_create", secs=round(dt, 3), host=h[0])
    lat = []
    for _ in range(100):
        t = time.perf_counter(); ray.get(c.incr.remote()); lat.append(time.perf_counter() - t)
    emit(ev="actor_rtt", n=100, median_ms=round(1000 * float(np.median(lat)), 3), p90_ms=round(1000 * float(np.percentile(lat, 90)), 3))
    t = time.perf_counter(); vals = ray.get([c.incr.remote() for _ in range(1000)]); dt = time.perf_counter() - t
    emit(ev="actor_batch", n=1000, secs=round(dt, 3), per_call_ms=round(1000 * dt / 1000, 3), first=vals[0], last=vals[-1], ordered=vals == sorted(vals))
    ray.kill(c)
    time.sleep(1)
    # 4. eight 0.5 s tasks on 4 CPUs: submitted together, then the ray.get-in-a-loop mistake
    for mode in ("together", "get_in_loop"):
        t = time.time()
        if mode == "together":
            res = ray.get([nap.remote(i, 0.5) for i in range(8)])
        else:
            res = [ray.get(nap.remote(i, 0.5)) for i in range(8)]
        dt = time.time() - t
        emit(ev="naps", mode=mode, secs=round(dt, 3), tasks=[{"i": r["i"], "host": r["host"], "pid": r["pid"], "s": round(r["start"] - t, 3), "e": round(r["end"] - t, 3)} for r in res])
    # 5. where the default (hybrid) policy and SPREAD put 4 one-CPU tasks of 1 s
    for strat in ("DEFAULT", "SPREAD"):
        t = time.time()
        res = ray.get([nap.options(scheduling_strategy=strat).remote(i, 1.0) for i in range(4)])
        emit(ev="placement", strategy=strat, hosts=[r["host"] for r in res])
    emit(ev="end")

elif SEC == "objects":
    @ray.remote
    def make(nbytes):
        return np.ones(nbytes // 8, dtype=np.float64)

    @ray.remote
    def total(a):
        return float(a.sum()), socket.gethostname()

    # 1. small results come back inline; big ones live in the producing node's object store
    small = make.options(scheduling_strategy=on("ray-w1")).remote(1024)
    big = make.options(scheduling_strategy=on("ray-w1")).remote(1 << 20)
    ray.wait([small, big], num_returns=2, fetch_local=False)
    emit(ev="locations_before_get", small=where([small]), big=where([big]))
    a = ray.get(big)
    emit(ev="get_big", writeable=bool(a.flags.writeable), owndata=bool(a.flags.owndata), nbytes=int(a.nbytes))
    emit(ev="locations_after_get", big=where([big]))
    try:
        a[0] = 2.0
        emit(ev="write_readonly", ok=True)
    except Exception as e:
        emit(ev="write_readonly", ok=False, **err(e))
    del a
    # 2. ray.put from the driver: the object goes to the driver's node (the head)
    p = ray.put(np.ones((4 << 20) // 8))
    emit(ev="put_location", where=where([p]))
    # 3. moving 16 MB between nodes: first read on w2 pulls it, second read on w2 is local, a read on w1 is local
    x = make.options(scheduling_strategy=on("ray-w1")).remote(16 << 20)
    ray.wait([x], fetch_local=False)
    for i, host in enumerate(("ray-w2", "ray-w2", "ray-w1")):
        t = time.perf_counter(); s, h = ray.get(total.options(scheduling_strategy=on(host)).remote(x)); dt = time.perf_counter() - t
        emit(ev="read16", i=i, on=h, secs=round(dt, 4), where_after=where([x]))
    # 4. passing the same big array by value N times vs putting it once
    arr = np.ones((8 << 20) // 8)
    for mode in ("by_value", "put_once"):
        t = time.perf_counter()
        if mode == "by_value":
            ray.get([total.remote(arr) for _ in range(4)])
        else:
            r = ray.put(arr); ray.get([total.remote(r) for _ in range(4)])
        emit(ev="pass_array", mode=mode, n=4, mb=8, secs=round(time.perf_counter() - t, 4))
    emit(ev="end")

elif SEC == "spill":
    @ray.remote
    def make(i, nbytes):
        return np.full(nbytes // 8, float(i))

    @ray.remote
    def first(a):
        return float(a[0]), socket.gethostname()

    MB = 1 << 20
    refs = []
    for i in range(14):  # 14 x 8 MB = 112 MB on w1, whose store holds 80 MB (spilling starts at 80% full)
        refs.append(make.options(scheduling_strategy=on("ray-w1")).remote(i, 8 * MB))
        ray.wait([refs[-1]], fetch_local=False)
        emit(ev="made", i=i, mb=8)
    time.sleep(2)
    emit(ev="all_made", n=len(refs))
    # read every object back on w1, oldest first: early ones were spilled and must be restored from disk
    for i, r in enumerate(refs):
        t = time.perf_counter(); v, h = ray.get(first.options(scheduling_strategy=on("ray-w1")).remote(r)); dt = time.perf_counter() - t
        emit(ev="read", i=i, value=v, on=h, secs=round(dt, 4))
    emit(ev="end")

elif SEC == "fault":
    MARK = "/shared/ry/marks"
    os.makedirs(MARK, exist_ok=True)
    for f in os.listdir(MARK):
        os.remove(os.path.join(MARK, f))

    def attempt(tag):
        p = os.path.join(MARK, tag)
        n = int(open(p).read()) + 1 if os.path.exists(p) else 1
        open(p, "w").write(str(n))
        return n

    @ray.remote
    def crash_first(tag):
        n = attempt(tag)
        if n == 1:
            os._exit(1)  # the worker process dies, as on a segfault or an OOM kill
        return {"attempts": n, "host": socket.gethostname()}

    @ray.remote
    def raise_first(tag):
        n = attempt(tag)
        if n == 1:
            raise ValueError("bad batch in shard 7")
        return {"attempts": n, "host": socket.gethostname()}

    cases = [("crash_default", crash_first, {}), ("crash_max_retries_0", crash_first, {"max_retries": 0}),
             ("raise_default", raise_first, {}), ("raise_retry_exceptions", raise_first, {"retry_exceptions": True})]
    for tag, fn, opts in cases:
        t = time.time()
        try:
            r = ray.get(fn.options(**opts).remote(tag))
            emit(ev="task_fault", case=tag, opts=opts, ok=True, result=r, secs=round(time.time() - t, 3))
        except Exception as e:
            emit(ev="task_fault", case=tag, opts=opts, ok=False, attempts=int(open(os.path.join(MARK, tag)).read()), secs=round(time.time() - t, 3), **err(e))
    # actors: state is lost on restart
    for tag, opts in (("actor_restart_1", {"max_restarts": 1}), ("actor_restart_0", {})):
        c = Counter.options(**opts).remote()
        vals = [ray.get(c.incr.remote()) for _ in range(3)]
        h0 = ray.get(c.host.remote())
        rec = {"case": tag, "opts": opts, "before": vals, "host_pid_before": h0}
        try:
            ray.get(c.die.remote())
        except Exception as e:
            rec["die_call"] = err(e)
        t = time.time()
        try:
            rec["after"] = ray.get(c.incr.remote())
            rec["host_pid_after"] = ray.get(c.host.remote())
        except Exception as e:
            rec["after_error"] = err(e)
        rec["secs"] = round(time.time() - t, 3)
        emit(ev="actor_fault", **rec)
        ray.kill(c)
    emit(ev="end")

elif SEC == "lineage":
    # Objects and actors with something on ray-w2; the host script kills ray-w2 after READY, then touches GO.
    MB = 1 << 20

    @ray.remote
    def produce(tag, nbytes):
        runlog(tag, ev="run")
        return np.full(nbytes // 8, 7.0)

    @ray.remote
    def produce_nested(tag, nbytes):
        runlog(tag, ev="run")
        return [ray.put(np.full(nbytes // 8, 7.0))]  # the inner object is owned by this worker

    soft2 = on("ray-w2", soft=True)
    A = produce.options(scheduling_strategy=soft2).remote("A_task_output", 8 * MB)
    B = produce.options(scheduling_strategy=soft2, max_retries=0).remote("B_task_output_no_retries", 8 * MB)
    C_outer = produce_nested.options(scheduling_strategy=soft2).remote("C_put_inside_task", 8 * MB)
    D = produce.options(scheduling_strategy=soft2).remote("D_small_inline", 1024)
    ray.wait([A, B, C_outer, D], num_returns=4, fetch_local=False)
    C = ray.get(C_outer)[0]
    act1 = Counter.options(max_restarts=1, scheduling_strategy=soft2).remote()
    act0 = Counter.options(scheduling_strategy=soft2).remote()
    for a in (act1, act0):
        [ray.get(a.incr.remote()) for _ in range(5)]
    emit(ev="placed", A=where([A]), B=where([B]), C=where([C]), D=where([D]),
         act1=ray.get(act1.host.remote()), act0=ray.get(act0.host.remote()))
    print("READY", flush=True)
    go = "/shared/ry/GO"
    while not os.path.exists(go):
        time.sleep(0.2)
    emit(ev="go", ts=time.time())
    for name, ref in (("D_small_inline", D), ("A_task_output", A), ("B_task_output_no_retries", B), ("C_put_inside_task", C)):
        t = time.time()
        try:
            v = ray.get(ref, timeout=120)
            emit(ev="get", obj=name, ok=True, secs=round(time.time() - t, 3), value=float(v[0]), where=where([ref]))
        except Exception as e:
            emit(ev="get", obj=name, ok=False, secs=round(time.time() - t, 3), **err(e))
    for name, a in (("actor_max_restarts_1", act1), ("actor_max_restarts_0", act0)):
        t = time.time()
        try:
            v = ray.get(a.incr.remote(), timeout=120)
            emit(ev="actor_after", actor=name, ok=True, value=v, host_pid=ray.get(a.host.remote()), secs=round(time.time() - t, 3))
        except Exception as e:
            emit(ev="actor_after", actor=name, ok=False, secs=round(time.time() - t, 3), **err(e))
    emit(ev="end")
