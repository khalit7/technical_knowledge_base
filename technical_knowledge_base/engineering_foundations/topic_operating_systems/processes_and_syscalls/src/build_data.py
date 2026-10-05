"""Build parts/22_js_data.js (window.PD) from the recorded outputs in runs/out/.
Every measured number the page shows comes from here; check_embed.py rebuilds it and compares.
Run from src/: python3 build_data.py"""
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "runs", "out")


def read(name):
    with open(os.path.join(OUT, name)) as f:
        return f.read()


def section(text, title):
    """Lines after '== <title>' up to the next '== ' header."""
    m = re.search(r"^== " + re.escape(title) + r"[^\n]*\n(.*?)(?=^== |\Z)", text, re.S | re.M)
    return m.group(1) if m else ""


def build():
    c = read("c_runs.txt")
    pd = {}
    # E1 spawn cost
    rows = []
    for line in section(c, "E1 spawn_cost").splitlines()[1:]:
        p = line.split()
        if len(p) == 7:
            rows.append({"mib": int(p[0]), "pte_kib": int(p[1]), "m": p[2], "med": float(p[3]), "p10": float(p[4]), "p90": float(p[5]), "n": int(p[6])})
    pd["spawn"] = rows
    # E2 signals
    s = section(c, "E2 sigqueue")
    m = re.search(r"sent (\d+) SIGUSR1, handler ran (\d+) times; sent (\d+) SIGRTMIN, handler ran (\d+) times", s)
    m2 = re.search(r"read (\d+) SIGUSR1 records and (\d+) SIGRTMIN records", s)
    pd["sigq"] = {"sent": int(m.group(1)), "usr1": int(m.group(2)), "rt": int(m.group(4)), "sfd_usr1": int(m2.group(1)), "sfd_rt": int(m2.group(2)),
                  "sigpending": int(re.search(r"RLIMIT_SIGPENDING soft (\d+)", s).group(1)), "raw": s.strip()}
    # E3 pipes
    s = section(c, "E3 pipes")
    pd["pipe"] = {"size": int(re.search(r"F_GETPIPE_SZ (\d+)", s).group(1)), "pipe_buf": int(re.search(r"PIPE_BUF (\d+)", s).group(1)),
                  "filled": int(re.search(r"before EAGAIN (\d+)", s).group(1)), "max": int(re.search(r"pipe-max-size (\d+)", s).group(1)), "raw": s.strip()}
    # E4, E5, E6, E14 raw text blocks
    pd["fdshare"] = section(c, "E4 fdshare").strip()
    s = section(c, "E5 cloexec")
    t = [float(x) for x in re.findall(r"EOF after ([\d.]+) s", s)]
    pd["cloexec"] = {"leak_s": t[0], "cloexec_s": t[1], "raw": s.strip()}
    pd["lifecycle"] = section(c, "E6 lifecycle").strip()
    pd["reparent"] = read("c_reparent.txt").strip()
    pd["execkeep"] = read("c_exec.txt").strip()  # E14b; the E14 block in c_runs.txt is the superseded /bin/sh version
    pd["clones"] = read("clone_flags.txt").strip()
    # E9
    s = section(c, "E9 sysc")
    v = [float(x) for x in re.findall(r"getppid_ns_per_call ([\d.]+)", s)]
    py = float(re.search(r"python_os_getppid_ns_per_call ([\d.]+)", c).group(1))
    pd["sysc"] = {"plain_ns": v[0], "strace_ns": v[1], "py_ns": py}
    dis = section(c, "E9 gdb")
    pd["disasm"] = [l.rstrip() for l in dis.splitlines() if l.strip().startswith("0x")]
    meta = read("strace_meta.txt")
    blocks = re.split(r"^== .*sysc (\d+).*$", meta, flags=re.M)
    calls = {}
    for i in range(1, len(blocks), 2):
        n = int(blocks[i]); d = {}
        for l in blocks[i + 1].splitlines():
            p = l.split()
            if len(p) >= 5 and p[-1] in ("wait4", "ptrace", "write") and p[0][0].isdigit():
                d[p[-1]] = int(p[3])
        calls[n] = d
    a, b = calls[1000], calls[2000]
    pd["strace_meta"] = {k: round((b[k] - a[k]) / 5000, 2) for k in ("wait4", "ptrace", "write")}
    pd["env"] = section(c, "env").strip().splitlines()
    # P1 handler latency
    lat = []
    for l in read("py_handler_latency.txt").splitlines():
        p = l.split("|")
        if len(p) == 5:
            lat.append({"case": p[0], "rep": int(p[1].split()[1]), "work_s": float(p[2].split()[1]),
                        "handler_ms": float(p[3].split()[1]), "left_ms": float(p[4].split()[-2])})
    pd["latency"] = lat
    # P2 python spawn
    sp = []
    for l in read("py_spawn.txt").splitlines():
        p = l.split("|")
        if len(p) >= 6:
            d = {"label": p[0]}
            for kv in p[1:]:
                k, val = kv.rsplit(" ", 1); d[k.replace(".", "_").replace(" ", "_")] = float(val)
            sp.append(d)
    pd["pyspawn"] = sp
    # P3 /proc snapshot
    pd["proc"] = read("proc_snapshot.txt").replace("\t", " ").strip()
    # Shutdown lab
    runs = []
    for f in sorted(glob.glob(os.path.join(OUT, "shutdown", "*.txt"))):
        txt = open(f).read()
        name = os.path.basename(f)[:-4]
        v, r = name.rsplit("_", 1)
        runs.append({"v": v, "rep": int(r), "stop_s": float(re.search(r"stop_seconds ([\d.]+)", txt).group(1)),
                     "code": int(re.search(r"exit_code (\d+)", txt).group(1)),
                     "got_signal": len(re.findall(r"got signal 15", txt)),
                     "ckpt": "phase ckpt_end" in txt, "worker_killed": "is killed by signal: Terminated" in txt,
                     "tree": txt.split("--- process tree before stop (ps inside the container)\n")[1].split("--- result")[0].rstrip(),
                     "log": txt.split("--- container log (per-step lines dropped except the last 3)\n")[1].rstrip()})
    pd["shutdown"] = runs
    with open(os.path.join(HERE, "inputs", "ostep_fork_cases.json")) as f:
        pd["ostep"] = json.load(f)
    return pd


def js(pd):
    return "// Generated by src/build_data.py from src/runs/out/ (do not edit by hand).\nwindow.PD=" + json.dumps(pd, separators=(",", ":"), ensure_ascii=False) + ";\n"


if __name__ == "__main__":
    out = js(build())
    with open(os.path.join(HERE, "parts", "22_js_data.js"), "w") as f:
        f.write(out)
    print("wrote parts/22_js_data.js", len(out), "bytes")
