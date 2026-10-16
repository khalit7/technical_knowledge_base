#!/usr/bin/env python3
"""Storage lab: write and read one training checkpoint to one storage target, timed.

The checkpoint is the running example's own (train.py's GPT + AdamW after one step, saved the way
train.py saves it: torch.save of {"model", "opt", "step"} to a .tmp file, then rename), at three sizes:
  ex   : the running example as configured (d 64, 2 layers): 112,577 parameters, 1,386,049 bytes
  m    : the same GPT at d 256, 4 layers
  l    : the same GPT at d 512, 8 layers
Write = torch.save + flush + fsync + rename (+ fsync of the directory), so the bytes are on the device
(--fsync 2 on macOS uses F_FULLFSYNC, which also flushes the drive's write cache; plain fsync there does not)
(train.py itself does not fsync; see the page). Read = torch.load after dropping this file from the page
cache (posix_fadvise DONTNEED on Linux, F_NOCACHE on macOS), so it comes from the device.

usage: ckpt_io.py --train-py PATH --target DIR --label NAME [--sizes ex,m,l] [--reps 5] [--fsync 0|1|2]
Prints one JSON object per measurement.
"""
import argparse, importlib.util, io, json, os, sys, time, platform
import torch

SIZES = {"ex": (64, 2, 2), "m": (256, 4, 4), "l": (512, 8, 8)}


def load_train(path):
    spec = importlib.util.spec_from_file_location("mi_train", path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod


def make_state(T, d, layers, heads):
    torch.manual_seed(1234)
    m = T.GPT(65, d, layers, heads, 64)
    opt = torch.optim.AdamW(m.parameters(), lr=3e-3)
    x = torch.randint(65, (8, 64))
    torch.nn.functional.cross_entropy(m(x).view(-1, 65), x.view(-1)).backward(); opt.step()
    return {"model": m.state_dict(), "opt": opt.state_dict(), "step": 1}, sum(p.numel() for p in m.parameters())


def drop_cache(path):
    fd = os.open(path, os.O_RDONLY)
    try:
        if hasattr(os, "posix_fadvise"):
            os.posix_fadvise(fd, 0, 0, os.POSIX_FADV_DONTNEED); return "fadvise"
        import fcntl
        fcntl.fcntl(fd, 48, 1)  # F_NOCACHE on macOS
        return "f_nocache"
    finally:
        os.close(fd)


def read_cold(path):
    if hasattr(os, "posix_fadvise"):
        drop_cache(path)
        t = time.perf_counter(); st = torch.load(path, map_location="cpu", weights_only=True); return time.perf_counter() - t, st
    import fcntl
    t = time.perf_counter()
    with open(path, "rb", buffering=0) as f:
        fcntl.fcntl(f.fileno(), 48, 1)
        buf = f.read()
    st = torch.load(io.BytesIO(buf), map_location="cpu", weights_only=True)
    return time.perf_counter() - t, st


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--train-py", required=True); p.add_argument("--target", required=True)
    p.add_argument("--label", required=True); p.add_argument("--sizes", default="ex,m,l")
    p.add_argument("--reps", type=int, default=5); p.add_argument("--fsync", type=int, default=1)
    a = p.parse_args()
    torch.set_num_threads(2)
    T = load_train(a.train_py)
    os.makedirs(a.target, exist_ok=True)
    for sz in a.sizes.split(","):
        st, n = make_state(T, *SIZES[sz])
        for rep in range(a.reps):
            name = os.path.join(a.target, "step_000050.pt")  # the running example's file name (torch.save stores it in every zip entry)
            t0 = time.perf_counter()
            torch.save(st, name + ".tmp")  # a path string, as train.py does
            t_ser = time.perf_counter()
            with open(name + ".tmp", "rb+") as f:
                if a.fsync == 2:  # macOS: fsync() does not flush the drive's cache; F_FULLFSYNC does
                    import fcntl; fcntl.fcntl(f.fileno(), fcntl.F_FULLFSYNC)
                elif a.fsync: os.fsync(f.fileno())
            t_sync = time.perf_counter()
            os.replace(name + ".tmp", name)
            if a.fsync:
                dfd = os.open(a.target, os.O_RDONLY)
                try: os.fsync(dfd)
                finally: os.close(dfd)
            t_w = time.perf_counter() - t0
            nbytes = os.path.getsize(name)
            t_r, back = read_cold(name)
            ok = torch.equal(back["model"]["head.weight"], st["model"]["head.weight"])
            print(json.dumps({"label": a.label, "size": sz, "params": n, "bytes": nbytes, "rep": rep,
                              "write_s": round(t_w, 5), "save_s": round(t_ser - t0, 5), "fsync_s": round(t_sync - t_ser, 5),
                              "read_s": round(t_r, 5), "ok": ok, "fsync": a.fsync, "os": platform.system(), "torch": torch.__version__}), flush=True)
            os.remove(name)


if __name__ == "__main__":
    main()
