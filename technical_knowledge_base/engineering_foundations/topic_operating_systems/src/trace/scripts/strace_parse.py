"""Parse `strace -f -tt -T -y` output into events, phases and process roles.

One event per system call (an `<unfinished ...>` line and its `<... resumed>` line are merged, keeping the
start time), plus signal deliveries (`--- SIGTERM ...`) and exits (`+++ exited with 0 +++`).
"""
import gzip
import re

LINE = re.compile(r"^(\d+)\s+(\d\d):(\d\d):(\d\d\.\d+) (.*)$")
RET = re.compile(r"\) += (.*?)(?: <(\d+\.\d+)>)?$")
RESUMED = re.compile(r"^<\.\.\. (\w+) resumed>(.*)$")
CALL = re.compile(r"^(\w+)\((.*)$")

KIND = {}
for k, names in {
    "proc": "execve clone clone3 fork vfork wait4 waitid exit exit_group kill tgkill tkill getpid gettid getppid "
            "set_tid_address set_robust_list rseq prctl prlimit64 setsid getuid geteuid getgid getegid "
            "rt_sigaction rt_sigprocmask rt_sigreturn sigaltstack sched_getaffinity sched_setaffinity "
            "sched_yield sched_getparam sched_getscheduler capget uname getrlimit setrlimit pidfd_open "
            "restart_syscall getpgid setpgid getresuid getresgid",
    "mem": "mmap munmap mprotect brk madvise mremap membarrier mlock munlock mincore",
    "file": "openat open close read write pread64 pwrite64 readv writev lseek newfstatat fstat fstatat64 statx "
            "getdents64 readlinkat readlink faccessat faccessat2 access fcntl ioctl fsync fdatasync renameat "
            "renameat2 unlinkat mkdirat ftruncate fallocate getcwd dup dup3 flock statfs fstatfs chdir "
            "fchmod fchmodat fchown utimensat close_range copy_file_range sendfile sync_file_range",
    "ipc": "pipe2 socketpair socket connect bind listen accept accept4 sendmsg recvmsg sendto recvfrom "
           "poll ppoll pselect6 select epoll_create1 epoll_ctl epoll_pwait epoll_wait futex eventfd2 "
           "memfd_create shutdown getsockopt setsockopt getsockname getpeername",
    "time": "clock_gettime clock_nanosleep nanosleep gettimeofday getrandom timerfd_create timerfd_settime "
            "clock_getres sysinfo",
}.items():
    for n in names.split():
        KIND[n] = k


def kind_of(name, args=""):
    if name in ("openat", "unlinkat", "ftruncate", "mmap", "close", "fstat", "newfstatat") and "/dev/shm" in args:
        return "ipc"  # shared memory between processes is a file in /dev/shm
    return KIND.get(name, "other")


def open_text(path):
    return gzip.open(path, "rt", encoding="utf-8", errors="replace") if path.endswith(".gz") else open(
        path, encoding="utf-8", errors="replace")


def parse(path):
    events, pending = [], {}
    t0 = None
    for raw in open_text(path):
        raw = raw.rstrip("\n")
        m = LINE.match(raw)
        if not m:
            continue
        pid = int(m.group(1))
        t = int(m.group(2)) * 3600 + int(m.group(3)) * 60 + float(m.group(4))
        if t0 is None:
            t0 = t
        t -= t0
        rest = m.group(5)
        if rest.startswith("---"):
            events.append({"pid": pid, "t": t, "name": "SIGNAL", "args": rest.strip("- "), "ret": "", "dur": 0.0,
                           "line": raw})
            continue
        if rest.startswith("+++"):
            events.append({"pid": pid, "t": t, "name": "EXIT", "args": rest.strip("+ "), "ret": "", "dur": 0.0,
                           "line": raw})
            continue
        rm = RESUMED.match(rest)
        if rm:
            name, tail = rm.group(1), rm.group(2)
            ev = pending.pop((pid, name), None)
            if ev is None:
                continue
            r = RET.search(tail)
            ev["args"] += tail[: r.start()] if r else tail
            ev["ret"] = r.group(1) if r else "?"
            ev["dur"] = float(r.group(2)) if r and r.group(2) else 0.0
            ev["line"] += " ... " + rest
            continue
        cm = CALL.match(rest)
        if not cm:
            continue
        name, tail = cm.group(1), cm.group(2)
        if tail.endswith("<unfinished ...>"):
            ev = {"pid": pid, "t": t, "name": name, "args": tail[: -len("<unfinished ...>")].rstrip(), "ret": "",
                  "dur": 0.0, "line": raw}
            pending[(pid, name)] = ev
            events.append(ev)
            continue
        r = RET.search(tail)
        if not r:  # e.g. exit_group(0) = ?
            r2 = re.search(r"\) += (\?)$", tail)
            events.append({"pid": pid, "t": t, "name": name, "args": tail[: r2.start()] if r2 else tail,
                           "ret": "?", "dur": 0.0, "line": raw})
            continue
        events.append({"pid": pid, "t": t, "name": name, "args": tail[: r.start()], "ret": r.group(1),
                       "dur": float(r.group(2)) if r.group(2) else 0.0, "line": raw})
    for i, e in enumerate(events):
        e["i"] = i
        e["kind"] = "sig" if e["name"] == "SIGNAL" else ("proc" if e["name"] == "EXIT" else kind_of(e["name"], e["args"]))
    return events


PHASE = re.compile(r'"/phase/(\w+)"')


def phases(events):
    """[(pid, name, event index)] from the faccessat("/phase/<name>") markers."""
    out = []
    for e in events:
        if e["name"] in ("faccessat", "faccessat2", "access"):
            m = PHASE.search(e["args"])
            if m:
                out.append((e["pid"], m.group(1), e["i"]))
    return out


def roles(events):
    """Who each pid is: main, thread of X, worker (fork), spawned python, resource tracker, forkserver."""
    first = events[0]["pid"]
    info = {first: {"parent": None, "role": "main", "thread": False, "exec": None}}
    for e in events:
        if e["name"] in ("clone", "clone3") and e["ret"].strip().split(" ")[0].isdigit():
            child = int(e["ret"].strip().split(" ")[0])
            is_thread = "CLONE_THREAD" in e["args"]
            info[child] = {"parent": e["pid"], "role": "thread" if is_thread else "child", "thread": is_thread,
                           "exec": None}
        elif e["name"] == "execve" and e["pid"] in info and e["ret"].startswith("0"):
            info[e["pid"]]["exec"] = e["args"][:300]
    for pid, d in info.items():
        a = d["exec"] or ""
        if "from multiprocessing.resource_tracker import" in a:
            d["role"] = "resource tracker"
        elif "from multiprocessing.forkserver import" in a:
            d["role"] = "forkserver"
        elif "from multiprocessing.spawn import" in a:
            d["role"] = "worker (spawn)"
        elif d["role"] == "child":
            par = info.get(d["parent"], {})
            d["role"] = "worker (fork of %s)" % (par.get("role", "?"))
    return info
