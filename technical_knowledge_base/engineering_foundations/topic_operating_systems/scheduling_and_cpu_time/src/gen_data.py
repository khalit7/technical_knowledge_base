"""Parse raw/*.txt into parts/22_js_data.js (window.SC_DATA). Every measured number the page shows comes from here;
recorded outputs shown on the page are embedded verbatim (RAW), cut at their '### ' section headers."""
import json, re, pathlib
R = pathlib.Path("raw")
txt = lambda n: (R / n).read_text()
def section(name, title):
    """The text of one '### title' section of raw/name (header excluded), trailing blank lines dropped."""
    s = txt(name); i = s.index("### " + title); j = s.find("\n### ", i + 4)
    body = s[s.index("\n", i) + 1:(j if j >= 0 else len(s))]
    return body.rstrip("\n")
D = {"RAW": {}}

# context switches
c = txt("ctx.txt")
D["ctx"] = {
  "pipe": [float(x) for x in re.findall(r"ctx_pipe .* per_switch_us ([\d.]+)", c)],
  "futex": [float(x) for x in re.findall(r"ctx_futex .* per_switch_us ([\d.]+)", c)],
  "yield_switched": [int(x) for x in re.findall(r"switches_of_this_process (\d+)", c)],
  "spin_ns": [round(float(x) * 1000) for x in re.findall(r"xcpu_spin .* one_way_us ([\d.]+)", c)],
  "xidle": [float(x) for x in re.findall(r"xcpu_pipe .* one_way_us ([\d.]+)", c.split("a nice 19 busy loop")[0])],
  "xbusy": [float(x) for x in re.findall(r"xcpu_pipe .* one_way_us ([\d.]+)", c.split("a nice 19 busy loop")[1])],
  "root_pipe": 1.33}
D["RAW"]["ctx_pipe"] = section("ctx.txt", "process switch: pipe ping-pong, both on CPU 1 (5 runs)")
D["RAW"]["ctx_futex"] = section("ctx.txt", "thread switch: futex ping-pong, both threads on CPU 1 (5 runs)")
cache = txt("cache.txt"); rounds = []
for blk in cache.split("### round ")[1:]:
    v = [float(x) for x in re.findall(r"ns_per_load ([\d.]+)", blk)]
    rounds.append({"load": float(re.search(r"vm_load ([\d.]+)", blk).group(1)), "k1024": v[0:3], "k4096": v[3:6]})
D["cache"] = rounds

# wake-up latency
w = txt("wake.txt"); D["wake"] = []
for blk in w.split("### ")[1:]:
    m = re.search(r"p50_us ([\d.]+) p90_us ([\d.]+) p99_us ([\d.]+) max_us ([\d.]+) mean_us ([\d.]+)", blk)
    if m: D["wake"].append({"case": blk.splitlines()[0].strip(), "p50": float(m.group(1)), "p90": float(m.group(2)),
                            "p99": float(m.group(3)), "max": float(m.group(4)), "mean": float(m.group(5))})

# vruntime from /proc/PID/sched
v = txt("vrun.txt"); rows = []
for l in v.splitlines():
    if l.startswith("t_ms"):
        t = int(re.match(r"t_ms (\d+)", l).group(1)); r = {"t": t}
        for n in ("nice0", "nice5", "sleeper"):
            m = re.search(rf"{n} vr ([\d.]+) exec ([\d.]+) sw (\d+)", l); r[n] = [float(m.group(1)), float(m.group(2)), int(m.group(3))]
        rows.append(r)
D["vrun"] = rows
D["vrun_weights"] = {m.group(1): int(m.group(2)) for m in re.finditer(r"task (\w+) pid \d+ weight (\d+)", v)}
D["setsid_share"] = float(re.search(r"share of nice 0: ([\d.]+)", v).group(1))
D["RAW"]["setsid"] = section("vrun.txt", "nice across sessions inside a container (setsid): autogroup does not apply in a non-root cgroup")

# real-time and deadline
D["RAW"]["rt_limits"] = section("rt.txt", "the RT limits and what this container may do")
D["RAW"]["rt_dl"] = section("rt.txt", "SCHED_DEADLINE: allowed here, but only when the task may run on every CPU")
D["RAW"]["rt_dl20"] = section("rt.txt", "a SCHED_DEADLINE busy loop with runtime 2 ms every 10 ms gets 20% of a CPU, even with CPUs idle")

# what programs see
cp = txt("cpus.txt"); D["cpus"] = []
for blk in cp.split("### docker run")[1:]:
    flags = blk.splitlines()[0].strip() or "(no CPU flags)"
    m = re.search(r"cpu.max quota/period (\S+); cpuset.cpus.effective (\S+); os.cpu_count\(\) (\d+); len\(os.sched_getaffinity\(0\)\) (\d+); "
                  r"torch.get_num_threads\(\) (\d+); torch.get_num_interop_threads\(\) (\d+)", blk)
    n = re.search(r"nproc (\d+)", blk)
    D["cpus"].append({"flags": flags, "quota": m.group(1), "cpuset": m.group(2), "cpu_count": int(m.group(3)), "affinity": int(m.group(4)),
                      "torch": int(m.group(5)), "interop": int(m.group(6)), "nproc": int(n.group(1))})

# accounting
D["RAW"]["acct_time"] = section("acct.txt", "time: 4 threads of matrix multiply for a fixed amount of work")
D["RAW"]["acct_stat"] = section("acct.txt", "the VM's CPU time by kind since boot (/proc/stat, in 10 ms ticks): user nice system idle iowait irq softirq steal guest guest_nice")
D["RAW"]["acct_schedstat"] = section("acct.txt", "per-task scheduler statistics: /proc/PID/schedstat = time on CPU (ns), time waiting on a run queue (ns), timeslices")

# the running job
D["RAW"]["job_ps"] = section("job.txt", "ps: every thread (LWP) of the job")
j = txt("job.txt"); D["job"] = []
for m in re.finditer(r"pid (\d+) tid (\d+) comm (\S+) state (\S) cpu (\d+) vol (\d+) invol (\d+) on_cpu_ms (\d+) runqueue_wait_ms (\d+) timeslices (\d+)", j):
    D["job"].append(dict(pid=int(m.group(1)), tid=int(m.group(2)), comm=m.group(3), state=m.group(4), cpu=int(m.group(5)), vol=int(m.group(6)),
                         invol=int(m.group(7)), on_ms=int(m.group(8)), wait_ms=int(m.group(9)), slices=int(m.group(10))))
D["RAW"]["job_churn"] = section("job.txt", "worker pids, sampled every 0.5 s for 3 s (a new DataLoader iterator forks new workers each epoch)")

# throttling: per run, every thread's gaps
t = txt("throttle.txt"); D["throttle"] = []
for blk in t.split("### host: docker run ")[1:]:
    head = blk.splitlines()[0].strip()
    cm = re.search(r"cpu.max (\d+) (\d+) threads (\d+)", blk)
    th = []
    for m in re.finditer(r"^thread (\d+) cpu_ms ([\d.]+) gaps (\d+) gap_ms ([\d.]+) max_gap_ms ([\d.]+)\ngaps \d+((?: [\d.]+-[\d.]+)*)", blk, re.M):
        gaps = [[float(a), float(b)] for a, b in (g.split("-") for g in m.group(6).split())]
        th.append({"cpu_ms": float(m.group(2)), "gap_ms": float(m.group(4)), "max_gap": float(m.group(5)), "gaps": gaps})
    s0 = dict((k, int(x)) for k, x in re.findall(r"(\w+) (\d+)", blk.split("cpu.stat before:")[1].splitlines()[0]))
    s1 = dict((k, int(x)) for k, x in re.findall(r"(\w+) (\d+)", blk.split("cpu.stat after:")[1].splitlines()[0]))
    D["throttle"].append({"flags": head.split(" --memory")[0], "quota": int(cm.group(1)), "period": int(cm.group(2)), "n": int(cm.group(3)),
                          "threads": th, "stat": {k: s1[k] - s0[k] for k in ("nr_periods", "nr_throttled", "throttled_usec", "usage_usec")}})

# cpu.weight
wt = txt("weight.txt")
a, b = map(int, re.search(r"A used (\d+) ms, B used (\d+) ms", wt).groups())
D["weight"] = {"wA": int(re.search(r"cpu.weight A (\d+)", wt).group(1)), "wB": int(re.search(r"B (\d+)\n", wt).group(1)), "msA": a, "msB": b,
               "alone": float(re.search(r"alone: .*median_ms ([\d.]+)", wt).group(1)),
               "n39": float(re.search(r"neighbour weight 39: .*median_ms ([\d.]+)", wt).group(1)),
               "n5": float(re.search(r"neighbour weight 5: .*median_ms ([\d.]+)", wt).group(1))}
D["RAW"]["weight"] = wt.rstrip("\n")

# load average
la = txt("loadavg.txt")
D["load"] = [{"t": int(m.group(1)), "l1": float(m.group(2)), "l5": float(m.group(3)), "d": int(m.group(5)) if m.group(5) else 0}
             for m in re.finditer(r"t_s (\d+) ([\d.]+) ([\d.]+) [\d.]+ \S+ container_cpu_us (\d+)(?: d_state (\d+))?", la)]
D["load_cpu_us"] = [int(m.group(1)) for m in re.finditer(r"container_cpu_us (\d+)", la)]
D["RAW"]["dstate"] = section("loadavg.txt", "one D-state task: what ps shows")

# CPU budget grid
g = txt("grid.txt") if (R / "grid.txt").exists() else ""; cells = []; q = rep = None; load = None
for line in g.splitlines():
    m = re.match(r"repeat (\d+) cpu.max (\d+) (\d+) os.cpu_count \d+ vm_load ([\d.]+)", line)
    if m: rep, q, load = int(m.group(1)), int(m.group(2)) / int(m.group(3)), float(m.group(4)); continue
    m = re.match(r"threads (\d+) workers (\d+) median_ms ([\d.]+) max_ms ([\d.]+) wait_share ([\d.]+) periods (\d+) throttled (\d+) "
                 r"throttled_ms (\d+) usage_ms (\d+) invol_main (\d+)", line)
    if m:
        cells.append(dict(rep=rep, q=q, load=load, T=int(m.group(1)), W=int(m.group(2)), med=float(m.group(3)), max=float(m.group(4)),
                          wait=float(m.group(5)), per=int(m.group(6)), thr=int(m.group(7)), thr_ms=int(m.group(8)), use_ms=int(m.group(9)), inv=int(m.group(10))))
D["grid"] = cells

pathlib.Path("parts/22_js_data.js").write_text("// generated by src/gen_data.py from src/raw/ (do not edit)\nwindow.SC_DATA=" +
                                              json.dumps(D, separators=(",", ":")) + ";\n")
print("wrote parts/22_js_data.js", len(json.dumps(D)), "bytes;", len(cells), "grid cells")
