// Name mangling: C++ encodes namespaces and parameter types into the symbol name; extern "C" turns it off.
namespace ggml_like {
  float dot(const float* a, const float* b, int n) { float s = 0; for (int i = 0; i < n; ++i) s += a[i] * b[i]; return s; }
  double dot(const double* a, const double* b, int n) { double s = 0; for (int i = 0; i < n; ++i) s += a[i] * b[i]; return s; }
}
extern "C" float c_dot(const float* a, const float* b, int n) { return ggml_like::dot(a, b, n); }
