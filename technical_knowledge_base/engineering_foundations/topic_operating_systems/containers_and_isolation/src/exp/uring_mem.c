// io_uring rings count against RLIMIT_MEMLOCK, charged to the user (UID), not to the process or the container
// (Linux 5.10, fs/io_uring.c __io_account_mem). Creates 1-entry rings until one fails; prints how many it got.
// Usage: uring_mem [hold_seconds]   (keeps the rings open that long, so a second container can be tested)
#define _GNU_SOURCE
#include <errno.h>
#include <linux/io_uring.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <unistd.h>
int main(int argc, char **argv) {
  struct rlimit rl; getrlimit(RLIMIT_MEMLOCK, &rl);
  int n = 0; const char *why = "stopped at 64";
  for (; n < 64; n++) { struct io_uring_params p; memset(&p, 0, sizeof p);
    if (syscall(__NR_io_uring_setup, 1, &p) < 0) { why = strerror(errno); break; } }
  printf("uid %d memlock_limit_kib %ld page_kib %ld rings_created %d then: %s\n", getuid(), (long)(rl.rlim_cur / 1024), sysconf(_SC_PAGESIZE) / 1024, n, why);
  fflush(stdout);
  if (argc > 1) sleep(atoi(argv[1]));
}
