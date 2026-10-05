"""Recompute every derived number on the scheduling page from its formula and the recorded outputs in raw/.
Writes recompute.txt; check_embed.py compares the page's prose against these values."""
import math, re, statistics as st, pathlib
from simref import WEIGHT

R = pathlib.Path("raw"); out = []
def say(k, v): out.append(f"{k} = {v}")

# --- CFS tunables on this VM: factor = 1 + ilog2(min(ncpus, 8)) (fair.c v5.10 line 159), defaults x factor ---
ncpu = 5; factor = 1 + int(math.log2(min(ncpu, 8)))
say("factor(5 CPUs)", factor)
say("sched_latency_ns", 6_000_000 * factor); say("sched_min_granularity_ns", 750_000 * factor)
say("sched_wakeup_granularity_ns", 1_000_000 * factor); say("sched_nr_latency", 8)
say("eevdf base slice on 5 CPUs (us)", 750 * factor); say("eevdf base slice on 8+ CPUs (us)", 750 * (1 + 3))
say("sleeper credit, latency/2 (ms)", 6 * factor / 2)
for n in (1, 2, 3, 8, 9, 16):  # __sched_period and sched_slice for n equal tasks
    p = n * 0.75 * factor if n > 8 else 6 * factor
    say(f"CFS period, {n} runnable nice-0 tasks (ms)", round(p, 3)); say(f"CFS slice each, {n} tasks (ms)", round(p / n, 3))

# --- weights and shares ---
share = lambda a, b: WEIGHT[a] / (WEIGHT[a] + WEIGHT[b])
say("share nice0 vs nice5", round(share(0, 5), 4)); say("share nice0 vs nice10", round(share(0, 10), 4))
say("weight ratio nice0/nice5", round(WEIGHT[0] / WEIGHT[5], 3))
say("nice step factor (weight[-1]/weight[0])", round(WEIGHT[-1] / WEIGHT[0], 3))
say("share nice0 among nice 0,0,5 (each nice0)", round(WEIGHT[0] / (2 * WEIGHT[0] + WEIGHT[5]), 4))

# --- /proc/PID/sched: vruntime and CPU time ---
v = (R / "vrun.txt").read_text()
rows = [l for l in v.splitlines() if l.startswith("t_ms")]
def grab(line, name, key): return float(re.search(rf"{name} vr ([\d.]+) exec ([\d.]+)", line).group(1 if key == "vr" else 2))
first, last = rows[0], rows[-1]
d0 = grab(last, "nice0", "exec") - grab(first, "nice0", "exec"); d5 = grab(last, "nice5", "exec") - grab(first, "nice5", "exec")
ds = grab(last, "sleeper", "exec") - grab(first, "sleeper", "exec")
say("vrun window (ms)", re.search(r"t_ms (\d+)", last).group(1))
say("exec gained nice0, nice5, sleeper (ms)", f"{d0:.1f}, {d5:.1f}, {ds:.1f}")
say("exec ratio nice0/nice5 measured", round(d0 / d5, 3))
gap = [max(grab(r, n, "vr") for n in ("nice0", "nice5")) - min(grab(r, n, "vr") for n in ("nice0", "nice5")) for r in rows]
say("max vruntime gap between the two busy loops (ms)", round(max(gap), 2))
lag = [min(grab(r, n, "vr") for n in ("nice0", "nice5")) - grab(r, "sleeper", "vr") for r in rows]
say("sleeper vruntime behind the busy loops, median (ms)", round(st.median(lag), 1))
m = re.search(r"share of nice 0: ([\d.]+)", v); say("setsid share nice0 measured", m.group(1))

# --- context switches ---
c = (R / "ctx.txt").read_text()
ps = [float(x) for x in re.findall(r"ctx_pipe .* per_switch_us ([\d.]+)", c)]
fs = [float(x) for x in re.findall(r"ctx_futex .* per_switch_us ([\d.]+)", c)]
say("process switch us min, median, max", f"{min(ps):.2f}, {st.median(ps):.2f}, {max(ps):.2f}")
say("thread switch us min, median, max", f"{min(fs):.2f}, {st.median(fs):.2f}, {max(fs):.2f}")
ys = [(float(a), int(b)) for a, b in re.findall(r"ctx_yield n 200000 .* us_per_yield_pair ([\d.]+) .* switches_of_this_process (\d+)", c)]
say("sched_yield calls that switched (%)", ", ".join(f"{b / 200000 * 100:.0f}" for _, b in ys))
sp = [float(x) for x in re.findall(r"xcpu_spin .* one_way_us ([\d.]+)", c)]
say("cache-line hand-off one way ns min-max", f"{min(sp) * 1000:.0f}-{max(sp) * 1000:.0f}")
sec = c.split("### cross-CPU pipe ping-pong, a nice 19")
idle = [float(x) for x in re.findall(r"xcpu_pipe .* one_way_us ([\d.]+)", sec[0])]
busy = [float(x) for x in re.findall(r"xcpu_pipe .* one_way_us ([\d.]+)", sec[1])]
say("cross-CPU wake one way us, idle CPUs", f"{min(idle):.1f}-{max(idle):.1f}")
say("cross-CPU wake one way us, busy CPUs", f"{min(busy):.1f}-{max(busy):.1f}")
say("cross-CPU idle wake vs process switch (x, medians)", round(st.median(idle) / st.median(ps)))

# --- wake-up latency ---
w = (R / "wake.txt").read_text()
for blk in w.split("### ")[1:]:
    name = blk.splitlines()[0].strip(); m = re.search(r"p50_us ([\d.]+) .*p99_us ([\d.]+) max_us ([\d.]+)", blk)
    if m: say(f"wake {name} p50/p99/max us", f"{m.group(1)}/{m.group(2)}/{m.group(3)}")

# --- SCHED_DEADLINE ---
r = (R / "rt.txt").read_text(); m = re.search(r"CPU time in 3 s: (\d+) ms \((\d+)%", r)
say("SCHED_DEADLINE 2/10 ms: expected share", 2 / 10); say("SCHED_DEADLINE measured ms in 3 s", m.group(1))

# --- throttling ---
t = (R / "throttle.txt").read_text()
for blk in t.split("### host:")[1:]:
    head = blk.splitlines()[0].strip(); thr = re.findall(r"^thread \d+ cpu_ms ([\d.]+) gaps \d+ gap_ms ([\d.]+) max_gap_ms ([\d.]+)", blk, re.M)
    cm = re.search(r"cpu.max (\d+) (\d+) threads (\d+)", blk); q, p, n = int(cm.group(1)), int(cm.group(2)), int(cm.group(3))
    burn = q / n / 1000  # ms of wall time for n threads to use the quota
    stall = max(0, p / 1000 - burn) if n * p > q else 0
    s0 = dict(re.findall(r"(\w+) (\d+)", blk.split("cpu.stat before:")[1].splitlines()[0]))
    s1 = dict(re.findall(r"(\w+) (\d+)", blk.split("cpu.stat after:")[1].splitlines()[0]))
    say(f"throttle [{head}] predicted stall per period (ms)", round(stall, 1))
    say(f"throttle [{head}] measured max gap per thread (ms)", ", ".join(x[2] for x in thr))
    say(f"throttle [{head}] cpu ms total", round(sum(float(x[0]) for x in thr)))
    say(f"throttle [{head}] nr_periods, nr_throttled, throttled_ms",
        f"{int(s1['nr_periods']) - int(s0['nr_periods'])}, {int(s1['nr_throttled']) - int(s0['nr_throttled'])}, {(int(s1['throttled_usec']) - int(s0['throttled_usec'])) / 1000:.0f}")

# --- cpu.weight ---
conv_old = lambda s: 1 + ((s - 2) * 9999) // 262142                       # runc v1.1.2 utils.go line 423
def conv_new(s):                                                          # opencontainers/cgroups v0.0.3 utils.go line 425
    if s <= 2: return 1
    if s >= 262144: return 10000
    l = math.log2(s); return math.ceil(10 ** ((l * l + 125 * l) / 612.0 - 7.0 / 34.0))
for s in (2, 128, 512, 1024, 2048, 4096):
    say(f"shares {s} -> weight (runc 1.1 linear, cgroups v0.0.3+ quadratic)", f"{conv_old(s)}, {conv_new(s)}")
say("kernel shares for weight 100 (core.c 8286: w*1024/100)", round(100 * 1024 / 100))
say("kernel shares for weight 39", round(39 * 1024 / 100))
for mc in (250, 1000, 4000):
    sh = max(2, mc * 1024 // 1000); say(f"k8s request {mc}m -> shares, weight (old), quota per 100 ms (if limit)", f"{sh}, {conv_old(sh)}, {mc * 100000 // 1000}")
wt = (R / "weight.txt").read_text()
a, b = map(int, re.search(r"A used (\d+) ms, B used (\d+) ms", wt).groups())
say("weight split measured A share", round(a / (a + b), 4)); say("weight split expected 39/(39+20)", round(39 / 59, 4))
alone = float(re.search(r"alone: .*median_ms ([\d.]+)", wt).group(1))
n39 = float(re.search(r"neighbour weight 39: .*median_ms ([\d.]+)", wt).group(1))
n5 = float(re.search(r"neighbour weight 5: .*median_ms ([\d.]+)", wt).group(1))
say("step alone, with weight-39 neighbour, with weight-5 neighbour (ms)", f"{alone}, {n39}, {n5}")
say("predicted with weight-39 neighbour: alone*(139/100)", round(alone * 139 / 100, 1))
say("predicted with weight-5 neighbour: alone*(105/100)", round(alone * 105 / 100, 1))

# --- load average: kernel fixed point (include/linux/sched/loadavg.h) ---
FSHIFT, FIXED_1, EXP_1 = 11, 1 << 11, 1884
def calc_load(load, exp, active):
    newload = load * exp + active * (FIXED_1 - exp)
    if active >= load: newload += FIXED_1 - 1
    return newload // FIXED_1
x = 0
for i in range(12): x = calc_load(x, EXP_1, 3 * FIXED_1)
say("1-min load from 3 constant tasks after 60 s (12 updates)", round(x / FIXED_1, 2))
say("same, continuous formula 3(1-e^-1)", round(3 * (1 - math.exp(-1)), 2))
say("EXP_1 = FIXED_1/e^(5/60)", round(FIXED_1 / math.exp(5 / 60)))

# --- stride scheduling (OSTEP ch. 9): A 100, B 50, C 250 tickets, big number 10,000 ---
tk = dict(A=100, B=50, C=250); stride = {k: 10000 // v for k, v in tk.items()}; pas = dict.fromkeys(tk, 0); order = []
for _ in range(8):
    k = min(pas, key=lambda q: (pas[q], q)); order.append(k); pas[k] += stride[k]
say("stride values A,B,C", ", ".join(str(stride[k]) for k in "ABC")); say("stride first 8 picks", "".join(order))

# --- grid summary (median of repeats) ---
g = (R / "grid.txt").read_text() if (R / "grid.txt").exists() else ""
cells = {}
q = None
for line in g.splitlines():
    m = re.match(r"repeat (\d+) cpu.max (\d+) (\d+)", line)
    if m: q = int(m.group(2)) / int(m.group(3)); continue
    m = re.match(r"threads (\d+) workers (\d+) median_ms ([\d.]+)", line)
    if m and q: cells.setdefault((q, int(m.group(1)), int(m.group(2))), []).append(float(m.group(3)))
for qq in sorted({k[0] for k in cells}):
    sub = {k: st.median(v) for k, v in cells.items() if k[0] == qq}
    best = min(sub, key=sub.get); worst = max(sub, key=sub.get)
    say(f"grid quota {qq:g}: best (threads, workers) and median ms", f"{best[1:]}, {sub[best]:.1f}")
    say(f"grid quota {qq:g}: worst (threads, workers) and median ms", f"{worst[1:]}, {sub[worst]:.1f}")
    say(f"grid quota {qq:g}: default threads 5, workers 2 median ms", f"{sub.get((qq, 5, 2), float('nan')):.1f}")

pathlib.Path("recompute.txt").write_text("\n".join(out) + "\n"); print("\n".join(out))
