"""Sample this container's memory cgroup every 25 ms until /tmp/stop exists; print one line per sample.
Columns: t_ms current_kib anon_kib file_kib shmem_kib swap_kib max_events oom_kill high_events"""
import os, time
CG = "/sys/fs/cgroup/"
def stat():
    d = {}
    for line in open(CG + "memory.stat"):
        k, v = line.split(); d[k] = int(v)
    return d
def events():
    d = {}
    for line in open(CG + "memory.events"):
        k, v = line.split(); d[k] = int(v)
    return d
t0 = time.time(); out = []
while not os.path.exists("/tmp/stop"):
    s, e = stat(), events()
    cur = int(open(CG + "memory.current").read()); sw = int(open(CG + "memory.swap.current").read())
    out.append(f"s {int((time.time() - t0) * 1000)} {cur >> 10} {s['anon'] >> 10} {s['file'] >> 10} {s['shmem'] >> 10} {sw >> 10} {e['max']} {e['oom_kill']} {e['high']}")
    time.sleep(0.025)
open("/tmp/samples.txt", "w").write("\n".join(out) + "\n")
