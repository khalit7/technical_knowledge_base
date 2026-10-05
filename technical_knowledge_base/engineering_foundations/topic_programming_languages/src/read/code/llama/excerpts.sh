#!/bin/sh
# Pinned excerpts and language counts from llama.cpp (shallow clone in the scratchpad, commit recorded in out/commit.txt).
. ../env.sh
L=$PL/llama.cpp
mkdir -p out
git -C $L log -1 --format='%H %cd' > out/commit.txt
x() { echo "// $2, lines $3-$4 (llama.cpp $(cut -c1-12 out/commit.txt))" > out/$1.txt; sed -n "$3,$4p" $L/$2 >> out/$1.txt; }
x block_q4_0 ggml/src/ggml-common.h 194 199
x ggml_tensor ggml/include/ggml.h 685 717
x mmap_call src/llama-mmap.cpp 495 498
x munmap_dtor src/llama-mmap.cpp 579 585
x mmap_header src/llama-mmap.h 46 63
x dot_generic ggml/src/ggml-cpu/quants.c 238 257
x thread_macro ggml/src/ggml-cpu/ggml-cpu.c 445 446
{ for d in ggml/src ggml/src/ggml-cpu src common tools; do
  c=$(find $L/$d -name '*.c' -exec cat {} + | wc -l); cpp=$(find $L/$d -name '*.cpp' -exec cat {} + | wc -l)
  cu=$(find $L/$d \( -name '*.cu' -o -name '*.cuh' \) -exec cat {} + 2>/dev/null | wc -l)
  echo "$d c_lines=$c cpp_lines=$cpp cuda_lines=$cu"; done; } > out/lang_lines.txt
cat > out/q4.c <<'C'
#define GGML_COMMON_DECL_C
#include <stdio.h>
#include "ggml-common.h"
int main(void) { printf("sizeof(block_q4_0) = %zu bytes for %d weights = %.2f bits per weight\n", sizeof(block_q4_0), QK4_0, 8.0 * sizeof(block_q4_0) / QK4_0); }
C
/Library/Developer/CommandLineTools/usr/bin/clang -isysroot /Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk -I$L/ggml/src -I$L/ggml/include out/q4.c -o out/q4 && ./out/q4 > out/q4_size.txt
# Which C and C++ features the code actually uses (counts of occurrences at the pinned commit)
{ echo "preprocessor #if/#ifdef in ggml-cpu/arch/arm/quants.c: $(grep -c '#ifdef\|#if defined' $L/ggml/src/ggml-cpu/arch/arm/quants.c)"
  echo "NEON intrinsics vld1q_* calls in ggml-cpu/arch/arm/quants.c: $(grep -o 'vld1q_[a-z0-9_]*' $L/ggml/src/ggml-cpu/arch/arm/quants.c | wc -l | tr -d ' ')"
  echo "std::unique_ptr in src/*.h: $(grep -o 'std::unique_ptr' $L/src/*.h | wc -l | tr -d ' ')"
  echo "throw std::runtime_error in src/*.cpp: $(grep -o 'throw std::runtime_error' $L/src/*.cpp | wc -l | tr -d ' ')"
  echo "template < in src/*.h and src/*.cpp: $(grep -o 'template *<' $L/src/*.h $L/src/*.cpp | wc -l | tr -d ' ')"
  echo "std::vector in src/*.cpp: $(grep -o 'std::vector' $L/src/*.cpp | wc -l | tr -d ' ')"
  echo "lambdas ([&] or [=] or [this]) in src/*.cpp: $(grep -o '\[&\]\|\[=\]\|\[this\]' $L/src/*.cpp | wc -l | tr -d ' ')"
  echo "pthread_create / ggml_thread_create in ggml-cpu/ggml-cpu.c: $(grep -c 'ggml_thread_create\|pthread_create' $L/ggml/src/ggml-cpu/ggml-cpu.c)"
  echo "CMake backend options: $(grep -o 'option(GGML_\(CUDA\|METAL\|VULKAN\|HIP\|SYCL\|BLAS\) ' $L/ggml/CMakeLists.txt | tr -d '(' | sed 's/option//' | tr '\n' ' ')"
} > out/features.txt
