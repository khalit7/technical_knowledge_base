#!/bin/bash
# Where do the threadpool's hot atomics sit? Compile ggml-cpu.c's own struct definition (copied by line range) and print offsets.
. "$(dirname "$0")/env.sh"; mkdir -p $CL/tp
{ cat <<'H'
#include <pthread.h>
#include <stdatomic.h>
#include <stddef.h>
#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#define GGML_CACHE_LINE  64
#define GGML_CACHE_ALIGN __attribute__((aligned(GGML_CACHE_LINE)))
typedef pthread_cond_t ggml_cond_t; typedef pthread_mutex_t ggml_mutex_t; enum ggml_status { X };
struct ggml_cgraph; struct ggml_cplan; struct ggml_compute_state;
H
  sed -n 481,505p $LL/ggml/src/ggml-cpu/ggml-cpu.c
  cat <<'M'
int main(void) {
    printf("offsetof n_graph=%zu n_barrier=%zu n_barrier_passed=%zu current_chunk=%zu sizeof=%zu\n",
           offsetof(struct ggml_threadpool, n_graph), offsetof(struct ggml_threadpool, n_barrier),
           offsetof(struct ggml_threadpool, n_barrier_passed), offsetof(struct ggml_threadpool, current_chunk),
           sizeof(struct ggml_threadpool));
    return 0;
}
M
} > $CL/tp/tp.c
$CLT/usr/bin/clang -O2 -isysroot $CLT/SDKs/MacOSX.sdk $CL/tp/tp.c -o $CL/tp/tp && $CL/tp/tp
