"""The three traced runs of the job (fork, spawn, forkserver) turned into what the tab draws.

Per run:
  lanes   one per process, plus one per process for all of its threads together
  phases  the main process's phase markers (and each child's own markers)
  phase_counts  system calls per phase (all processes) by kind
  density per lane, BINS time bins, counts by kind (the whole run, nothing dropped)
  storms  import storms collapsed into one summary block each (interpreter start-up, import torch,
          the optimizer's lazy imports, a spawned child's imports): counts, files, misses, libraries
  events  every other system call in detail; consecutive identical calls on one thread are merged (xN)
Times are seconds since the first traced call, as seen under strace (inflated: see the tab's note).
"""
import collections
import re

import strace_parse as sp

BINS = 240
KINDS = ["proc", "mem", "file", "ipc", "time", "other", "sig"]
SUBS = [("/opt/venv/lib/python3.11/site-packages/", ".../site-packages/"),
        ("/usr/lib/python3.11/", ".../python3.11/"), ("AT_FDCWD</work>", "AT_FDCWD"),
        ("/usr/lib/aarch64-linux-gnu/", ".../lib/")]
MAIN_PHASES = ["start", "import_torch", "import_done", "dataset_open", "model_build", "optim_build",
               "loader_start", "first_batch", "step_0", "ckpt_begin", "ckpt_end", "exit"]
PHASE_LABEL = {"(before start)": "interpreter start-up", "start": "argparse and set-up",
               "import_torch": "import numpy, torch", "import_done": "between imports and dataset",
               "dataset_open": "open and mmap the dataset", "model_build": "build the model",
               "optim_build": "build the optimizer", "loader_start": "start the DataLoader workers",
               "first_batch": "first batch arrives", "step_0": "training steps (and SIGTERM)",
               "ckpt_begin": "write the checkpoint", "ckpt_end": "shut the workers down", "exit": "exit"}


def tidy(s):
    for a, b in SUBS:
        s = s.replace(a, b)
    return s


BIN = re.compile(r'"((?:[^"\\]|\\.){0,12})(?:[^"\\]|\\.)*\\(?:[^"\\]|\\.)*"(\.\.\.)?')


def short(s, n):
    s = tidy(s.replace("\n", " "))
    s = BIN.sub(lambda m: '"' + m.group(1) + '"...' if "\\" in m.group(0) else m.group(0), s)
    return s if len(s) <= n else s[: n - 3] + "..."


def run(path, detail=None, keep_threads=True):
    ev = sp.parse(path)
    info = sp.roles(ev)
    main = ev[0]["pid"]
    ph = sp.phases(ev)
    t_end = ev[-1]["t"]

    # lanes: each process, then a lane for its threads
    procs = [p for p in info if not info[p]["thread"]]
    procs.sort(key=lambda p: (p != main, p))
    owner = {}
    for p, d in info.items():
        q = p
        while info.get(q, {}).get("thread"):
            q = info[q]["parent"]
        owner[p] = q
    lanes, lane_of = [], {}
    names_seen = {"worker": 0}
    for p in procs:
        role = info[p]["role"]
        if role.startswith("worker"):
            label = "worker %d" % names_seen["worker"]
            names_seen["worker"] += 1
        else:
            label = role
        lanes.append({"label": label, "pid": p, "role": role, "threads": False,
                      "parent": info[p]["parent"], "exec": short(info[p]["exec"] or "", 160)})
        lane_of[p] = len(lanes) - 1
        th = [q for q in info if info[q]["thread"] and owner[q] == p]
        if th:
            lanes.append({"label": label + " threads (%d thread IDs over the run)" % len(th), "pid": p, "role": "threads",
                          "threads": True, "n": len(th), "tids": th})
            for q in th:
                lane_of[q] = len(lanes) - 1
    for e in ev:
        if e["pid"] not in lane_of:  # a pid seen before its clone line (rare): own lane
            lanes.append({"label": "pid %d" % e["pid"], "pid": e["pid"], "role": "?", "threads": False})
            lane_of[e["pid"]] = len(lanes) - 1

    # phases of the main process, and each child's markers
    mph = [(n, i) for p, n, i in ph if p == main]
    phases = [{"name": n, "t": round(ev[i]["t"], 4), "i": i} for n, i in mph]
    child_phases = [{"lane": lane_of[p], "name": n, "t": round(ev[i]["t"], 4)} for p, n, i in ph if p != main]

    # phase counts (all pids), using main-phase time boundaries
    bounds = [("(before start)", 0.0)] + [(n, ev[i]["t"]) for n, i in mph if n in MAIN_PHASES]
    pc = []
    for k, (n, t0) in enumerate(bounds):
        t1 = bounds[k + 1][1] if k + 1 < len(bounds) else t_end + 1
        c = collections.Counter(e["kind"] for e in ev if t0 <= e["t"] < t1)
        top = collections.Counter(e["name"] for e in ev if t0 <= e["t"] < t1).most_common(5)
        pc.append({"phase": n, "label": PHASE_LABEL.get(n, n), "t0": round(t0, 3), "t1": round(min(t1, t_end), 3),
                   "kinds": [c.get(kk, 0) for kk in KINDS], "n": sum(c.values()), "top": top})

    # density
    dens = collections.Counter()
    for e in ev:
        b = min(BINS - 1, int(e["t"] / (t_end or 1) * BINS))
        dens[(lane_of[e["pid"]], b, KINDS.index(e["kind"]))] += 1
    density = [[l, b, k, n] for (l, b, k), n in sorted(dens.items())]

    # storms: index ranges per pid that are collapsed
    storms = []
    by_pid = collections.defaultdict(list)
    for e in ev:
        by_pid[e["pid"]].append(e)
    marks = collections.defaultdict(dict)
    for p, n, i in ph:
        marks[p].setdefault(n, i)
    for p in procs:
        evp = by_pid[p]
        if not evp:
            continue
        m = marks[p]
        spans = []
        first_i = evp[0]["i"]
        if "start" in m:
            spans.append(("interpreter start-up" if (info[p]["exec"] or p == main) else
                          "set-up in the forked child, until train.py's top level runs again", first_i, m["start"]))
        if "import_torch" in m and "import_done" in m:
            spans.append(("import numpy, torch", m["import_torch"], m["import_done"]))
        if "optim_build" in m and "loader_start" in m:
            spans.append(("the optimizer's lazy imports (torch._dynamo, sympy, ...)", m["optim_build"], m["loader_start"]))
        if "start" not in m and info[p]["exec"]:  # an exec'd helper that never reaches our markers
            # collapse its start-up and imports: everything up to its first pipe/socket/clone activity
            stop = next((e["i"] for e in evp if e["name"] in ("clone", "accept4", "recvmsg", "ppoll", "wait4")
                         and e["i"] > first_i + 50), None)
            if stop:
                spans.append(("python start-up and imports", first_i, stop))
        for label, a, b in spans:
            sel = [e for e in evp if a <= e["i"] < b]
            if len(sel) < 30:
                continue
            opened = [e for e in sel if e["name"] == "openat" and not e["ret"].startswith("-1")]
            libs = sorted({re.search(r'"([^"]+)"', e["args"]).group(1).rsplit("/", 1)[-1] for e in opened
                           if re.search(r'"[^"]+\.so[.\d]*"', e["args"])})
            pkgs = collections.Counter()
            for e in opened:
                mm = re.search(r"site-packages/([A-Za-z_0-9]+)", e["args"])
                pkgs[mm.group(1) if mm else ("python stdlib" if "/python3.11/" in e["args"] else "other")] += 1
            storms.append({"lane": lane_of[p], "label": label, "i0": a, "i1": b, "t0": round(sel[0]["t"], 4),
                           "t1": round(sel[-1]["t"], 4), "n": len(sel),
                           "names": collections.Counter(e["name"] for e in sel).most_common(8),
                           "kinds": [sum(1 for e in sel if e["kind"] == kk) for kk in KINDS],
                           "opened": len(opened), "enoent": sum(1 for e in sel if "ENOENT" in e["ret"]),
                           "libs": libs, "pkgs": pkgs.most_common(6),
                           "code_mb": round(sum(int(m2.group(1)) for e in sel if e["name"] == "mmap"
                                           for m2 in [re.match(r"0x[0-9a-f]+, (\d+), PROT_READ\|PROT_EXEC, MAP_PRIVATE\|MAP_FIXED\|MAP_DENYWRITE", e["args"])]
                                           if m2) / 2 ** 20, 1)})
    hidden = set()
    for s in storms:
        p = lanes[s["lane"]]["pid"]
        hidden.update(e["i"] for e in by_pid[p] if s["i0"] <= e["i"] < s["i1"])

    # detailed events: everything else; merge consecutive identical calls on one thread
    names, name_ix = [], {}
    out, last = [], {}
    lo, hi = 0, len(ev)
    if detail:  # keep detail only between two main-process phase markers
        mk = {n: i for n, i in mph}
        lo, hi = mk[detail[0]], mk[detail[1]]
    n_thread_futex = 0
    IMP = re.compile(r"\.pyc|\.py\b|__pycache__|site-packages|/python3\.11|\.so\b|\.cpython-311")
    imp_run = {}  # pid -> index in out of the open IMPORT row
    for e in ev:
        if e["i"] in hidden or not lo <= e["i"] < hi:
            continue
        nm = e["name"]
        if nm in ("newfstatat", "openat", "read", "close", "lseek", "ioctl", "getdents64", "fstat", "readlinkat", "fcntl") and IMP.search(e["args"]):
            j = imp_run.get(e["pid"])
            mod = re.search(r'([A-Za-z_0-9]+)\.cpython-311\.pyc"', e["args"]) if nm == "openat" else None
            if j is not None:
                out[j][3] += 1
                if mod:
                    out[j][5] += " " + mod.group(1)
                continue
            if "IMPORT" not in name_ix:
                name_ix["IMPORT"] = len(names)
                names.append("IMPORT")
            out.append([lane_of[e["pid"]], round(e["t"] * 1000, 1), name_ix["IMPORT"], 1, 0, mod.group(1) if mod else ""])
            imp_run[e["pid"]] = len(out) - 1
            last[e["pid"]] = None
            continue
        if e["pid"] in imp_run and nm not in ("mmap", "munmap", "brk"):
            imp_run.pop(e["pid"])
        if not keep_threads and info.get(e["pid"], {}).get("thread"):
            n_thread_futex += 1
            continue
        if nm == "futex" and info.get(e["pid"], {}).get("thread"):
            n_thread_futex += 1
            continue
        if nm not in name_ix:
            name_ix[nm] = len(names)
            names.append(nm)
        ln = lane_of[e["pid"]]
        th = info.get(e["pid"], {}).get("thread")
        txt = short(e["args"], 48 if th else 72) + ("" if nm in ("SIGNAL", "EXIT") else " = " + short(e["ret"], 24 if th else 32))
        key = e["pid"]
        prev = last.get(key)
        if prev is not None and prev[2] != name_ix.get("IMPORT", -1) and prev[2] == name_ix[nm] and nm not in ("faccessat", "SIGNAL", "EXIT", "clone", "clone3", "execve", "kill", "renameat", "fsync", "openat"):
            out[prev[6]][3] += 1
            continue
        row = [ln, round(e["t"] * 1000, 1), name_ix[nm], 1, round(e["dur"] * 1e6), txt]
        out.append(row)
        last[key] = (ln, row[1], name_ix[nm], 1, 0, txt, len(out) - 1)
    lines = "\n".join("%d|%d|%d|%d|%d|%s" % (r[0], round(r[1] * 10), r[2], r[3], r[4], r[5].replace("\n", " "))
                       for r in out)
    return {"detail_window": list(detail) if detail else None, "thread_calls_omitted": n_thread_futex, "keep_threads": keep_threads,
            "t_end": round(t_end, 3), "n_total": len(ev), "lanes": lanes, "phases": phases,
            "child_phases": child_phases, "phase_counts": pc, "density": density, "bins": BINS,
            "storms": [{k: v for k, v in s.items() if k not in ("i0", "i1")} for s in storms],
            "names": names, "events": lines, "n_detail_calls": len(ev) - len(hidden)}


def runs(rp):
    return {"fork": run(rp("job_fork.strace.txt")),
            "spawn": run(rp("job_spawn.strace.txt"), ("loader_start", "first_batch"), False),
            "forkserver": run(rp("job_forkserver.strace.txt"), ("loader_start", "first_batch"), False)}
