"""CPU scheduling reference (OSTEP chapters 7, 8 and 9).

One tick-based engine for FIFO, SJF, STCF, round robin and a simplified CFS, and a line-by-line port of
OSTEP's mlfq.py for MLFQ. Time is in ticks. A job is {'id', 'arrive', 'run', 'io', 'nice'}: io > 0 means
the job blocks for io_time ticks after every io ticks of CPU (an interactive job).

Conventions (the page states them): at each tick, jobs arriving at that tick are queued first (in id order),
then jobs whose I/O finished, then a job preempted at the end of the previous tick (so a newcomer goes ahead
of the job that just used up its slice). Ties go to the job queued first.
"""

# Linux v5.10 kernel/sched/core.c line 8457: sched_prio_to_weight[40], nice -20 .. 19
NICE_WEIGHT = [88761, 71755, 56483, 46273, 36291, 29154, 23254, 18705, 14949, 11916,
               9548, 7620, 6100, 4904, 3906, 3121, 2501, 1991, 1586, 1277,
               1024, 820, 655, 526, 423, 335, 272, 215, 172, 137,
               110, 87, 70, 56, 45, 36, 29, 23, 18, 15]


def weight(nice):
    return NICE_WEIGHT[nice + 20]


def schedule(jobs, policy, q=4, io_time=5, latency=48, min_gran=6):
    n = len(jobs)
    S = [{"rem": j["run"], "burst": 0, "first": -1, "end": -1, "io_until": -1, "vr": 0.0, "blocked": 0}
         for j in jobs]
    W = [weight(j.get("nice", 0)) for j in jobs]
    queue, cur, used, pending, t = [], None, 0, None, 0
    rq_min, timeline, done = 0.0, [], 0
    limit = sum(j["run"] for j in jobs) * (1 + io_time) + max(j["arrive"] for j in jobs) + 10
    while done < n and t < limit:
        # 1. events at time t
        for i in range(n):
            if jobs[i]["arrive"] == t:
                if policy == "CFS":
                    # place_entity(initial=1) with START_DEBIT: one virtual slice after min_vruntime
                    nr = len(queue) + (cur is not None) + 1
                    sumw = W[i] + sum(W[k] for k in queue) + (W[cur] if cur is not None else 0)
                    S[i]["vr"] = max(S[i]["vr"], rq_min + period(nr, latency, min_gran) * W[i] / sumw * 1024.0 / W[i])
                queue.append(i)
        for i in range(n):
            if S[i]["io_until"] == t:
                S[i]["io_until"] = -1
                if policy == "CFS":
                    S[i]["vr"] = max(S[i]["vr"], rq_min - latency / 2.0)
                queue.append(i)
        if pending is not None:
            queue.append(pending)
            pending = None
        # 2. choose
        if policy == "STCF" and cur is not None and queue:
            best = min(queue, key=lambda i: (S[i]["rem"], queue.index(i)))
            if S[best]["rem"] < S[cur]["rem"]:
                queue.append(cur)
                cur = None
        if cur is None and queue:
            if policy in ("FIFO", "RR"):
                k = 0
            elif policy in ("SJF", "STCF"):
                k = min(range(len(queue)), key=lambda x: (S[queue[x]]["rem"], x))
            elif policy == "CFS":
                k = min(range(len(queue)), key=lambda x: (S[queue[x]]["vr"], x))
            else:
                raise ValueError(policy)
            cur = queue.pop(k)
            used = 0
        if cur is None:
            timeline.append(-1)
            for i in range(n):
                if S[i]["io_until"] > t:
                    S[i]["blocked"] += 1
            t += 1
            continue
        # 3. run one tick
        s = S[cur]
        if s["first"] < 0:
            s["first"] = t
        timeline.append(cur)
        s["rem"] -= 1
        s["burst"] += 1
        used += 1
        s["vr"] += 1024.0 / W[cur]
        for i in range(n):
            if S[i]["io_until"] > t:
                S[i]["blocked"] += 1
        t += 1
        if policy == "CFS":
            run_vr = [S[i]["vr"] for i in queue] + [s["vr"]]
            rq_min = max(rq_min, min(run_vr))
        io = jobs[cur].get("io", 0)
        if s["rem"] == 0:
            s["end"] = t
            done += 1
            cur = None
        elif io and s["burst"] == io:
            s["burst"] = 0
            s["io_until"] = t + io_time
            cur = None
        elif policy == "RR" and used >= q:
            pending = cur
            cur = None
        elif policy == "CFS" and cfs_preempt(S, W, queue, cur, used, latency, min_gran):
            pending = cur
            cur = None
    return finish(jobs, S, timeline)


def period(nr, latency, min_gran):
    """__sched_period, kernel/sched/fair.c line 687 (v5.10): stretch the period past sched_nr_latency tasks."""
    return latency if nr <= latency // min_gran else nr * min_gran


def cfs_preempt(S, W, queue, cur, used, latency, min_gran):
    """check_preempt_tick, fair.c line 4355 (v5.10), evaluated at the end of every tick.
    Rule 1: the task has run its slice, sched_slice (fair.c line 701) = period x weight / total weight,
    recomputed with the tasks runnable now (the kernel's test is '>' on nanoseconds; with whole ticks we use '>=').
    Rule 2: after min_granularity, preempt if its vruntime is ahead of the leftmost task's by more than a slice."""
    if not queue:
        return False
    nr = len(queue) + 1
    sumw = W[cur] + sum(W[i] for i in queue)
    ideal = period(nr, latency, min_gran) * W[cur] / sumw
    if used >= ideal - 1e-9:
        return True
    if used < min_gran:
        return False
    left = min(S[i]["vr"] for i in queue)
    return S[cur]["vr"] - left > ideal


def finish(jobs, S, timeline):
    rows = []
    for j, s in zip(jobs, S):
        ta = s["end"] - j["arrive"]
        rows.append({"id": j["id"], "turnaround": ta, "response": s["first"] - j["arrive"],
                     "wait": ta - j["run"] - s["blocked"]})
    n = len(rows)
    avg = {k: round(sum(r[k] for r in rows) / n, 4) for k in ("turnaround", "response", "wait")}
    return {"timeline": timeline, "jobs": rows, "avg": avg}


def mlfq(jobs, quanta=(10, 10, 10), allot=(1, 1, 1), boost=0, io_time=5):
    """Port of OSTEP cpu-sched-mlfq/mlfq.py (no -S, no -I). quanta and allot are listed high priority first."""
    nq = len(quanta)
    quantum = {nq - 1 - i: quanta[i] for i in range(nq)}
    allotment = {nq - 1 - i: allot[i] for i in range(nq)}
    hi = nq - 1
    queue = {k: [] for k in range(nq)}
    J = []
    io_done = {}
    for j in jobs:
        J.append({"cur": hi, "ticks": quantum[hi], "allot": allotment[hi], "start": j["arrive"], "run": j["run"],
                  "left": j["run"], "io": j.get("io", 0), "doingIO": True, "first": -1, "end": -1})
        io_done.setdefault(j["arrive"], []).append((len(J) - 1, "BEGIN"))
    t, fin, timeline, levels, blocked = 0, 0, [], [], [0] * len(J)
    while fin < len(J):
        if boost > 0 and t != 0 and t % boost == 0:
            for k in range(nq - 1):
                for j in queue[k]:
                    if not J[j]["doingIO"]:
                        queue[hi].append(j)
                queue[k] = []
            for j in J:
                if j["left"] > 0:
                    j["cur"], j["ticks"], j["allot"] = hi, quantum[hi], allotment[hi]
        if t in io_done:
            for (j, kind) in io_done[t]:
                J[j]["doingIO"] = False
                queue[J[j]["cur"]].append(j)
        cq = -1
        for k in range(hi, -1, -1):
            if queue[k]:
                cq = k
                break
        if cq == -1:
            timeline.append(-1)
            levels.append(-1)
            for i, j in enumerate(J):
                if j["doingIO"] and j["start"] <= t and j["left"] > 0:
                    blocked[i] += 1
            t += 1
            continue
        c = queue[cq][0]
        j = J[c]
        j["left"] -= 1
        j["ticks"] -= 1
        if j["first"] == -1:
            j["first"] = t
        timeline.append(c)
        levels.append(cq)
        for i, x in enumerate(J):
            if i != c and x["doingIO"] and x["start"] <= t and x["left"] > 0:
                blocked[i] += 1
        t += 1
        if j["left"] == 0:
            j["end"] = t
            fin += 1
            queue[cq].pop(0)
            continue
        issued = False
        if j["io"] > 0 and (j["run"] - j["left"]) % j["io"] == 0:
            issued = True
            queue[cq].pop(0)
            j["doingIO"] = True
            io_done.setdefault(t + io_time, []).append((c, "IO"))
        if j["ticks"] == 0:
            if not issued:
                queue[cq].pop(0)
            j["allot"] -= 1
            if j["allot"] == 0:
                if cq > 0:
                    j["cur"], j["ticks"], j["allot"] = cq - 1, quantum[cq - 1], allotment[cq - 1]
                    if not issued:
                        queue[cq - 1].append(c)
                else:
                    j["ticks"], j["allot"] = quantum[cq], allotment[cq]
                    if not issued:
                        queue[cq].append(c)
            else:
                j["ticks"] = quantum[cq]
                if not issued:
                    queue[cq].append(c)
    S = [{"first": j["first"], "end": j["end"], "blocked": blocked[i]} for i, j in enumerate(J)]
    out = finish(jobs, S, timeline)
    out["levels"] = levels
    return out
