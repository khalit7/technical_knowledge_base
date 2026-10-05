# gdb Python script: print the user-space call stack at each system call a program makes on one file.
# Catches openat, read, fstat/newfstatat, statx, lseek and close; prints a stack only at syscall ENTRY
# (gdb stops at both entry and return), and only for calls on the target file (by path for openat,
# then by the file descriptor openat returned). arm64: syscall args are in x0..x5, the result in x0.
# Usage: gdb -q -batch -iex "set debuginfod enabled on" -x stacks.gdb.py --args <program...>
# The target path comes from the environment variable TARGET (default /work/hello.txt).
import os
import gdb

TARGET = os.environ.get("TARGET", "/work/hello.txt")
NAMES = ["openat", "read", "close", "fstat", "newfstatat", "statx", "lseek"]
gdb.execute("set pagination off")
gdb.execute("set confirm off")
gdb.execute("set print frame-arguments none")
gdb.execute("set print address off")
gdb.execute("catch syscall 56 63 57 80 79 291 62")  # numbers: gdb lacks names for some arm64 calls

state = {"fd": None, "pending_open": False, "entry": {}, "done": False}


def reg(name):
    return int(gdb.parse_and_eval("$" + name))


def on_stop(ev):
    if not isinstance(ev, gdb.StopEvent):
        return
    th = gdb.selected_thread().ptid
    try:
        nr = reg("x8")  # syscall number on arm64 (valid at entry; preserved at return)
    except gdb.error:
        return
    key = (th, nr)
    entering = not state["entry"].get(key, False)
    state["entry"][key] = entering
    names = {56: "openat", 63: "read", 57: "close", 80: "fstat", 79: "newfstatat", 291: "statx", 62: "lseek"}
    name = names.get(nr, str(nr))
    if name == "openat":
        if entering:
            try:
                path = gdb.parse_and_eval("(char*)$x1").string()
            except gdb.error:
                path = ""
            if path == TARGET:
                state["pending_open"] = True
                print("=== ENTER openat(%s)" % path)
                gdb.execute("bt 40")
        elif state["pending_open"]:
            state["pending_open"] = False
            state["fd"] = reg("x0")
            print("=== RETURN openat = %d" % state["fd"])
        return
    fd = state["fd"]
    if fd is None:
        return
    if entering and reg("x0") == fd:
        print("=== ENTER %s(fd=%d)" % (name, fd))
        gdb.execute("bt 40")
        if name == "close":
            state["fd"] = None
    elif not entering and name == "read" and state["fd"] is not None:
        pass


gdb.events.stop.connect(on_stop)


def cont():
    while True:
        try:
            gdb.execute("continue")
        except gdb.error:
            break
        if not gdb.selected_inferior().pid:
            break


gdb.execute("run")
cont()
