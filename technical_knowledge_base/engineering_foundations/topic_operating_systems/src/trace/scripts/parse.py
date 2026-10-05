"""Build the Syscall tracer tab's data from the raw recordings in src/trace/raw.

Writes src/trace/data/trace_data.json and src/parts/32_js_tr_0data.js (window.TRDATA = <the same JSON>).
Everything on the tab comes from here; check_embed.py re-runs this and compares with the page.
"""
import collections
import json
import os
import re
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import strace_parse as sp  # noqa: E402

TR = os.path.dirname(HERE)
RAW = os.path.join(TR, "raw")
PARTS = os.path.join(TR, "..", "parts")


def rp(name):
    p = os.path.join(RAW, name)
    return p if os.path.exists(p) else p + ".gz"


def readlines(name):
    with sp.open_text(rp(name)) as f:
        return [l.rstrip("\n") for l in f]


def short(s, n=90):
    s = s.replace("\n", " ")
    return s if len(s) <= n else s[: n - 3] + "..."


def window(events, pid, a, b):
    """Events of one pid between two phase markers (by name), plus every other pid in that time span."""
    ph = {n: i for p, n, i in sp.phases(events) if p == pid}
    return ph.get(a), ph.get(b)


# ---------------- environment and plain timings ----------------
def env():
    d = {}
    for l in readlines("env.txt"):
        k, _, v = l.partition(" ")
        d.setdefault(k, v)
    return d


def floats(name):
    return [float(x) for x in readlines(name) if x.strip()]


def first_batch():
    out = collections.defaultdict(list)
    for l in readlines("timing_first_batch.txt"):
        m = re.search(r"time to first batch: ([\d.]+)s \(start method (\w+)(?: \(default\))?\)", l)
        if m:
            out[m.group(2)].append(float(m.group(1)))
    return {k: {"runs_s": v, "median_s": statistics.median(v), "min_s": min(v), "max_s": max(v)} for k, v in out.items()}


def epochs():
    out = collections.defaultdict(lambda: {"first": [], "second": []})
    for l in readlines("timing_epochs.txt"):
        m = re.match(r"variant (.+?): time to first batch: ([\d.]+)s .*second iterator\): ([\d.]+)s", l)
        if m:
            out[m.group(1)]["first"].append(float(m.group(2)))
            out[m.group(1)]["second"].append(float(m.group(3)))
    return {k: {"first_s": v["first"], "second_s": v["second"], "first_median_s": statistics.median(v["first"]),
                "second_median_s": statistics.median(v["second"])} for k, v in out.items()}


def hugepage_stack():
    return [re.sub(r"^#\d+\s+", "", l).strip() for l in readlines("hugepage_stack.txt") if re.match(r"^#\d+ ", l)]


def importtime():
    rows = []
    for l in readlines("importtime_torch.txt"):
        m = re.match(r"import time:\s+(\d+) \|\s+(\d+) \|( *)(\S+)", l)
        if m:
            rows.append({"mod": m.group(4), "self_us": int(m.group(1)), "cum_us": int(m.group(2)),
                         "depth": len(m.group(3)) // 2})
    total = next(r["cum_us"] for r in rows if r["mod"] == "torch")
    top = sorted([r for r in rows if r["mod"] != "torch"], key=lambda r: -r["self_us"])[:12]
    pk = collections.Counter()
    for r in rows:
        pk[r["mod"].split(".")[0]] += r["self_us"]
    return {"torch_cum_us": total, "n_modules": len(rows), "top_self": top,
            "by_package_self_us": pk.most_common(8)}


# ---------------- writes: buffered vs unbuffered ----------------
def writes():
    out = {}
    for mode in ("buffered", "unbuffered"):
        ev = sp.parse(rp(f"writes_{mode}.strace.txt"))
        a, b = window(ev, ev[0]["pid"], "write_begin", "write_end")
        w = ev[a:b]
        tgt = [e for e in w if e["name"] == "write" and f"w_{mode}.bin" in e["args"]]
        sizes = collections.Counter(int(e["ret"].split()[0]) for e in tgt)
        out[mode] = {"syscalls_in_window": len(w) - 1, "writes": len(tgt), "write_sizes": sorted(sizes.items()),
                     "names": collections.Counter(e["name"] for e in w[1:]).most_common(),
                     "first": [short(e["name"] + "(" + e["args"] + ") = " + e["ret"], 110) for e in tgt[:3]]}
    for l in readlines("writes_timing.txt"):
        m = re.match(r"(\w+): best of (\d+): ([\d.]+) ms", l)
        if m:
            key = "traced_ms" if m.group(2) == "1" else "untraced_best_ms"
            out[m.group(1)][key] = float(m.group(3))
            if key == "untraced_best_ms":
                out[m.group(1)]["untraced_reps"] = int(m.group(2))
    return out


# ---------------- checkpoints: naive, fsync, safe ----------------
def ckpt():
    out = {}
    for mode in ("naive", "fsync", "safe"):
        ev = sp.parse(rp(f"ckpt_{mode}.strace.txt"))
        main = ev[0]["pid"]
        a, b = window(ev, main, "ckpt_begin", "ckpt_end")
        w = [e for e in ev[a + 1:b] if e["pid"] == main]
        rows, run = [], None
        imp = re.compile(r"\.pyc|__pycache__|site-packages|/python3\.11")
        for e in w:
            if e["name"] in ("newfstatat", "openat", "read", "close", "lseek", "ioctl", "getdents64", "fstat") and imp.search(e["args"]):
                if run and run["name"] == "(Python import)":
                    run["n"] += 1
                    continue
                run = {"name": "(Python import)", "args": "torch.save's first call imports torch.serialization helpers", "ret": "", "n": 1, "fd": "", "dur": 0, "bytes": 0}
                rows.append(run)
                continue  # merge runs of consecutive writes to the same file into one row
            if e["name"] == "write" and run and run["name"] == "write" and run["fd"] == e["args"].split(",")[0]:
                run["n"] += 1
                run["bytes"] += int(e["ret"].split()[0]) if e["ret"].split()[0].isdigit() else 0
                run["dur"] += e["dur"]
                continue
            run = {"name": e["name"], "args": short(e["args"], 100), "ret": short(e["ret"], 40), "n": 1,
                   "fd": e["args"].split(",")[0], "dur": e["dur"],
                   "bytes": int(e["ret"].split()[0]) if e["name"] == "write" and e["ret"].split()[0].isdigit() else 0}
            rows.append(run)
        for r in rows:
            r.pop("fd")
            r["dur"] = round(r["dur"] * 1e6)
        out[mode] = {"rows": rows, "n_syscalls": len(w),
                     "names": collections.Counter(e["name"] for e in w).most_common()}
    t = {"work": {}, "shm": {}}
    where = None
    for l in readlines("ckpt_timing.txt"):
        if l.startswith("# on /work"):
            where = "work"
        elif l.startswith("# on /dev/shm"):
            where = "shm"
        m = re.match(r"(\w+): median of (\d+): ([\d.]+) ms, min ([\d.]+) ms, max ([\d.]+) ms, size (\d+) B", l)
        if m and where:
            t[where][m.group(1)] = {"reps": int(m.group(2)), "median_ms": float(m.group(3)),
                                    "min_ms": float(m.group(4)), "max_ms": float(m.group(5)),
                                    "size_b": int(m.group(6))}
    out["timing"] = t
    return out


# ---------------- language to kernel ----------------
FRAME = re.compile(r"^#(\d+)\s+(?:0x[0-9a-f]+ in )?(\S+) \(.*?\)(?: at (\S+))?(?: from (\S+))?$")


def stacks(name):
    blocks, cur = [], None
    for l in readlines(name):
        if l.startswith("=== ENTER"):
            cur = {"call": l[len("=== ENTER "):], "frames": []}
            blocks.append(cur)
        elif l.startswith("=== RETURN"):
            if blocks:
                blocks[-1]["ret"] = l.split("=")[-1].strip()
            cur = None
        elif cur is not None and l.startswith("#"):
            m = FRAME.match(l)
            if m:
                where = m.group(3) or (os.path.basename(m.group(4)) if m.group(4) else "")
                cur["frames"].append([m.group(2), where])
            elif l.startswith("#") and " in " in l:
                cur["frames"].append([l.split(" in ")[1].split(" (")[0], ""])
    return blocks


def lang():
    out = {}
    for n in ("c", "cpp", "rust", "python", "node"):
        ev = sp.parse(rp(f"lang_{n}.strace.txt"))
        main = ev[0]["pid"]
        fd = None
        mine = []
        for e in ev:
            if e["name"] == "openat" and "/work/hello.txt" in e["args"]:
                fd = e["ret"].split("<")[0].strip()
                mine.append(e)
            elif fd and e["pid"] == main and e["args"].startswith(fd + "<"):
                mine.append(e)
                if e["name"] == "close":
                    fd = None
        kinds = collections.Counter(e["kind"] for e in ev if e["name"] not in ("SIGNAL", "EXIT"))
        out[n] = {"total": sum(1 for e in ev if e["name"] not in ("SIGNAL", "EXIT")),
                  "processes_threads": len({e["pid"] for e in ev}),
                  "kinds": dict(kinds),
                  "file": [short(e["name"] + "(" + e["args"] + ") = " + e["ret"], 130) for e in mine],
                  "stacks": stacks(f"lang_{n}.stacks.txt")}
    return out


# ---------------- interpreter start-up ----------------
def startup():
    ev = sp.parse(rp("startup.strace.txt"))
    calls = [e for e in ev if e["name"] not in ("SIGNAL", "EXIT")]
    so = [re.search(r'"([^"]+)"', e["args"]).group(1) for e in calls
          if e["name"] == "openat" and ".so" in e["args"] and not e["ret"].startswith("-1")]
    return {"total": len(calls), "names": collections.Counter(e["name"] for e in calls).most_common(),
            "enoent": sum(1 for e in calls if "ENOENT" in e["ret"]),
            "so_opened": [os.path.basename(s) for s in so],
            "first": [short(e["name"] + "(" + e["args"] + ") = " + e["ret"], 120) for e in calls[:14]]}


if __name__ == "__main__":
    sys.path.insert(0, HERE)
    import parse_jobs  # noqa: E402

    data = {"env": env(), "import_torch_ms": floats("import_torch_ms.txt"),
            "first_optimizer_ms": floats("first_optimizer_ms.txt"), "first_batch": first_batch(), "epochs": epochs(), "hugepage_stack": hugepage_stack(),
            "job_untraced": readlines("timing_job_untraced.txt"),
            "job_logs": {m: readlines(f"job_{m}.log")[-1] for m in ("fork", "spawn", "forkserver")}, "importtime": importtime(),
            "writes": writes(), "ckpt": ckpt(), "lang": lang(), "startup": startup(),
            "runs": parse_jobs.runs(rp)}
    os.makedirs(os.path.join(TR, "data"), exist_ok=True)
    js = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    with open(os.path.join(TR, "data", "trace_data.json"), "w") as f:
        f.write(js)
    with open(os.path.join(PARTS, "32_js_tr_0data.js"), "w") as f:
        f.write("// ---- Syscall tracer (t-trace): data built by src/trace/scripts/parse.py from src/trace/raw (do not edit) ----\n")
        f.write("window.TRDATA=" + js + ";\n")
    print("trace_data.json", len(js), "bytes")
