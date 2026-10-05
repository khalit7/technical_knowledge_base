// What "count = count + 1" and an atomic add compile to (gcc -O2, arm64): the first is a load, an add and a store.
volatile long count;
void inc(void) { count = count + 1; }
void inc_atomic(void) { __atomic_fetch_add(&count, 1, __ATOMIC_SEQ_CST); }
