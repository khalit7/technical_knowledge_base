"""CuPy RawKernel: CUDA C++ source in a Python string, compiled at run time by NVRTC.
Here there is no GPU, so the kernel cannot run; the script records how far it gets."""
import json, traceback
out = {}
src = r'''
extern "C" __global__ void scale(const float* x, float* y, float a, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i];
}'''
try:
    import cupy as cp
    out["cupy"] = cp.__version__
    k = cp.RawKernel(src, "scale")
    out["created"] = True
    try:
        k.compile()
        out["compiled"] = True
    except Exception as e:
        out["compile_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
    try:
        x = cp.arange(1000, dtype=cp.float32)
        out["ran"] = True
    except Exception as e:
        out["run_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
except Exception as e:
    out["import_error"] = f"{type(e).__name__}: {str(e)[:200]}"
print(json.dumps(out))
