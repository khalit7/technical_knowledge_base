// The size check fails at compile time when someone adds a field: nothing runs, nothing is corrupted.
#include <cstdint>
typedef uint16_t ggml_half;
typedef struct { ggml_half d; int8_t qs[32]; float extra; } block_q8_0;
static_assert(sizeof(block_q8_0) == sizeof(ggml_half) + 32, "wrong q8_0 block size/padding");
int main() {}
