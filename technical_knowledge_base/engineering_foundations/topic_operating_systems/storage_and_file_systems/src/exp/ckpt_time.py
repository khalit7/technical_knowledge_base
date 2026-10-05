"""Checkpoint write paths for a 256 MiB training state (a 32M-parameter MLP's weights plus SGD momentum),
on ext4 (/data). Each protocol 5 times; medians. Reports the time until the call returns, the dirty page
cache left behind (this cgroup's memory.stat file_dirty) and, for DCP, the files written.
usage: ckpt_time.py <dir>"""
import os, sys, time, statistics, glob
import torch, torch.distributed as dist
import torch.distributed.checkpoint as dcp
from torch.distributed.checkpoint import FileSystemWriter
torch.set_num_threads(1)
d = sys.argv[1]
def dirty():
    m = dict(l.split() for l in open("/sys/fs/cgroup/memory.stat")); return int(m["file_dirty"]) / 2**20
torch.manual_seed(0)
model = torch.nn.Sequential(*[torch.nn.Linear(2048, 2048) for _ in range(8)])  # 8 x 4.2M = 33.6M params
opt = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9)
model(torch.randn(4, 2048)).sum().backward(); opt.step()
state = {"step": 200, "model": model.state_dict(), "opt": opt.state_dict()}
nbytes = sum(p.numel() * 4 for p in model.parameters()) * 2
print(f"state: {sum(p.numel() for p in model.parameters()):,} parameters, weights + momentum = {nbytes / 2**20:.0f} MiB")
def run(label, fn, reps=5):
    rows = []
    for _ in range(reps):
        for f in glob.glob(os.path.join(d, "*")):
            if os.path.isfile(f): os.unlink(f)
        fd = os.open(d, os.O_RDONLY); os.fsync(fd); os.close(fd)
        time.sleep(0.5)
        t = time.perf_counter(); extra = fn(); el = time.perf_counter() - t
        rows.append((el, dirty(), extra))
    med = statistics.median(r[0] for r in rows); dm = statistics.median(r[1] for r in rows)
    ex = rows[len(rows) // 2][2] or ""
    print(f"{label:<52} median {med*1e3:8.1f} ms  min {min(r[0] for r in rows)*1e3:8.1f}  max {max(r[0] for r in rows)*1e3:8.1f}  dirty after {dm:6.1f} MiB {ex}")
P = os.path.join(d, "ckpt.pt")
def naive(): torch.save(state, P)
def with_fsync():
    with open(P, "wb") as f:
        torch.save(state, f); f.flush()
        t = time.perf_counter(); os.fsync(f.fileno()); return f"(fsync {1e3*(time.perf_counter()-t):.0f} ms)"
def safe():
    tmp = P + ".tmp"
    with open(tmp, "wb") as f:
        torch.save(state, f); f.flush(); t = time.perf_counter(); os.fsync(f.fileno()); tf = time.perf_counter() - t
    os.replace(tmp, P); dfd = os.open(d, os.O_RDONLY); t = time.perf_counter(); os.fsync(dfd); td = time.perf_counter() - t; os.close(dfd)
    return f"(file fsync {tf*1e3:.0f} ms, directory fsync {td*1e3:.1f} ms)"
run("torch.save straight to ckpt.pt", naive)
run("torch.save + flush + fsync", with_fsync)
run("tmp + fsync + rename + fsync(dir)", safe)
os.environ.update(MASTER_ADDR="127.0.0.1", MASTER_PORT="29531")
dist.init_process_group("gloo", rank=0, world_size=1)
def dcp_save(sync, threads):
    def f():
        dcp.save(state, storage_writer=FileSystemWriter(os.path.join(d, "dcp"), sync_files=sync, thread_count=threads))
        fs = sorted(os.listdir(os.path.join(d, "dcp")))
        return "files: " + ", ".join(fs)
    return f
for sync, th in ((True, 1), (False, 1), (True, 4)):
    import shutil
    def g(sync=sync, th=th):
        shutil.rmtree(os.path.join(d, "dcp"), ignore_errors=True); return dcp_save(sync, th)()
    run(f"dcp.save FileSystemWriter(sync_files={sync}, thread_count={th})", g)
def asave():
    import shutil; shutil.rmtree(os.path.join(d, "dcpa"), ignore_errors=True)
    t = time.perf_counter()
    fut = dcp.async_save(state, storage_writer=FileSystemWriter(os.path.join(d, "dcpa")))
    back = time.perf_counter() - t
    fut.result()
    return f"(training could resume after {back*1e3:.0f} ms)"
run("dcp.async_save, then wait for the future", asave)
dist.destroy_process_group()
