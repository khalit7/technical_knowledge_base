// Cost of creating each kind of namespace: a fresh child process calls unshare(flag) once and reports how long
// the call took; 200 children per kind, median and p90 in microseconds. "none" is the same child calling
// unshare(0). Needs CAP_SYS_ADMIN (docker run --cap-add SYS_ADMIN). Build: gcc -O2 -o ns_cost ns_cost.c
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
#ifndef CLONE_NEWTIME
#define CLONE_NEWTIME 0x00000080
#endif
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec * 1e6 + t.tv_nsec / 1e3; }
static int cmp(const void *a, const void *b) { double x = *(double *)a, y = *(double *)b; return (x > y) - (x < y); }
int main(void) {
  struct { const char *name; int flag; } k[] = {{"none", 0}, {"uts", CLONE_NEWUTS}, {"ipc", CLONE_NEWIPC},
    {"pid", CLONE_NEWPID}, {"mnt", CLONE_NEWNS}, {"cgroup", CLONE_NEWCGROUP}, {"time", CLONE_NEWTIME},
    {"user", CLONE_NEWUSER}, {"net", CLONE_NEWNET},
    {"all but user", CLONE_NEWUTS | CLONE_NEWIPC | CLONE_NEWPID | CLONE_NEWNS | CLONE_NEWCGROUP | CLONE_NEWNET}};
  enum { N = 200 };
  printf("%-14s %8s %8s %8s\n", "namespace", "median", "p90", "fails");
  for (unsigned i = 0; i < sizeof k / sizeof *k; i++) {
    double v[N]; int fails = 0;
    for (int j = 0; j < N; j++) {
      int fd[2]; if (pipe(fd)) return 1;
      pid_t c = fork();
      if (c == 0) { close(fd[0]); double t0 = now(); int r = unshare(k[i].flag); double d = now() - t0;
        if (r) d = -1; if (write(fd[1], &d, sizeof d) < 0) _exit(1); _exit(0); }
      close(fd[1]); double d = -1; if (read(fd[0], &d, sizeof d) != sizeof d) d = -1; close(fd[0]); waitpid(c, 0, 0);
      if (d < 0) { fails++; d = 1e18; } v[j] = d;
    }
    qsort(v, N, sizeof *v, cmp);
    printf("%-14s %8.1f %8.1f %8d\n", k[i].name, v[N / 2], v[N * 9 / 10], fails);
    fflush(stdout);
  }
}
