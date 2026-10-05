// schedlab: the C measurements behind the scheduling page. One binary, one mode per experiment.
// Build: gcc -O2 -pthread -o /tmp/schedlab schedlab.c
// Modes (all times printed in microseconds unless the name says otherwise):
//   ctx_pipe  N CPU          two processes, one CPU, a byte back and forth over two pipes (process switch)
//   ctx_futex N CPU          two threads of one process, one CPU, futex wait/wake ping-pong (thread switch, no mm switch)
//   ctx_yield N CPU          two processes, one CPU, each calls sched_yield() in a loop
//   self_pipe N CPU          one process writes and reads its own pipe (the system calls alone, no switch)
//   xcpu_spin N A B          two threads on CPUs A and B pass a token through one shared cache line by spinning (no sleep)
//   xcpu_pipe N A B          the pipe ping-pong with the two processes on different CPUs (each sleeps while it waits)
//   wakelat SLEEP_US N       sleep SLEEP_US with clock_nanosleep N times; print how late each wake-up was (p50, p99, max)
//   throttle THREADS MS      THREADS spinning threads for MS ms; each records every gap > 300 us in its own progress
//   cachework KIB SECONDS    walk a KIB working set (one load per 64-byte line) for SECONDS; print lines per CPU-second
//   hog [stream]             spin forever (ALU), or stream through 64 MiB forever (evicts caches)
#define _GNU_SOURCE
#include <errno.h>
#include <linux/futex.h>
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e6 + t.tv_nsec * 1e-3; }
static double cpunow(void) { struct timespec t; clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t); return t.tv_sec * 1e6 + t.tv_nsec * 1e-3; }
static void pin(int cpu) { cpu_set_t s; CPU_ZERO(&s); CPU_SET(cpu, &s); if (sched_setaffinity(0, sizeof s, &s)) { perror("sched_setaffinity"); exit(1); } }
static long futex(atomic_int *u, int op, int v) { return syscall(SYS_futex, u, op, v, NULL, NULL, 0); }
static int cmpd(const void *a, const void *b) { double x = *(const double *)a, y = *(const double *)b; return x < y ? -1 : x > y; }

// ---------- context switches ----------
static double self_pipe(int n) {
  int p[2]; char c = 'x'; if (pipe(p)) exit(1);
  double t0 = now();
  for (int i = 0; i < n; i++) if (write(p[1], &c, 1) != 1 || read(p[0], &c, 1) != 1) exit(1);
  double r = (now() - t0) / n; close(p[0]); close(p[1]); return r;
}
static double pipe_pingpong(int n, int ca, int cb) {
  int a[2], b[2]; char c = 'x'; if (pipe(a) || pipe(b)) exit(1);
  pid_t k = fork();
  if (k == 0) { pin(cb); for (int i = 0; i < n; i++) if (read(a[0], &c, 1) != 1 || write(b[1], &c, 1) != 1) _exit(1); _exit(0); }
  pin(ca); usleep(20000);
  double t0 = now();
  for (int i = 0; i < n; i++) if (write(a[1], &c, 1) != 1 || read(b[0], &c, 1) != 1) exit(1);
  double rt = (now() - t0) / n; waitpid(k, 0, 0); return rt;
}
static atomic_int fx = 0; static int fx_n;
static void *fx_peer(void *arg) {
  pin(*(int *)arg);
  for (int i = 0; i < fx_n; i++) {
    while (atomic_load(&fx) != 1) futex(&fx, FUTEX_WAIT_PRIVATE, 0);
    atomic_store(&fx, 0); futex(&fx, FUTEX_WAKE_PRIVATE, 1);
  }
  return 0;
}
static double futex_pingpong(int n, int cpu) {
  pthread_t t; fx_n = n; int c = cpu; pin(cpu);
  pthread_create(&t, 0, fx_peer, &c); usleep(20000);
  double t0 = now();
  for (int i = 0; i < n; i++) {
    atomic_store(&fx, 1); futex(&fx, FUTEX_WAKE_PRIVATE, 1);
    while (atomic_load(&fx) != 0) futex(&fx, FUTEX_WAIT_PRIVATE, 1);
  }
  double rt = (now() - t0) / n; pthread_join(t, 0); return rt;
}
static long yield_switches;
static double yield_pair(int n, int cpu) {
  pin(cpu);
  pid_t k = fork();
  if (k == 0) { for (int i = 0; i < n; i++) sched_yield(); _exit(0); }
  usleep(20000);
  struct rusage r0, r1; getrusage(RUSAGE_SELF, &r0);
  double t0 = now();
  for (int i = 0; i < n; i++) sched_yield();
  double t = (now() - t0); getrusage(RUSAGE_SELF, &r1); waitpid(k, 0, 0);
  yield_switches = (r1.ru_nvcsw - r0.ru_nvcsw) + (r1.ru_nivcsw - r0.ru_nivcsw);
  return t / n; // per yield of this process: each yield hands the CPU to the peer and back
}
static _Alignas(128) atomic_int tok = 0; static int sp_n;
static void *sp_peer(void *arg) { pin(*(int *)arg); for (int i = 0; i < sp_n; i++) { while (atomic_load_explicit(&tok, memory_order_acquire) != 1); atomic_store_explicit(&tok, 0, memory_order_release); } return 0; }
static double spin_pingpong(int n, int ca, int cb) {
  pthread_t t; sp_n = n; int c = cb; pin(ca);
  pthread_create(&t, 0, sp_peer, &c); usleep(20000);
  double t0 = now();
  for (int i = 0; i < n; i++) { atomic_store_explicit(&tok, 1, memory_order_release); while (atomic_load_explicit(&tok, memory_order_acquire) != 0); }
  double rt = (now() - t0) / n; pthread_join(t, 0); return rt;
}

// ---------- wake-up latency ----------
static void wakelat(int sleep_us, int n) {
  prctl(PR_SET_TIMERSLACK, 1UL); // remove the default 50 us timer slack so what remains is scheduling delay
  double *lat = malloc(n * sizeof *lat);
  struct timespec req = {0, sleep_us * 1000L};
  for (int i = 0; i < 50; i++) clock_nanosleep(CLOCK_MONOTONIC, 0, &req, 0);
  for (int i = 0; i < n; i++) { double t0 = now(); clock_nanosleep(CLOCK_MONOTONIC, 0, &req, 0); lat[i] = now() - t0 - sleep_us; }
  qsort(lat, n, sizeof *lat, cmpd);
  double s = 0; for (int i = 0; i < n; i++) s += lat[i];
  int pol = sched_getscheduler(0);
  printf("wakelat sleep_us %d n %d policy %d nice %d p50_us %.1f p90_us %.1f p99_us %.1f max_us %.1f mean_us %.1f\n",
         sleep_us, n, pol, getpriority(PRIO_PROCESS, 0), lat[n / 2], lat[n * 9 / 10], lat[n * 99 / 100], lat[n - 1], s / n);
}

// ---------- throttling: gaps in each spinning thread's progress ----------
#define MAXG 4096
typedef struct { int id; double end; double t0; int ng; double gs[MAXG], ge[MAXG]; double cpu; } th_t;
static void *spinner(void *arg) {
  th_t *t = arg; double last = now(), c0 = cpunow();
  for (;;) {
    double x = now();
    if (x - last > 300 && t->ng < MAXG) { t->gs[t->ng] = last - t->t0; t->ge[t->ng] = x - t->t0; t->ng++; }
    last = x; if (x >= t->end) break;
  }
  t->cpu = cpunow() - c0; return 0;
}
static void throttle(int nt, int ms) {
  th_t *th = calloc(nt, sizeof *th); pthread_t *ids = calloc(nt, sizeof *ids);
  double t0 = now() + 20000; // start together 20 ms from now
  for (int i = 0; i < nt; i++) { th[i].id = i; th[i].t0 = t0; th[i].end = t0 + ms * 1000.0; }
  for (int i = 0; i < nt; i++) pthread_create(&ids[i], 0, spinner, &th[i]);
  for (int i = 0; i < nt; i++) pthread_join(ids[i], 0);
  for (int i = 0; i < nt; i++) {
    double gsum = 0, gmax = 0; for (int g = 0; g < th[i].ng; g++) { double d = th[i].ge[g] - th[i].gs[g]; gsum += d; if (d > gmax) gmax = d; }
    printf("thread %d cpu_ms %.1f gaps %d gap_ms %.1f max_gap_ms %.1f\n", i, th[i].cpu / 1000, th[i].ng, gsum / 1000, gmax / 1000);
    printf("gaps %d", i);
    for (int g = 0; g < th[i].ng; g++) printf(" %.2f-%.2f", th[i].gs[g] / 1000, th[i].ge[g] / 1000);
    printf("\n");
  }
}

// ---------- indirect cost: how much work a cache-sensitive loop gets per CPU-second ----------
static void cachework(int kib, double secs) {
  size_t n = (size_t)kib * 1024 / 64; uint64_t *a = aligned_alloc(64, n * 64);
  // a random cyclic permutation of cache lines, so every load depends on the previous one (no prefetching)
  size_t *perm = malloc(n * sizeof *perm); for (size_t i = 0; i < n; i++) perm[i] = i;
  srand(1); for (size_t i = n - 1; i > 0; i--) { size_t j = (size_t)rand() % (i + 1), x = perm[i]; perm[i] = perm[j]; perm[j] = x; }
  for (size_t i = 0; i < n; i++) a[perm[i] * 8] = perm[(i + 1) % n];
  free(perm);
  size_t p = 0; uint64_t loads = 0; double c0 = cpunow(), w0 = now();
  while ((now() - w0) < secs * 1e6) { for (int k = 0; k < 4096; k++) p = a[p * 8]; loads += 4096; }
  double cpu = (cpunow() - c0) / 1e6, wall = (now() - w0) / 1e6;
  printf("cachework kib %d loads_per_cpu_us %.2f ns_per_load %.2f cpu_s %.2f wall_s %.2f sink %zu\n", kib, loads / cpu / 1e6, cpu * 1e9 / loads, cpu, wall, p & 1);
}
static void hog(int stream) {
  if (!stream) { volatile unsigned long x = 0; for (;;) x++; }
  size_t n = 64u << 20; volatile char *b = malloc(n); memset((char *)b, 1, n);
  for (;;) for (size_t i = 0; i < n; i += 64) b[i]++;
}

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage: see the header comment\n"); return 2; }
  const char *m = argv[1]; int a = argc > 2 ? atoi(argv[2]) : 0, b = argc > 3 ? atoi(argv[3]) : 0, c = argc > 4 ? atoi(argv[4]) : 0;
  if (!strcmp(m, "ctx_pipe")) { pin(b); double s = self_pipe(a); double rt = pipe_pingpong(a, b, b);
    printf("ctx_pipe n %d cpu %d round_trip_us %.3f self_pipe_us %.3f per_switch_us %.3f\n", a, b, rt, s, (rt - 2 * s) / 2); }
  else if (!strcmp(m, "ctx_futex")) { double rt = futex_pingpong(a, b); printf("ctx_futex n %d cpu %d round_trip_us %.3f per_switch_us %.3f\n", a, b, rt, rt / 2); }
  else if (!strcmp(m, "ctx_yield")) { double y = yield_pair(a, b); printf("ctx_yield n %d cpu %d us_per_yield_pair %.3f per_switch_us %.3f switches_of_this_process %ld\n", a, b, y, y / 2, yield_switches); }
  else if (!strcmp(m, "xcpu_spin")) { double rt = spin_pingpong(a, b, c); printf("xcpu_spin n %d cpus %d,%d round_trip_us %.3f one_way_us %.3f\n", a, b, c, rt, rt / 2); }
  else if (!strcmp(m, "xcpu_pipe")) { double rt = pipe_pingpong(a, b, c); printf("xcpu_pipe n %d cpus %d,%d round_trip_us %.3f one_way_us %.3f\n", a, b, c, rt, rt / 2); }
  else if (!strcmp(m, "wakelat")) wakelat(a, b);
  else if (!strcmp(m, "throttle")) throttle(a, b);
  else if (!strcmp(m, "cachework")) cachework(a, b);
  else if (!strcmp(m, "hog")) hog(argc > 2 && !strcmp(argv[2], "stream"));
  else { fprintf(stderr, "unknown mode %s\n", m); return 2; }
  return 0;
}
