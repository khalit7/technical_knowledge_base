// What a seccomp filter costs per system call: getppid() 3,000,000 times, ns per call, then again after stacking
// 1, 8 and 32 allow-everything filters on top of whatever the container runtime installed.
#define _GNU_SOURCE
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <stdio.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <time.h>
#include <unistd.h>
static double bench(void) {
  double best = 1e9;
  for (int r = 0; r < 5; r++) { struct timespec a, b; clock_gettime(CLOCK_MONOTONIC, &a);
    for (int i = 0; i < 3000000; i++) syscall(__NR_getppid);
    clock_gettime(CLOCK_MONOTONIC, &b); double ns = ((b.tv_sec - a.tv_sec) * 1e9 + (b.tv_nsec - a.tv_nsec)) / 3e6; if (ns < best) best = ns; }
  return best;
}
int main(void) {
  struct sock_filter f[] = {BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW)};
  struct sock_fprog prog = {1, f};
  prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);
  int have = 0;
  printf("added_filters 0 ns_per_getppid %.1f\n", bench());
  for (int want = 1; want <= 32; want *= 8) {
    while (have < want) { if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog)) { perror("seccomp"); return 1; } have++; }
    printf("added_filters %d ns_per_getppid %.1f\n", have, bench());
  }
}
