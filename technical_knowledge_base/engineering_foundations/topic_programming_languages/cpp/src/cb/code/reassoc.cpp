// A local permission to reorder float additions, for one function only (no -ffast-math for the whole file).
#include <cstddef>
float dot_reassoc(const float* a, const float* b, size_t n) {
#pragma clang fp reassociate(on)
  float s = 0;
  for (size_t i = 0; i < n; ++i) s += a[i] * b[i];
  return s;
}
