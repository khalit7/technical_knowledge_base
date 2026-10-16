"""Recompute every number the Reading tab derives or simulates (run: python3 recompute.py).

1. The backfill animation: FIFO against EASY backfill on one fixed queue (illustrative workload, 8 nodes).
2. Job MTBF scaling from Llama 3's published interruption count, and Young's interval.
3. Checkpoint size arithmetic.
The page's JavaScript prints the same numbers; check_read.mjs compares them with out/expected.json.
"""
import json, math, os

NODES = 8
# name, nodes, true runtime, requested time limit factor applies to runtime
JOBS = [("A", 4, 6), ("B", 6, 4), ("C", 2, 3), ("D", 1, 2), ("E", 4, 5), ("F", 2, 7), ("G", 1, 1), ("H", 3, 2)]


def simulate(policy, pad=1.0):
    """policy: 'fifo' or 'easy'. Every job is submitted at t=0 in list order.
    The scheduler only knows each job's time limit (runtime * pad); jobs end at their true runtime.
    EASY: start jobs in order while they fit; then reserve the earliest start for the first waiting job
    (from running jobs' limits) and start any later job that fits now and either ends (by its limit)
    before that reservation or leaves enough nodes free for it."""
    t = 0
    waiting = list(range(len(JOBS)))
    running = []  # (idx, start, true_end, limit_end)
    sched = {}
    events = []
    while waiting or running:
        # pass at time t
        changed = True
        while changed:
            changed = False
            free = NODES - sum(JOBS[i][1] for i, *_ in running)
            # start head jobs in order
            while waiting and JOBS[waiting[0]][1] <= free:
                i = waiting.pop(0)
                running.append((i, t, t + JOBS[i][2], t + JOBS[i][2] * pad))
                sched[JOBS[i][0]] = (t, t + JOBS[i][2])
                events.append((t, "start", JOBS[i][0], "in order"))
                free -= JOBS[i][1]
                changed = True
            if policy == "easy" and waiting:
                head = waiting[0]
                need = JOBS[head][1]
                # shadow time: when enough nodes free up by limits
                ends = sorted((le, JOBS[i][1]) for i, s, te, le in running)
                avail = free
                shadow = None
                for le, n in ends:
                    avail += n
                    if avail >= need:
                        shadow = le
                        break
                extra = avail - need  # nodes spare at shadow time
                for i in list(waiting[1:]):
                    n, rt = JOBS[i][1], JOBS[i][2]
                    if n <= free and (t + rt * pad <= shadow or n <= extra):
                        waiting.remove(i)
                        running.append((i, t, t + rt, t + rt * pad))
                        sched[JOBS[i][0]] = (t, t + rt)
                        events.append((t, "start", JOBS[i][0], "backfilled"))
                        free -= n
                        if not (t + rt * pad <= shadow):
                            extra -= n
                        changed = True
        if not running:
            break
        t = min(te for i, s, te, le in running)
        for r in [r for r in running if r[2] == t]:
            running.remove(r)
            events.append((t, "end", JOBS[r[0]][0], ""))
    makespan = max(e for s, e in sched.values())
    busy = sum(JOBS[i][1] * JOBS[i][2] for i in range(len(JOBS)))
    waits = {k: s for k, (s, e) in sched.items()}
    return {"sched": sched, "makespan": makespan, "util": busy / (NODES * makespan),
            "mean_wait": sum(waits.values()) / len(waits), "events": events}


out = {}
for name, pol, pad in [("fifo", "fifo", 1.0), ("easy", "easy", 1.0), ("easy_pad", "easy", 3.0)]:
    r = simulate(pol, pad)
    out[name] = {k: r[k] for k in ("sched", "makespan", "util", "mean_wait")}
    print(name, "makespan", r["makespan"], "util %.3f" % r["util"], "mean wait %.3f" % r["mean_wait"])
    print("   ", r["sched"])

# 2. Failures: Llama 3 405B, 419 unexpected interruptions in 54 days on 16,384 GPUs (paper section 3.3.4)
mtbf_h = 54 * 24 / 419
out["llama3_mtbf_h"] = mtbf_h
per_gpu_h = mtbf_h * 16384
print("Llama 3 job MTBF %.2f h; per-GPU-equivalent MTBF %.0f h (%.1f years)" % (mtbf_h, per_gpu_h, per_gpu_h / 8766))
for n in (8, 64, 512, 1000, 16384, 100000):
    m = per_gpu_h / n
    print("  N=%6d  job MTBF %.2f h" % (n, m))
    out["mtbf_%d" % n] = m
# Young: tau = sqrt(2 C M); lost fraction approx C/tau + (tau/2 + R)/M
def young(C_s, M_h, R_s):
    M = M_h * 3600
    tau = math.sqrt(2 * C_s * M)
    lost = C_s / tau + (tau / 2 + R_s) / M
    return tau, lost
for n, C, R in [(1000, 60, 600), (16384, 60, 600), (100000, 60, 600)]:
    tau, lost = young(C, per_gpu_h / n, R)
    print("  N=%6d C=%ds R=%ds: Young interval %.1f min, expected loss %.1f%%" % (n, C, R, tau / 60, lost * 100))
    out["young_%d" % n] = {"tau_min": tau / 60, "lost": lost}

# 3. Checkpoint size: bf16 weights + fp32 master + fp32 Adam m and v = 2+4+4+4 = 14 bytes/param
for p in (8e9, 70e9, 405e9):
    b = 14 * p
    print("  %.0fB params: %.2f TB checkpoint at 14 B/param" % (p / 1e9, b / 1e12))
    out["ckpt_%dB_TB" % int(p / 1e9)] = b / 1e12

# 4. The checkpoint timeline animation (illustrative): 20 h of work, failures at wall-clock 9 and 17,
# restart 0.5 h, checkpoint every 4 h of work, 0.1 h to write.
def timeline(ck, W=20, fails=(9, 17), R=0.5, CI=4, CW=0.1):
    wall = prog = last = lost = 0.0
    fq = list(fails)
    while True:
        f = fq[0] if fq else math.inf
        t_fin = wall + (W - prog)
        t_ck = wall + (last + CI - prog) if ck and last + CI < W else math.inf
        if f < min(t_fin, t_ck):
            lost += prog + (f - wall) - last
            wall, prog = f + R, last
            fq.pop(0)
            continue
        if t_ck < t_fin:
            wall, prog = t_ck, last + CI
            if f < wall + CW:
                lost += prog - last
                wall, prog = f + R, last
                fq.pop(0)
                continue
            wall += CW
            last = prog
            continue
        wall = t_fin
        break
    return {"end": wall, "lost": lost, "goodput": W / wall}

for k, ck in (("none", False), ("ckpt", True)):
    r = timeline(ck)
    out["tl_" + k] = r
    print("timeline %s: ends %.2f h, lost %.2f h, goodput %.1f%%" % (k, r["end"], r["lost"], 100 * r["goodput"]))

os.makedirs(os.path.join(os.path.dirname(__file__), "out"), exist_ok=True)
with open(os.path.join(os.path.dirname(__file__), "out", "expected.json"), "w") as f:
    json.dump(out, f, indent=1)
