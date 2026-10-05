"""Turn the recorded outputs (runs/out/*.txt, inputs/recompute_out.json, inputs/lab_programs.json) into
parts/22_js_data.js: window.CD = {raw: {...verbatim outputs...}, v: {...every number the prose shows...}, ...}.
check_embed.py checks that the page shows exactly these. Usage: python3 make_data.py"""
import json, pathlib, re, statistics as st

HERE = pathlib.Path(__file__).parent
OUT = HERE / "runs/out"
raw = {f.stem: f.read_text() for f in sorted(OUT.glob("*.txt"))}
v = {}
med = st.median


def f1(x):
    return f"{x:.1f}"


# threads
t = raw["threads"]
cr = re.findall(r"create\+join, default stack: ([\d.]+) us", t)
v["thr.create_us"] = cr[0]
v["thr.create1_us"] = cr[1] if len(cr) > 1 else "n/a"
v["thr.stack_mib"] = str(int(re.search(r"default stack (\d+) KiB", t).group(1)) // 1024)

# locks
L = {}
for m in re.finditer(r"(S\d) impl (\w+) threads (\d+) .*?wall_ns_per_acq ([\d.]+) cpu_ns_per_acq ([\d.]+) sys_share ([\d.]+) vcsw (\d+) ivcsw (\d+) futex_wait (\d+) futex_wake (\d+)", raw["locks"]):
    sc, impl, th = m.group(1), m.group(2), m.group(3)
    key = impl + ("1" if sc == "S4" and th == "1" else "")
    L.setdefault((sc, key), []).append([float(m.group(i)) for i in range(4, 11)])
locks = {}
for (sc, key), rows in L.items():
    w = med(r[0] for r in rows); c = med(r[1] for r in rows); fw = med(r[5] for r in rows)
    locks.setdefault(sc, {})[key] = {"wall": w, "cpu": c, "fw": fw, "runs": [r[0] for r in rows], "cpuruns": [r[1] for r in rows]}
    v[f"lk.{sc}.{key}.wall"] = f1(w); v[f"lk.{sc}.{key}.cpu"] = f1(c)
    if key in ("futex", "sysc"):
        v[f"lk.{sc}.{key}.fw"] = str(int(fw))

# ping-pong
pp = {}
for m in re.finditer(r"(\dcpu) mode (\w+) N \d+ round_trip_us ([\d.]+)", raw["pingpong"]):
    pp.setdefault(m.group(1), {}).setdefault(m.group(2), []).append(float(m.group(3)))
ppm = {c: {k: med(x) for k, x in d.items()} for c, d in pp.items()}
for c, d in ppm.items():
    for k, x in d.items():
        v[f"pp.{c}.{k}.rt"] = f1(x); v[f"pp.{c}.{k}.half"] = f1(x / 2)
v["pp.1cpu.spin.ms"] = f1(ppm["1cpu"]["spin"] / 1000)
v["pp.2cpu.spin.rt2"] = f"{ppm['2cpu']['spin']:.2f}"
v["pp.spin.ratio"] = f"{round(ppm['1cpu']['spin'] / ppm['2cpu']['spin'], -3):,.0f}"

# peterson
pl = [int(x) for x in re.findall(r"mode plain .* lost (\d+)", raw["peterson"])]
ps = [int(x) for x in re.findall(r"mode seqcst .* lost (\d+)", raw["peterson"])]
v["pt.plain.lost"] = f"{min(pl)} to {max(pl)}"; v["pt.seqcst.lost"] = str(max(ps)); v["pt.runs"] = str(len(pl))

# condition variables
e = [int(x) for x in re.findall(r"mode if .* woke_to_empty_slot (\d+)", raw["condvar"])]
r = [int(x) for x in re.findall(r"mode while .* rechecks (\d+)", raw["condvar"])]
h = raw["condvar"].count("mode onecond"); hh = raw["condvar"].count("onecond N 200000 HANG")
v["cv.if.empty"] = f"{min(e)} to {max(e)}"; v["cv.while.rechecks"] = f"{min(r)} to {max(r)}"; v["cv.onecond.hangs"] = f"{hh} of {h}"

# GIL
G = {}
for m in re.finditer(r"cpu_threads (\d) switch_interval_ms ([\d.]+) wake_late_median_ms ([\d.]+) wake_late_p99_ms ([\d.]+)", raw["gil"]):
    iv = m.group(2).rstrip("0").rstrip(".")
    G.setdefault((m.group(1), iv), []).append((float(m.group(3)), float(m.group(4))))
gil = []
for (n, iv), rows in sorted(G.items()):
    a, b = med(x[0] for x in rows), med(x[1] for x in rows)
    v[f"gil.{n}.{iv}.med"] = f1(a); v[f"gil.{n}.{iv}.p99"] = f1(b)
    gil.append({"n": int(n), "iv": float(iv), "med": a, "p99": b, "runs": [x[0] for x in rows]})

# event loop
ev = []
for m in re.finditer(r"N (\d+) maxfd (\d+) select_ns (\S+) poll_ns (\d+) epoll_ns (\d+)", raw["evloop"]):
    n = int(m.group(1)); s = None if m.group(3) == "impossible" else int(m.group(3))
    ev.append({"n": n, "maxfd": int(m.group(2)), "select": s, "poll": int(m.group(4)), "epoll": int(m.group(5))})
    v[f"ev.{n}.poll"] = m.group(4); v[f"ev.{n}.epoll"] = m.group(5)
v["ev.10000.poll_us"] = str(round(int(v["ev.10000.poll"]) / 1000))

# io_uring
u = raw["uring"].split("## strace")[0]   # timings from the untraced runs only
us = raw["uring"]
pr = [float(x) for x in re.findall(r"^mode pread blocks \d+ ns_per_block (\d+)", u, re.M)]
d32 = [float(x) for x in re.findall(r"^depth 32 mode uring blocks \d+ ns_per_block (\d+)", u, re.M)]
v["ur.pread"] = str(int(med(pr))); v["ur.d32"] = str(int(med(d32)))
v["ur.saving_pct"] = str(round((med(pr) - med(d32)) / med(pr) * 100))
v["ur.enter"] = re.search(r"(\d+)\s+io_uring_enter", us).group(1)
v["ur.pread_calls"] = re.search(r"(\d+)\s+pread64", us).group(1)

# connections
C = {}
for m in re.finditer(r"mode (\w+) connections (\d+) threads (\d+) rss_MiB (\d+) rss_added_MiB (\d+) vsz_MiB (\d+) setup_ms (\d+) round_ms ([\d.]+)", raw["conns"]):
    C.setdefault(m.group(1), []).append([int(m.group(3)), int(m.group(4)), int(m.group(5)), int(m.group(6)), int(m.group(7)), float(m.group(8))])
conns = {}
for k, rows in C.items():
    conns[k] = {"threads": rows[0][0], "rss": med(r[1] for r in rows), "rss_added": med(r[2] for r in rows), "vsz": med(r[3] for r in rows),
                "setup": med(r[4] for r in rows), "round": med(r[5] for r in rows)}
    for kk in ("rss_added", "vsz", "setup"):
        v[f"cn.{k}.{kk}"] = str(int(conns[k][kk]))
    v[f"cn.{k}.round"] = f1(conns[k]["round"])

# training job
job = {}
for blk in re.split(r"(?=## torch threads )", raw["job_threads"]):
    m = re.match(r"## torch threads (\d+)", blk)
    if not m:
        continue
    n = m.group(1); steps = int(re.search(r"steps during the window (\d+)", blk).group(1))
    fx = re.search(r"calls: futex (\d+) (\d+)", blk)
    job[n] = blk
    v[f"job.{n}.futex_per_step"] = str(round(int(fx.group(1)) / steps))
    v[f"job.{n}.eagain_pct"] = str(round(int(fx.group(2)) / int(fx.group(1)) * 100))

# interleaving lab (counts from recompute.py, shown with thousands separators)
rc = json.loads((HERE / "inputs/recompute_out.json").read_text())
for k, d in rc["lab"].items():
    for kk in ("schedules", "bug", "asleep_forever", "finish"):
        v[f"lab.{k}.{kk}"] = f"{d[kk]:,}"

data = {"raw": raw, "v": v, "locks": locks, "pp": ppm, "gil": gil, "ev": ev, "conns": conns, "job": job,
        "lab": json.loads((HERE / "inputs/lab_programs.json").read_text()), "labcheck": rc["lab"]}
js = "// Generated by src/make_data.py from src/runs/out/*.txt and src/inputs/*.json. Do not edit.\nwindow.CD=" + json.dumps(data, separators=(",", ":")) + ";\n"
(HERE / "parts/22_js_data.js").write_text(js)
print(len(js), "bytes;", len(v), "values")
