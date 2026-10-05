// Which system calls does a seccomp profile let through? Each line: the call and its result (ok or errno).
// Run as root with Docker's default capabilities under several --security-opt seccomp=... settings.
#define _GNU_SOURCE
#include <errno.h>
#include <linux/io_uring.h>
#include <linux/keyctl.h>
#include <linux/perf_event.h>
#include <sched.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/mount.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>
static void show(const char *name, long r) { printf("%-28s %s\n", name, r >= 0 ? "ok" : strerror(errno)); }
int main(void) {
  struct io_uring_params p; memset(&p, 0, sizeof p);
  long fd = syscall(__NR_io_uring_setup, 4, &p); show("io_uring_setup", fd); if (fd >= 0) close(fd);
  show("unshare(CLONE_NEWUSER)", syscall(__NR_unshare, CLONE_NEWUSER));
  show("unshare(CLONE_NEWNS)", syscall(__NR_unshare, CLONE_NEWNS));
  show("mount(tmpfs)", mount("none", "/mnt", "tmpfs", 0, NULL));
  show("add_key", syscall(__NR_add_key, "user", "k", "x", 1, KEY_SPEC_PROCESS_KEYRING));
  struct perf_event_attr a; memset(&a, 0, sizeof a); a.size = sizeof a; a.type = PERF_TYPE_SOFTWARE; a.config = PERF_COUNT_SW_TASK_CLOCK; a.exclude_kernel = 1;
  long pf = syscall(__NR_perf_event_open, &a, 0, -1, -1, 0); show("perf_event_open(task clock)", pf); if (pf >= 0) close(pf);
  show("bpf(BPF_PROG_LOAD, empty)", syscall(__NR_bpf, 5, NULL, 0));
  show("userfaultfd", syscall(__NR_userfaultfd, 0));
  struct timespec ts; clock_gettime(CLOCK_REALTIME, &ts); show("clock_settime(now)", syscall(__NR_clock_settime, CLOCK_REALTIME, &ts));
  show("clone3 (empty args)", syscall(__NR_clone3, NULL, 0));
  show("ptrace(PTRACE_TRACEME) in a child", 0 * printf(""));
  pid_t c = fork(); if (c == 0) _exit(syscall(__NR_ptrace, 0, 0, 0, 0) < 0 ? errno : 0);
  int st; waitpid(c, &st, 0); printf("  child: %s\n", WEXITSTATUS(st) ? strerror(WEXITSTATUS(st)) : "ok");
  show("getpid", syscall(__NR_getpid));
}
