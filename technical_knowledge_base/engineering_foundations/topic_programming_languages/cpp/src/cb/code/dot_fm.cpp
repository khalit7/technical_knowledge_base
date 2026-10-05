// The same plain loop as dot_auto, compiled with -ffast-math (which permits reordering the additions).
#include <cstddef>
float dot_auto_fastmath(const float* a, const float* b, size_t n) {
  float s = 0;
  for (size_t i = 0; i < n; ++i) s += a[i] * b[i];
  return s;
}
