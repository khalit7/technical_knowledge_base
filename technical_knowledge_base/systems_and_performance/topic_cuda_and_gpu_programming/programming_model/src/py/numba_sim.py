"""Numba CUDA kernels run in Numba's CUDA simulator (NUMBA_ENABLE_CUDASIM=1): every CUDA thread
becomes a Python thread on the CPU, so the kernels really execute, with barriers, without a GPU.
Same two kernels as the page: a scaled copy with one thread per element, and a 256-thread
shared-memory tree sum with cuda.syncthreads(). Prints JSON."""
import json, os
import numpy as np
from numba import cuda, float32

@cuda.jit
def scale(x, y, a):
    i = cuda.grid(1)                 # = blockIdx.x * blockDim.x + threadIdx.x
    if i < x.size:
        y[i] = a * x[i]

@cuda.jit
def block_sum(x, out):
    s = cuda.shared.array(256, dtype=float32)
    t = cuda.threadIdx.x
    s[t] = x[cuda.blockIdx.x * 256 + t]
    cuda.syncthreads()
    k = 128
    while k > 0:
        if t < k:
            s[t] += s[t + k]
        cuda.syncthreads()
        k //= 2
    if t == 0:
        out[cuda.blockIdx.x] = s[0]

n = 1000
x = np.arange(n, dtype=np.float32)
y = np.zeros_like(x)
block = 128
grid = (n + block - 1) // block
scale[grid, block](x, y, np.float32(2.0))
xb = np.random.default_rng(0).integers(0, 10, size=4 * 256).astype(np.float32)
ob = np.zeros(4, dtype=np.float32)
block_sum[4, 256](xb, ob)
print(json.dumps({"simulator": os.environ.get("NUMBA_ENABLE_CUDASIM") == "1",
                  "scale": {"n": n, "grid": grid, "block": block, "ok": bool(np.array_equal(y, 2 * x))},
                  "block_sum": {"got": ob.tolist(), "want": xb.reshape(4, 256).sum(1).tolist(),
                                "ok": bool(np.array_equal(ob, xb.reshape(4, 256).sum(1)))}}))
