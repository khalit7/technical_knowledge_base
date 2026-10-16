# List processes in a container without ps (the image has none): pid, RSS in MB, command line (first 160 chars).
import os
rows = []
for p in os.listdir("/proc"):
    if not p.isdigit():
        continue
    try:
        rss = 0
        for l in open(f"/proc/{p}/status"):
            if l.startswith("VmRSS:"):
                rss = int(l.split()[1]) // 1024
        cmd = open(f"/proc/{p}/cmdline", "rb").read().replace(b"\0", b" ").decode(errors="replace").strip()
        rows.append((rss, int(p), cmd[:160]))
    except Exception:
        pass
for rss, pid, cmd in sorted(rows, reverse=True):
    if cmd:
        print(f"{pid}\t{rss}\t{cmd}")
