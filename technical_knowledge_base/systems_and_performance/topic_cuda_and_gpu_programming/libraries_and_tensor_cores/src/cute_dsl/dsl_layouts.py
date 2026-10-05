"""CuTe DSL (nvidia-cutlass-dsl 4.8.0), no GPU: print layouts from Python, and try to compile a
kernel for a named architecture. Every step prints OK or the exact error; failures are kept."""
import os, sys, traceback
import cutlass
import cutlass.cute as cute
print("cutlass-dsl", getattr(cutlass, "__version__", "?"))

@cute.jit
def show():
    l = cute.make_layout((4, 8), stride=(1, 4))
    print("DSL colmajor_4x8", l)
    a = cute.make_layout((6, 2), stride=(8, 2)); b = cute.make_layout((4, 3), stride=(3, 1))
    print("DSL compose_AB", cute.composition(a, b))
    d = cute.make_layout((4, 2, 3), stride=(2, 1, 8))
    print("DSL divide_1d", cute.logical_divide(d, cute.make_layout(4, stride=2)))
    print("DSL complement_24", cute.complement(cute.make_layout((2, 2), stride=(1, 6)), 24))

try:
    show(); print("STEP layouts OK")
except Exception as e:
    print("STEP layouts FAIL", type(e).__name__, str(e)[:400])

@cute.kernel
def add_one(x: cute.Tensor):
    tid, _, _ = cute.arch.thread_idx()
    x[tid] = x[tid] + 1.0

@cute.jit
def launch(x: cute.Tensor):
    add_one(x).launch(grid=(1, 1, 1), block=(32, 1, 1))

try:
    import torch
    from cutlass.cute.runtime import from_dlpack
    t = torch.zeros(32, dtype=torch.float32)
    f = cute.compile(launch, from_dlpack(t), options="--keep-ptx --keep-cubin")
    print("STEP compile OK", type(f).__name__)
    import glob, subprocess
    for fn in sorted(glob.glob("**/*.ptx", recursive=True) + glob.glob("**/*.cubin", recursive=True)):
        print("FILE", fn, os.path.getsize(fn))
        if fn.endswith(".ptx"):
            for line in open(fn):
                if line.startswith((".version", ".target", ".address_size")): print("PTX", line.strip())
        if fn.endswith(".cubin"):
            r = subprocess.run(["cuobjdump", "-sass", fn], capture_output=True, text=True).stdout
            print("SASS_LINES", len([l for l in r.splitlines() if l.strip().startswith("/*")]))
            open("out/dsl_add_one.sass.txt", "w").write(r)
except Exception as e:
    print("STEP compile FAIL", type(e).__name__, str(e)[:600])
