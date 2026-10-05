"""torch.utils.cpp_extension.load_inline with a CUDA kernel. The image has a CPU-only PyTorch build
and no GPU; the script records what happens."""
import json, os, torch
from torch.utils import cpp_extension
out = {"torch": torch.__version__, "cuda_build": torch.version.cuda, "CUDA_HOME": bool(cpp_extension.CUDA_HOME)}
cuda_src = r'''
#include <torch/extension.h>
__global__ void scale_kernel(const float* x, float* y, float a, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i];
}
torch::Tensor scale(torch::Tensor x, double a) {
  auto y = torch::empty_like(x);
  int n = x.numel(), block = 256, grid = (n + block - 1) / block;
  scale_kernel<<<grid, block>>>(x.data_ptr<float>(), y.data_ptr<float>(), (float)a, n);
  return y;
}'''
cpp_src = "torch::Tensor scale(torch::Tensor x, double a);"
try:
    m = cpp_extension.load_inline("pm_scale", cpp_sources=cpp_src, cuda_sources=cuda_src,
                                  functions=["scale"], build_directory=None, verbose=False)
    out["built"] = True
except Exception as e:
    msg = str(e).strip().splitlines()
    out["build_error"] = f"{type(e).__name__}: " + " | ".join(l for l in msg if l.strip())[:300]
print(json.dumps(out))
