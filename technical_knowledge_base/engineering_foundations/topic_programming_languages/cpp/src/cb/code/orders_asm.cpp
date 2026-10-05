// What each memory order compiles to on ARM64 (read the assembly with clang -S).
#include <atomic>
std::atomic<int> data, flag;
void send_relaxed()  { data.store(1, std::memory_order_relaxed); flag.store(1, std::memory_order_relaxed); }
void send_release()  { data.store(1, std::memory_order_relaxed); flag.store(1, std::memory_order_release); }
int  recv_relaxed()  { int f = flag.load(std::memory_order_relaxed); return f + data.load(std::memory_order_relaxed); }
int  recv_acquire()  { int f = flag.load(std::memory_order_acquire); return f + data.load(std::memory_order_relaxed); }
void send_seq_cst()  { data.store(1); flag.store(1); }        // the default order: sequentially consistent
int  recv_seq_cst()  { int f = flag.load(); return f + data.load(); }
