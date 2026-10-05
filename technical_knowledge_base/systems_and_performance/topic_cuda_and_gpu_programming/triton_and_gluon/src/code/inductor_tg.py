"""What Triton code does torch.compile (Inductor) write? Without a GPU, Inductor's CUDA path cannot run, but
Inductor can also emit Triton for CPU tensors (torch._inductor.config.cpu_backend = "triton"). Triton's wheel has no
CPU backend, so the generated kernels are written but cannot execute; a stand-in "driver" only answers the target
question so code generation completes. The kernels' source is real Inductor output (torch 2.14.1, Triton 3.8.0).
On a CUDA device the same graph gives kernels of the same form; block sizes and heuristics would differ.
Usage: TRITON_INTERPRET=1 TORCHINDUCTOR_CACHE_DIR=/tmp/ind python inductor_tg.py  -> ../out/inductor/*.py
"""
import os, glob, shutil, torch, traceback
import torch._inductor.config as cfg
cfg.cpu_backend = "triton"
import torch.utils._triton as ut
ut.triton_hash_with_backend = lambda: "nodevice"
ut.triton_backend = lambda: None
from triton.backends.compiler import GPUTarget
import triton.runtime as tr


class StandInDriver:      # answers "which target?" so Inductor's code generation can finish
    def get_current_target(self): return GPUTarget("cuda", 90, 32)
    def get_current_device(self): return 0
    def get_active_torch_device(self): return torch.device("cpu")
    def __getattr__(self, k): raise AttributeError(k)


tr.driver.set_active(StandInDriver())


def attn_like(x, w):          # softmax of scaled scores, then a multiply by V
    return torch.softmax(x * 0.125, dim=-1) @ w


def pointwise(x):             # three elementwise ops: one fused kernel expected
    return torch.nn.functional.gelu(x) * torch.sigmoid(x) + 1


OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "inductor")
os.makedirs(OUT, exist_ok=True)
cache = os.environ["TORCHINDUCTOR_CACHE_DIR"]
x, w = torch.randn(64, 256), torch.randn(256, 32)
for name, fn, args in (("pointwise", pointwise, (x,)), ("attn_like", attn_like, (x, w))):
    before = set(glob.glob(cache + "/**/*.py", recursive=True))
    try:
        torch.compile(fn)(*args)
    except Exception as e:
        print(name, "did not run (expected):", type(e).__name__, str(e).splitlines()[0][:160])
    new = sorted(set(glob.glob(cache + "/**/*.py", recursive=True)) - before, key=os.path.getsize)
    for i, f in enumerate(new):
        dst = os.path.join(OUT, f"{name}_{'kernel' if i == 0 else 'module'}.py")
        shutil.copy(f, dst)
        print(name, "->", os.path.basename(dst), sum(1 for _ in open(f)), "lines")
