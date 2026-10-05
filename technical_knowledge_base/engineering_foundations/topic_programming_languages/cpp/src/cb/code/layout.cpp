// sizeof, alignof, offsetof and padding: what the compiler does to a struct.
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <new>

struct Bad  { char flag; double score; int32_t id; };          // fields in a careless order
struct Good { double score; int32_t id; char flag; };          // largest first
struct Tok  { int32_t id; float logprob; };                    // two 4-byte fields: no padding
struct alignas(128) Padded { int64_t counter; };               // one per cache line (see false sharing)

#define SHOW(T) std::printf("%-7s sizeof %3zu  alignof %3zu\n", #T, sizeof(T), alignof(T))
int main() {
  SHOW(char); SHOW(int32_t); SHOW(double); SHOW(void*);
  SHOW(Bad);
  std::printf("  Bad:  flag at %zu, score at %zu, id at %zu\n", offsetof(Bad, flag), offsetof(Bad, score), offsetof(Bad, id));
  SHOW(Good);
  std::printf("  Good: score at %zu, id at %zu, flag at %zu\n", offsetof(Good, score), offsetof(Good, id), offsetof(Good, flag));
  SHOW(Tok); SHOW(Padded);
  std::printf("1000 Bad = %zu bytes, 1000 Good = %zu bytes\n", 1000 * sizeof(Bad), 1000 * sizeof(Good));
#ifdef __cpp_lib_hardware_interference_size
  std::printf("std::hardware_destructive_interference_size = %zu\n", std::hardware_destructive_interference_size);
#else
  std::printf("std::hardware_destructive_interference_size: not provided by this standard library\n");
#endif
}
