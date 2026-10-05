#!/bin/bash
# Print the llama.cpp excerpts quoted in Part 2, from the pinned clone.
. "$(dirname "$0")/env.sh"
L=$PL/llama.cpp
echo "commit $(git -C $L rev-parse HEAD)"
ex() { echo "=== $1:$2-$3"; sed -n "$2,$3p" "$L/$1"; }
ex ggml/src/ggml-cpu/simd-mappings.h 331 345
ex ggml/src/ggml-cpu/vec.cpp 104 126
ex ggml/src/ggml-cpu/ops.h 8 18
ex src/llama-mmap.cpp 482 498
