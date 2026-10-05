// Shared helpers: a monotonic clock, a "keep this value" sink, and a request to run on a performance core.
#pragma once
#include <chrono>
#include <cstdio>
#include <pthread.h>
#include <sys/qos.h>
static inline double now_s() {
  return std::chrono::duration<double>(std::chrono::steady_clock::now().time_since_epoch()).count();
}
// macOS cannot pin a thread to a core; the highest QoS class asks the scheduler for a performance core.
static inline void prefer_pcore() { pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0); }
template <class T> static inline void keep(T const& v) { asm volatile("" : : "r"(&v) : "memory"); }
