#define GGML_COMMON_DECL_C
#include <stdio.h>
#include "ggml-common.h"
int main(void) { printf("sizeof(block_q4_0) = %zu bytes for %d weights = %.2f bits per weight\n", sizeof(block_q4_0), QK4_0, 8.0 * sizeof(block_q4_0) / QK4_0); }
