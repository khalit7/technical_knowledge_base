// A tiny C++ operator for the running example: exact GELU, y = x * Phi(x), and its backward.
// Built with torch.utils.cpp_extension.load_inline (see cpp_ext.py). Float32, CPU, any shape.
#include <torch/extension.h>
#include <ATen/Parallel.h>
#include <cmath>

static at::Tensor gelu_fwd(const at::Tensor& x) {
  TORCH_CHECK(x.device().is_cpu() && x.scalar_type() == at::kFloat, "extc::gelu: CPU float32 only");
  auto xc = x.contiguous();
  auto y = at::empty_like(xc);
  const float* in = xc.data_ptr<float>();
  float* out = y.data_ptr<float>();
  at::parallel_for(0, xc.numel(), 4096, [&](int64_t b, int64_t e) {
    for (int64_t i = b; i < e; ++i) {
      float v = in[i];
      out[i] = 0.5f * v * (1.0f + std::erf(v * 0.70710678118654752f));
    }
  });
  return y;
}

static at::Tensor gelu_bwd(const at::Tensor& grad, const at::Tensor& x) {
  auto xc = x.contiguous(); auto gc = grad.contiguous();
  auto dx = at::empty_like(xc);
  const float* in = xc.data_ptr<float>(); const float* g = gc.data_ptr<float>();
  float* out = dx.data_ptr<float>();
  at::parallel_for(0, xc.numel(), 4096, [&](int64_t b, int64_t e) {
    for (int64_t i = b; i < e; ++i) {
      float v = in[i];
      float cdf = 0.5f * (1.0f + std::erf(v * 0.70710678118654752f));
      float pdf = 0.39894228040143268f * std::exp(-0.5f * v * v);
      out[i] = g[i] * (cdf + v * pdf);
    }
  });
  return dx;
}

// Registration with the dispatcher: a namespace, two schemas, and a CPU kernel for each.
TORCH_LIBRARY(extc, m) {
  m.def("gelu(Tensor x) -> Tensor");
  m.def("gelu_backward(Tensor grad, Tensor x) -> Tensor");
}
TORCH_LIBRARY_IMPL(extc, CPU, m) {
  m.impl("gelu", &gelu_fwd);
  m.impl("gelu_backward", &gelu_bwd);
}

// The same functions also exposed as plain pybind11 functions (no dispatcher), to show the difference.
at::Tensor raw_gelu(const at::Tensor& x) { return gelu_fwd(x); }
at::Tensor raw_gelu_backward(const at::Tensor& g, const at::Tensor& x) { return gelu_bwd(g, x); }
