"""Disk full while a checkpoint is being written, with and without the write-then-rename pattern.
The checkpoint directory is a small tmpfs (docker --tmpfs /ckpt:size=10m) that other files share.
Usage: ckpt_full.py naive|rename"""
import os, sys
import torch

D = "/ckpt"; PATH = os.path.join(D, "ckpt.pt")
torch.manual_seed(0)
model = torch.nn.Sequential(torch.nn.Linear(1024, 512), torch.nn.Linear(512, 512))  # about 3 MiB of float32
opt = torch.optim.SGD(model.parameters(), lr=0.1, momentum=0.9)


def save_naive(obj, path):
    torch.save(obj, path)  # opens path with O_TRUNC: the old checkpoint is gone before the new one exists


def save_rename(obj, path):
    tmp = path + ".tmp"
    try:
        with open(tmp, "wb") as f:
            torch.save(obj, f); f.flush(); os.fsync(f.fileno())
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)  # do not leave the partial file behind
        raise
    os.replace(tmp, path)
    dfd = os.open(D, os.O_RDONLY); os.fsync(dfd); os.close(dfd)


save = save_naive if sys.argv[1] == "naive" else save_rename
save({"step": 100, "model": model.state_dict()}, PATH)  # step 100: model only
print(f"step 100 checkpoint: {os.path.getsize(PATH)} bytes")
with open(os.path.join(D, "logs.bin"), "wb") as f:  # other files fill the volume meanwhile
    f.write(os.urandom(5 << 20))
model(torch.randn(8, 1024)).sum().backward(); opt.step()  # the optimizer now holds momentum buffers
st = os.statvfs(D); print(f"free space before the step 200 save: {st.f_bavail * st.f_frsize} bytes")
try:
    save({"step": 200, "model": model.state_dict(), "opt": opt.state_dict()}, PATH)
    print("step 200 checkpoint saved")
except Exception as e:
    print(f"step 200 save failed: {type(e).__name__}: {str(e).splitlines()[0][:160]}")
print("files now:", {n: os.path.getsize(os.path.join(D, n)) for n in sorted(os.listdir(D))})
try:
    ck = torch.load(PATH, weights_only=True)
    print(f"torch.load(ckpt.pt) works: step {ck['step']}")
except Exception as e:
    print(f"torch.load(ckpt.pt) fails: {type(e).__name__}: {str(e).splitlines()[0][:160]}")
