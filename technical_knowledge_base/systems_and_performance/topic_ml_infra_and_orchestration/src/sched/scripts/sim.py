"""A small batch-scheduler simulator for the Scheduling lab (run: python3 -I sim.py).

One pool of identical units (GPUs), jobs with a size, a true runtime and a time limit (what the scheduler
believes), submitted at given times. Policies:
  fifo          strict priority order: the first job that does not fit blocks everything behind it
                (what Slurm's sched/builtin does within one partition)
  easy          EASY backfill: only the first blocked job gets a reservation; a later job may start now if it
                fits now and does not delay that one reservation
  conservative  every blocked job gets a reservation in priority order; a later job may start now only if it
                delays none of them (what Slurm's sched/backfill does, up to bf_max_job_test jobs)
Priority is submit order unless a job carries a 'prio' (higher first), which the fairshare scenario sets
from Slurm's own sprio numbers. The scheduler replans at every submit and every job end (Slurm replans every
bf_interval seconds; with whole-minute jobs that difference does not change the order).
The page's JavaScript (parts/31_js_sc_2sim.js) is a line-by-line port; check_sim.mjs compares the two.
"""
import json, os, sys


class Profile:
    """Free capacity as a step function: free[i] units are free from T[i] to T[i+1] (the last step never ends)."""

    def __init__(self, now, cap):
        self.T, self.F = [now], [cap]

    def _cut(self, x):
        i = 0
        while i < len(self.T) and self.T[i] < x:
            i += 1
        if i < len(self.T) and self.T[i] == x:
            return i
        self.T.insert(i, x)
        self.F.insert(i, self.F[i - 1])
        return i

    def reserve(self, s, e, size):
        i, j = self._cut(s), self._cut(e)
        for k in range(i, j):
            self.F[k] -= size

    def earliest(self, size, dur):
        """The earliest breakpoint s with at least `size` free on [s, s+dur)."""
        T, F, n = self.T, self.F, len(self.T)
        i = 0
        while i < n:
            if F[i] < size:
                i += 1
                continue
            s, j, ok = T[i], i, True
            while j < n and T[j] < s + dur:
                if F[j] < size:
                    ok = False
                    break
                j += 1
            if ok:
                return s
            i = j + 1
        return None


def simulate(jobs, cap, policy):
    """jobs: list of dicts {name, size, run, limit, submit, prio?}. Returns {name: [start, end]} and metrics."""
    jobs = [dict(j) for j in jobs]
    for i, j in enumerate(jobs):
        j.setdefault("prio", 0)
        j["run"] = min(j["run"], j["limit"])  # a job is killed at its time limit
        j["idx"] = i
    t = 0
    pending, running, sched = [], [], {}
    arrivals = sorted(jobs, key=lambda j: (j["submit"], j["idx"]))
    guard = 0
    while arrivals or pending or running:
        guard += 1
        if guard > 100000:
            raise RuntimeError("no progress")
        while arrivals and arrivals[0]["submit"] <= t:
            pending.append(arrivals.pop(0))
        pending.sort(key=lambda j: (-j["prio"], j["submit"], j["idx"]))
        # one scheduling pass at time t
        free = cap - sum(r["size"] for r in running)
        if policy == "fifo":
            while pending and pending[0]["size"] <= free:
                j = pending.pop(0)
                start(j, t, running, sched)
                free -= j["size"]
        else:
            # running jobs occupy capacity until their LIMIT (the scheduler does not know true runtimes)
            prof = Profile(t, cap)
            for r in running:
                prof.reserve(t, r["lend"], r["size"])
            reserved = 0
            for j in list(pending):
                s = prof.earliest(j["size"], j["limit"])
                if s == t:
                    pending.remove(j)
                    start(j, t, running, sched)
                    prof.reserve(t, t + j["limit"], j["size"])
                elif policy == "conservative" or reserved == 0:
                    prof.reserve(s, s + j["limit"], j["size"])
                    reserved += 1
        # advance to the next event
        nxt = [r["end"] for r in running] + ([arrivals[0]["submit"]] if arrivals else [])
        if not nxt:
            if pending:
                raise RuntimeError("job larger than the cluster: " + pending[0]["name"])
            break
        t = min(nxt)
        for r in [r for r in running if r["end"] == t]:
            running.remove(r)
    return sched, metrics(jobs, sched, cap)


def start(j, t, running, sched):
    running.append({"name": j["name"], "size": j["size"], "end": t + j["run"], "lend": t + j["limit"]})
    sched[j["name"]] = [t, t + j["run"]]


def metrics(jobs, sched, cap):
    t0 = min(j["submit"] for j in jobs)
    mk = max(e for (_, e) in sched.values())
    busy = sum(j["size"] * j["run"] for j in jobs)
    waits = [sched[j["name"]][0] - j["submit"] for j in jobs]
    return {"makespan": mk - t0, "util": round(busy / (cap * (mk - t0)), 4),
            "mean_wait": round(sum(waits) / len(waits), 4), "max_wait": max(waits)}


def simulate_nodes(jobs, nodes, per_node):
    """Slurm-like conservative backfill: GPUs live on nodes, and a future reservation blocks its WHOLE nodes for its
    window (backfill.c: bit_not(avail_bitmap) then _add_reservation, lines 3527 and 3557 at slurm-24-11-5-1).
    Placement: the first node (in order) that can hold the whole job, else nodes in order taking what each has.
    Returns {name: [start, end, {node: gpus}]}."""
    jobs = [dict(j) for j in jobs]
    for i, j in enumerate(jobs):
        j.setdefault("prio", 0)
        j["idx"] = i
        j["run"] = min(j["run"], j["limit"])
    t = 0
    pending, running, sched = [], [], {}
    arrivals = sorted(jobs, key=lambda j: (j["submit"], j["idx"]))
    while arrivals or pending or running:
        while arrivals and arrivals[0]["submit"] <= t:
            pending.append(arrivals.pop(0))
        pending.sort(key=lambda j: (-j["prio"], j["submit"], j["idx"]))
        resv = []  # (start, end, set of nodes)

        def free_on(n, a, b):
            """GPUs free on node n during all of [a, b) given running jobs (held until their limit)."""
            used = sum(r["on"].get(n, 0) for r in running if r["lend"] > a)
            return per_node - used

        def place(size, a, b):
            ok = [n for n in range(nodes) if not any(s0 < b and a < e0 and n in ns for (s0, e0, ns) in resv)]
            for n in ok:
                if free_on(n, a, b) >= size:
                    return {n: size}
            got, need = {}, size
            for n in ok:
                f = free_on(n, a, b)
                if f > 0 and need > 0:
                    got[n] = min(f, need)
                    need -= got[n]
            return got if need == 0 else None

        for j in list(pending):
            cands = sorted({t} | {r["lend"] for r in running if r["lend"] > t} | {e for (_, e, _) in resv if e > t})
            for s in cands:
                on = place(j["size"], s, s + j["limit"])
                if on is not None:
                    break
            if s == t:
                pending.remove(j)
                running.append({"name": j["name"], "end": t + j["run"], "lend": t + j["limit"], "on": on})
                sched[j["name"]] = [t, t + j["run"], {"c%d" % (n + 1): g for n, g in on.items()}]
            else:
                resv.append((s, s + j["limit"], set(on)))
        nxt = [r["end"] for r in running] + ([arrivals[0]["submit"]] if arrivals else [])
        if not nxt:
            break
        t = min(nxt)
        running = [r for r in running if r["end"] != t]
    return sched


def rng(seed):
    """mulberry32, the same in the page's JavaScript."""
    a = seed & 0xFFFFFFFF

    def imul(x, y):
        return (x * y) & 0xFFFFFFFF

    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def gen_workload(cap, n, load, pad, seed):
    """An illustrative synthetic workload (see the page's genWorkload): sizes 1..cap/4 GPUs in powers of two with
    weights 1, 1/2, 1/3, ...; runtimes log-uniform 10 min to 24 h; Poisson arrivals at offered load `load`;
    limit = runtime x U[1, pad]."""
    import math
    r = rng(seed)
    sizes = []
    s = 1
    while s <= cap / 4:
        sizes.append(s)
        s *= 2
    w = [1 / (i + 1) for i in range(len(sizes))]
    ws = sum(w)
    raw = []
    for _ in range(n):
        u, k = r() * ws, 0
        while u > w[k] and k < len(w) - 1:
            u -= w[k]
            k += 1
        run = round(math.exp(math.log(10) + r() * (math.log(1440) - math.log(10))))
        f = 1 + r() * (pad - 1)
        gap = -math.log(1 - r())
        raw.append((sizes[k], run, f, gap))
    work = sum(x[0] * x[1] for x in raw)
    mean_gap = work / (cap * load) / n
    jobs, t = [], 0.0
    for i, x in enumerate(raw):
        t += x[3] * mean_gap
        jobs.append({"name": "j%d" % i, "size": x[0], "run": x[1], "limit": math.ceil(x[1] * x[2]), "submit": jsround(t)})
    return jobs


def jsround(x):
    """JavaScript's Math.round (halves round up), not Python's banker's rounding."""
    import math
    return math.floor(x + 0.5)


# The backfill workload: the Reading tab's eight jobs (name, GPUs, minutes), all submitted at t=0, on 8 GPUs.
W1 = [("A", 4, 6), ("B", 6, 4), ("C", 2, 3), ("D", 1, 2), ("E", 4, 5), ("F", 2, 7), ("G", 1, 1), ("H", 3, 2)]


def w1(pad=1.0):
    return [{"name": n, "size": s, "run": r, "limit": max(1, round(r * pad)), "submit": 0} for (n, s, r) in W1]


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = {}
    for pol in ("fifo", "easy", "conservative"):
        sched, m = simulate(w1(), 8, pol)
        out["w1_" + pol] = {"sched": sched, "m": m}
        print(pol, m, sched)
    # the same queue when job D asks for 4x its runtime
    for pol in ("easy", "conservative"):
        jobs = w1()
        for j in jobs:
            if j["name"] == "D":
                j["limit"] = 8
        sched, m = simulate(jobs, 8, pol)
        out["w1pad_" + pol] = {"sched": sched, "m": m}
        print("D limit 8", pol, m, sched)
    out["w1_slurmlike"] = simulate_nodes(w1(), 2, 4)
    print("slurm-like", out["w1_slurmlike"])
    # the scale-up panel's default: 256 GPUs, 300 jobs, load 0.9, limits up to 3x runtime, seed 7
    for pad in (1.0, 3.0):
        jobs = gen_workload(256, 300, 0.9, pad, 7)
        for pol in ("fifo", "easy", "conservative"):
            sched, m = simulate(jobs, 256, pol)
            out["scale_pad%g_%s" % (pad, pol)] = {"m": m, "first": [jobs[0], jobs[1]], "j17": sched["j17"]}
            print("scale pad", pad, pol, m)
    with open(os.path.join(here, "..", "out", "sim_w1.json"), "w") as f:
        json.dump(out, f, indent=1, sort_keys=True)
