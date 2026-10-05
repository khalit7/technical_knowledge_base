"""Try eight privileged operations and print ok or the error, plus the effective capability set.
Each maps to one capability (capabilities(7)); ML jobs hit the last three."""
import ctypes, mmap, os, resource, socket, subprocess
def tryit(name, f):
    try: f(); r = "ok"
    except OSError as e: r = os.strerror(e.errno) if e.errno else str(e)
    except Exception as e: r = type(e).__name__ + ": " + str(e)
    print(f"{name:44s} {r}", flush=True)
cap = [l.split()[1] for l in open("/proc/self/status") if l.startswith("CapEff")][0]
print(f"uid {os.getuid()} CapEff {cap}")
open("/tmp/f", "w").close()
tryit("chown a file to 1234 (CAP_CHOWN)", lambda: os.chown("/tmp/f", 1234, 1234))
def bind80():
    s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(("0.0.0.0", 80)); s.close()
tryit("bind port 80 (CAP_NET_BIND_SERVICE)", bind80)
def mtu():
    r = subprocess.run(["ip", "link", "set", "lo", "mtu", "1500"], capture_output=True, text=True)
    if r.returncode: raise OSError(1, r.stderr.strip())
tryit("ip link set lo mtu (CAP_NET_ADMIN)", mtu)
def mnt():
    r = subprocess.run(["mount", "-t", "tmpfs", "none", "/mnt"], capture_output=True, text=True)
    if r.returncode: raise OSError(1, r.stderr.strip())
tryit("mount tmpfs (CAP_SYS_ADMIN)", mnt)
tryit("mknod /tmp/null c 1 3 (CAP_MKNOD)", lambda: os.mknod("/tmp/null", 0o600 | 0o020000, os.makedev(1, 3)))
tryit("nice -5, a higher priority (CAP_SYS_NICE)", lambda: os.setpriority(os.PRIO_PROCESS, 0, -5))
s0, h0 = resource.getrlimit(resource.RLIMIT_NOFILE)
resource.setrlimit(resource.RLIMIT_NOFILE, (1024, h0 - 1))  # lowering is always allowed
tryit("raise the RLIMIT_NOFILE hard limit back up (CAP_SYS_RESOURCE)", lambda: resource.setrlimit(resource.RLIMIT_NOFILE, (1024, h0)))
def lock():
    libc = ctypes.CDLL(None, use_errno=True); libc.mlock.argtypes = [ctypes.c_void_p, ctypes.c_size_t]; m = mmap.mmap(-1, 64 << 20)
    buf = ctypes.c_char.from_buffer(m); r = libc.mlock(ctypes.addressof(buf), 64 << 20); e = ctypes.get_errno()
    del buf; m.close()
    if r: raise OSError(e, os.strerror(e))
tryit("mlock 64 MiB (pinned memory; CAP_IPC_LOCK)", lock)
