"""Reference model of one CPU's fair-class run queue under Linux 5.10 CFS and Linux 6.12 EEVDF.

The page's JavaScript (parts/30_js_fair_core.js) implements the same model; check_sim.mjs runs both on the same
scenarios and requires identical schedules. Every rule cites the kernel source it follows (inputs/kernel_extract.txt).

Model: one CPU; time in microseconds; a scheduler tick every 1,000 us (CONFIG_HZ=1000, as on the VM);
preemption takes effect at once (CONFIG_PREEMPT=y). Tasks are busy loops ("hog") or periodic: run `run` us of CPU,
then sleep `sleep` us, first waking at `start`. Weights from sched_prio_to_weight (core.c).
Left out: multiple CPUs and load balancing, group scheduling, PELT, the last buddy (needs 8 or more runnable tasks),
sched_yield, migration. Float arithmetic instead of the kernel's fixed point (differences of nanoseconds).
"""
import json, sys

WEIGHT = {-20: 88761, -19: 71755, -18: 56483, -17: 46273, -16: 36291, -15: 29154, -14: 23254, -13: 18705, -12: 14949,
          -11: 11916, -10: 9548, -9: 7620, -8: 6100, -7: 4904, -6: 3906, -5: 3121, -4: 2501, -3: 1991, -2: 1586, -1: 1277,
          0: 1024, 1: 820, 2: 655, 3: 526, 4: 423, 5: 335, 6: 272, 7: 215, 8: 172, 9: 137, 10: 110, 11: 87, 12: 70,
          13: 56, 14: 45, 15: 36, 16: 29, 17: 23, 18: 18, 19: 15}
TICK = 1000
EPS = 1e-9


def simulate(policy, tasks, horizon, factor=3):
    """policy 'cfs' (v5.10) or 'eevdf' (v6.12). factor = 1 + ilog2(min(CPUs, 8)): 3 on the VM's 5 CPUs."""
    lat, gmin, wgran = 6000 * factor, 750 * factor, 1000 * factor          # fair.c v5.10 lines 38, 59, 82 (x factor)
    base_slice = 750 * factor                                             # fair.c v6.12 line 76 (x factor)
    T = []
    for i, t in enumerate(tasks):
        T.append(dict(i=i, name=t["name"], w=WEIGHT[t.get("nice", 0)], hog=t.get("run") is None,
                      run=t.get("run"), sleep=t.get("sleep"), start=t.get("start", 0),
                      slice=min(100000, max(100, t["slice"])) if t.get("slice") else base_slice,
                      v=0.0, d=0.0, vlag=0.0, mark=None, delayed=False, on_rq=False, left=0.0,
                      sum=0.0, prev_sum=0.0, wake_t=None, waits=[], exec=0.0))
    S = dict(t=0.0, curr=None, min_vr=0.0, next=None, segs=[], log=[], snaps=[], switches=0, exec_start=0.0)
    rq = lambda: [x for x in T if x["on_rq"]]
    tree = lambda: [x for x in T if x["on_rq"] and x is not S["curr"]]

    def snap(kind, task, note=""):
        S["snaps"].append(dict(t=round(S["t"], 3), kind=kind, task=task, note=note,
                               curr=S["curr"]["i"] if S["curr"] else -1, V=round(avg_v(), 3) if policy == "eevdf" else None,
                               min_vr=round(S["min_vr"], 3),
                               tasks=[dict(v=round(x["v"], 3), d=round(x["d"], 3), on=x["on_rq"], dl=x["delayed"],
                                           sum=round(x["sum"], 3)) for x in T]))

    # ---------- shared ----------
    def update_min_vr():                       # v5.10 fair.c 540; v6.12 761 (same idea: max(min_vr, min(curr, leftmost)))
        c = S["curr"] if S["curr"] and S["curr"]["on_rq"] else None
        cand = [x["v"] for x in tree()]
        v = S["min_vr"]
        if c: v = c["v"]
        if cand: v = min(cand) if not c else min(v, min(cand))
        S["min_vr"] = max(S["min_vr"], v)

    def update_curr():                          # v5.10 fair.c 842; v6.12 fair.c 1216
        c = S["curr"]
        if not c: return False
        delta = S["t"] - S["exec_start"]
        if delta <= 0: return False
        S["exec_start"] = S["t"]; c["sum"] += delta
        c["v"] += delta * 1024 / c["w"]
        res = False
        if policy == "eevdf" and c["v"] - c["d"] >= -EPS:     # update_deadline, v6.12 fair.c 1007
            c["d"] = c["v"] + c["slice"] * 1024 / c["w"]; res = True
        update_min_vr()
        if policy == "eevdf":
            if len(rq()) == 1: return False
            if res or did_preempt_short(c): return True
        return False

    # ---------- EEVDF helpers (v6.12) ----------
    def avg_v():                                # avg_vruntime, fair.c 653: weighted mean of v over the run queue
        q = rq()
        if not q: return S["min_vr"]
        return sum(x["v"] * x["w"] for x in q) / sum(x["w"] for x in q)

    def eligible(e):                            # vruntime_eligible, fair.c 726: lag >= 0, i.e. V >= v
        q = rq()
        return sum((x["v"] - e["v"]) * x["w"] for x in q) >= -EPS

    def protected(c):                           # RUN_TO_PARITY: set_next_entity stashes the deadline in vlag (fair.c 5578)
        return c["mark"] is not None and c["mark"] == c["d"]

    def did_preempt_short(c):                   # fair.c 1166
        return (not protected(c)) and not eligible(c)

    def do_preempt_short(p, c):                 # fair.c 1177
        if p["slice"] >= c["slice"]: return False
        if not eligible(p): return False
        if p["d"] < c["d"]: return True
        return not eligible(c)

    def pick_eevdf():                           # fair.c 907
        q = rq()
        if len(q) == 1: return q[0]
        c = S["curr"] if S["curr"] and S["curr"]["on_rq"] and eligible(S["curr"]) else None
        if c and protected(c): return c
        el = sorted([x for x in tree() if eligible(x)], key=lambda x: (x["d"], x["i"]))
        best = el[0] if el else None
        if not best or (c and c["d"] < best["d"]): best = c
        return best

    def entity_lag(e):                          # fair.c 702: clamp(V - v, +-limit), limit = max(2 slice, tick) / w
        lim = max(2 * e["slice"], TICK) * 1024 / e["w"]
        return max(-lim, min(lim, avg_v() - e["v"]))

    def place(e, initial):                      # place_entity, fair.c 5266 (e not yet on the run queue)
        V = avg_v(); lag = 0.0
        q = rq()
        if q:
            load = sum(x["w"] for x in q)
            lag = e["vlag"] * (load + e["w"]) / load
        e["v"] = V - lag
        vs = e["slice"] * 1024 / e["w"]
        if initial: vs /= 2                       # PLACE_DEADLINE_INITIAL
        e["d"] = e["v"] + vs

    # ---------- CFS helpers (v5.10) ----------
    def period(n): return n * gmin if n > 8 else lat          # __sched_period, fair.c 687
    def slice_of(e):                                          # sched_slice, fair.c 701
        q = rq(); n = len(q) + (0 if e["on_rq"] else 1)
        load = sum(x["w"] for x in q) + (0 if e["on_rq"] else e["w"])
        return period(n) * e["w"] / load
    def wpe(c, s):                                            # wakeup_preempt_entity, fair.c 6869
        vd = c["v"] - s["v"]
        if vd <= 0: return -1
        if vd > wgran * 1024 / s["w"]: return 1
        return 0

    def pick_cfs():                                           # pick_next_entity, fair.c 4435 (no skip or last buddy)
        c = S["curr"] if S["curr"] and S["curr"]["on_rq"] else None
        tr = sorted(tree(), key=lambda x: (x["v"], x["i"]))
        left = tr[0] if tr else None
        if not left or (c and c["v"] < left["v"]): left = c
        se = left
        nx = S["next"]
        if nx and nx["on_rq"] and wpe(nx, left) < 1: se = nx
        S["next"] = None
        return se

    # ---------- the switch ----------
    def schedule(reason):
        prev = S["curr"]
        update_curr()
        while True:
            if not rq():
                S["curr"] = None; nxt = None; break
            nxt = pick_cfs() if policy == "cfs" else pick_eevdf()
            if policy == "eevdf" and nxt["delayed"]:          # pick_next_entity, fair.c 5625: finish the delayed dequeue
                nxt["vlag"] = entity_lag(nxt)
                if nxt["vlag"] > 0: nxt["vlag"] = 0.0         # DELAY_ZERO
                nxt["on_rq"] = False; nxt["delayed"] = False
                if S["curr"] is nxt: S["curr"] = None
                snap("delayed-out", nxt["i"], "a sleeping task left the run queue once it became eligible")
                continue
            break
        if nxt is not prev:
            if nxt is not None:
                S["switches"] += 1 if prev is not None else 0
                nxt["prev_sum"] = nxt["sum"]
                if policy == "eevdf": nxt["mark"] = nxt["d"]
                if nxt["wake_t"] is not None:
                    nxt["waits"].append(S["t"] - nxt["wake_t"]); nxt["wake_t"] = None
            S["curr"] = nxt
        elif nxt is not None and nxt["wake_t"] is not None:
            nxt["waits"].append(S["t"] - nxt["wake_t"]); nxt["wake_t"] = None
        S["exec_start"] = S["t"]
        snap("pick", nxt["i"] if nxt else -1, reason)

    def enqueue_wake(e):
        res = update_curr()                                   # v6.12: update_curr may itself call resched_curr
        e["wake_t"] = S["t"]
        if policy == "cfs":
            vr = S["min_vr"] - lat / 2                        # place_entity, GENTLE_FAIR_SLEEPERS, fair.c 4108
            e["v"] = max(e["v"], vr); e["on_rq"] = True
            c = S["curr"]
            if c is None: schedule("woke on an idle CPU"); return
            if wpe(c, e) == 1:                                # check_preempt_wakeup, fair.c 6916
                S["next"] = e; snap("wake", e["i"], "preempts: current is ahead by more than the wake-up granularity"); schedule("wake-up preemption")
            else:
                snap("wake", e["i"], "waits: not far enough behind the running task")
        else:
            if e["delayed"]:                                  # requeue_delayed_entity, fair.c 6919
                e["delayed"] = False
                e["vlag"] = entity_lag(e)
                if e["vlag"] > 0:
                    e["on_rq"] = False; e["vlag"] = 0.0; place(e, False); e["on_rq"] = True
            else:
                place(e, False); e["on_rq"] = True
            c = S["curr"]
            if c is None: schedule("woke on an idle CPU"); return
            if do_preempt_short(e, c) and protected(c): c["mark"] = None
            if pick_eevdf() is e:
                snap("wake", e["i"], "preempts: it is now the eligible task with the earliest deadline"); schedule("wake-up preemption")
            elif res:
                snap("wake", e["i"], "the running task had used up its slice: pick again"); schedule("slice used up")
            else:
                snap("wake", e["i"], "waits: the running task keeps its slice (RUN_TO_PARITY) or has an earlier deadline")

    def sleep_curr():
        c = S["curr"]; update_curr()
        if policy == "eevdf" and not eligible(c):             # DELAY_DEQUEUE, fair.c 5495
            c["delayed"] = True
        else:
            if policy == "eevdf": c["vlag"] = entity_lag(c)
            c["on_rq"] = False
        S["curr"] = None                                      # it gives up the CPU either way
        update_min_vr()
        snap("sleep", c["i"], "delayed dequeue: stays on the run queue until it is eligible" if c["delayed"] else "")
        schedule("the running task went to sleep")

    # ---------- initial state: busy loops runnable at t=0, in order; periodic tasks first wake at `start` ----------
    for e in T:
        if e["hog"]:
            if policy == "eevdf": place(e, True)
            else: e["v"] = S["min_vr"]
            e["on_rq"] = True
        else:
            e["wake_at"] = e["start"]; e["left"] = e["run"]
            if policy == "cfs": e["v"] = -1e12      # it has been asleep for a long time: the wake-up placement decides
    S["run_since"] = 0.0
    schedule("start")
    next_tick = TICK
    seg_start, seg_task = 0.0, (S["curr"]["i"] if S["curr"] else -1)
    while S["t"] < horizon - EPS:
        c = S["curr"]
        cand = [(next_tick, 2, -1, "tick", None), (horizon, 3, -1, "end", None)]
        if c is not None and not c["hog"]:
            cand.append((S["run_since"] + c["left"], 0, c["i"], "burst", c))
        for e in T:
            if not e["hog"] and e.get("wake_at") is not None:
                cand.append((e["wake_at"], 1, e["i"], "wake", e))
        tt, _, _, kind, who = min(cand, key=lambda x: (x[0], x[1], x[2]))
        if c is not None and not c["hog"]:
            c["left"] = max(0.0, c["left"] - (tt - S["run_since"]))
        S["t"] = tt; S["run_since"] = tt
        if kind == "end":
            break
        if kind == "burst":
            sleep_curr()
            who["wake_at"] = S["t"] + who["sleep"]; who["left"] = who["run"]
        elif kind == "wake":
            who["wake_at"] = None
            enqueue_wake(who)
        elif kind == "tick":
            next_tick += TICK
            if c is not None:
                res = update_curr()
                if policy == "cfs" and len(rq()) > 1:          # check_preempt_tick, fair.c 4355
                    ideal = slice_of(c); dex = c["sum"] - c["prev_sum"]
                    if dex > ideal + EPS: res = True
                    elif dex >= gmin - EPS:
                        tr = sorted(tree(), key=lambda x: (x["v"], x["i"]))
                        if tr and c["v"] - tr[0]["v"] > ideal + EPS: res = True
                if res:
                    snap("tick", c["i"], "slice used up" if policy == "cfs" else "slice used up: new deadline")
                    schedule("tick preemption")
        cur = S["curr"]["i"] if S["curr"] else -1
        if cur != seg_task:
            if S["t"] > seg_start + EPS: S["segs"].append([round(seg_start, 3), round(S["t"], 3), seg_task])
            seg_start, seg_task = S["t"], cur
    if S["t"] > seg_start + EPS: S["segs"].append([round(seg_start, 3), round(S["t"], 3), seg_task])
    tot = {}
    for a, b, k in S["segs"]:
        if k >= 0: tot[k] = tot.get(k, 0) + b - a
    return dict(policy=policy, segs=S["segs"], switches=S["switches"], snaps=S["snaps"],
                cpu={T[k]["name"]: round(v, 3) for k, v in tot.items()},
                waits={x["name"]: [round(w, 3) for w in x["waits"]] for x in T if not x["hog"]})


SCENARIOS = {
    # the page's default: two busy threads and one thread that wakes every 4 ms for 0.4 ms of work
    "loader": dict(tasks=[dict(name="trainer", nice=0), dict(name="preproc", nice=0),
                          dict(name="loader", nice=0, run=400, sleep=3600, start=1500)], horizon=40000),
    "loader_short": dict(tasks=[dict(name="trainer", nice=0), dict(name="preproc", nice=0),
                                dict(name="loader", nice=0, run=400, sleep=3600, start=1500, slice=100)], horizon=40000),
    "nice5": dict(tasks=[dict(name="nice0", nice=0), dict(name="nice5", nice=5)], horizon=200000),
    "three": dict(tasks=[dict(name="a", nice=0), dict(name="b", nice=0), dict(name="c", nice=0)], horizon=60000),
}

if __name__ == "__main__":
    out = {}
    for name, sc in SCENARIOS.items():
        for pol in ("cfs", "eevdf"):
            if name == "loader_short" and pol == "cfs": continue
            r = simulate(pol, sc["tasks"], sc["horizon"])
            out[f"{name}/{pol}"] = dict(segs=r["segs"], cpu=r["cpu"], waits=r["waits"], switches=r["switches"])
            w = [x for v in r["waits"].values() for x in v]
            print(f"{name:13s} {pol:6s} cpu {r['cpu']} switches {r['switches']} "
                  f"waits n={len(w)} mean={sum(w)/len(w) if w else 0:.0f} max={max(w) if w else 0:.0f}")
    json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "simref_out.json", "w"), indent=0)
