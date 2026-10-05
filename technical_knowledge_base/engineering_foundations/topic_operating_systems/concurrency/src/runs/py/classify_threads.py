"""Reads `gdb -batch -ex "thread apply all bt 6"` output on stdin and says, for each thread, what kind of thread it is
and what it is doing, from the function names in its top six frames."""
import re, sys, collections

text = sys.stdin.read()
blocks = re.split(r"\n(?=Thread \d+ \(Thread )", "\n" + text)[1:]
out = collections.Counter()
for b in blocks:
    first = int(re.match(r"Thread (\d+)", b).group(1)) == 1
    s = b
    if first:
        kind = "main thread"
    elif "gomp_" in s or "libgomp" in s:
        kind = "OpenMP pool thread (libgomp)"
    elif "PyThread_acquire_lock" in s:
        kind = "Python threading.Thread"
    elif "thread_main" in s and "libtorch_cpu" in s:
        kind = "libtorch_cpu thread_main"
    else:
        kind = "other native thread"
    if "do_spin" in s:
        doing = "spinning at an OpenMP barrier (do_spin)"
    elif "futex_wait" in s and "gomp" in s:
        doing = "asleep at an OpenMP barrier (futex_wait)"
    elif "PyThread_acquire_lock" in s:
        doing = "asleep on a Python lock (PyThread_acquire_lock_timed)"
    elif re.search(r"in (poll|__GI___poll|ppoll)", s) or " poll ()" in s:
        doing = "in poll()"
    elif re.search(r"in (read|__libc_read)", s):
        doing = "in read()"
    elif "syscall ()" in s:
        doing = "in a system call (futex)"
    elif first:
        doing = "running PyTorch code"
    else:
        doing = "other"
    out[(kind, doing)] += 1
for (kind, doing), n in sorted(out.items()):
    print(f"{n} x {kind}: {doing}")
