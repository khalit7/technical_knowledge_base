"""Where PyTorch CPU tensors get their memory on this arm64 Linux wheel (mimalloc built into libc10.so) and
where NumPy arrays get theirs (glibc malloc), traced. Run under:
  strace -f -e trace=mmap,munmap,madvise,brk,write python torch_cpu.py
Markers are written to stderr so the trace can be cut into phases."""
import os, sys
import numpy as np, torch
def rss_mib():
    with open("/proc/self/statm") as f:
        return int(f.read().split()[1]) * 4096 / 2**20
def mark(s): os.write(2, f"--- {s} (rss {rss_mib():.1f} MiB)\n".encode())
mark("start")
for n in (4 << 10, 1 << 20, 64 << 20):
    mark(f"torch.empty({n} bytes) and fill"); t = torch.empty(n, dtype=torch.uint8); t.fill_(1)
    mark("del tensor"); del t
    mark(f"np.empty({n} bytes) and fill"); a = np.empty(n, dtype=np.uint8); a.fill(1)
    mark("del array"); del a
import time; time.sleep(0.2); x = torch.empty(64, dtype=torch.uint8)  # one more call lets mimalloc purge
mark("end, after 0.2 s and one more small tensor")
