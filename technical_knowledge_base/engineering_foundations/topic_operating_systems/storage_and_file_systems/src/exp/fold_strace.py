"""Fold an strace -f -y log into the checkpoint's file operations (between the ckpt phase markers)."""
import re, sys
lines = open(sys.argv[1]).read().splitlines()
on = False; out = []; run = None
def flush():
    global run
    if run: out.append(f"write or writev(fd {run[0]}<{run[1]}>) x {run[2]}, {run[3]:,} bytes in total"); run = None
for l in lines:
    if "/phase/ckpt_begin" in l: on = True; continue
    if "/phase/ckpt_end" in l: break
    if not on or "/data/out" not in l: continue
    l = re.sub(r"^\d+\s+", "", l)
    m = re.match(r'(?:write|writev|pwrite64|pwritev|pwritev2)\((\d+)<([^>]+)>, .*\) = (\d+)', l)
    if m:
        fd, path, n = m.group(1), m.group(2), int(m.group(3))
        if run and run[0] == fd: run[2] += 1; run[3] += n
        else: flush(); run = [fd, path, 1, n]
        continue
    flush()
    l = re.sub(r'"([^"\\]|\\.)*"', lambda m: m.group(0) if "/" in m.group(0) or len(m.group(0)) < 40 else '"..."', l)
    out.append(l.replace("/data/out", "DIR"))
flush()
print("\n".join(x.replace("/data/out", "DIR") for x in out))
