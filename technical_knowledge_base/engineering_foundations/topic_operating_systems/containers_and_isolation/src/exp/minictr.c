// A container built by hand, one restriction at a time, printing what the process sees after each step.
// Runs inside a Docker container started with --cap-add SYS_ADMIN (needed to create namespaces, mount and
// pivot_root); minictr.sh prepares the busybox root file system and the cgroup /sys/fs/cgroup/ctr first.
// Linux only (arm64 or x86-64). Build: gcc -O2 -o minictr minictr.c
#define _GNU_SOURCE
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/audit.h>
#include <linux/capability.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <sched.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ipc.h>
#include <sys/mount.h>
#include <sys/prctl.h>
#include <sys/shm.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <unistd.h>

#ifndef CLONE_NEWTIME
#define CLONE_NEWTIME 0x00000080
#endif
#if defined(__aarch64__)
#define MY_ARCH AUDIT_ARCH_AARCH64
#elif defined(__x86_64__)
#define MY_ARCH AUDIT_ARCH_X86_64
#endif

static void die(const char *what) { printf("FAILED %s: %s\n", what, strerror(errno)); fflush(stdout); exit(1); }

static void slurp(const char *path, char *buf, size_t n) {
  buf[0] = 0; int fd = open(path, O_RDONLY); if (fd < 0) { snprintf(buf, n, "(%s)", strerror(errno)); return; }
  ssize_t r = read(fd, buf, n - 1); close(fd); buf[r > 0 ? r : 0] = 0;
  for (char *p = buf; *p; p++) if (*p == '\n') *p = (p[1] ? ';' : 0);
}
static void status_field(const char *key, char *out, size_t n) {
  FILE *f = fopen("/proc/self/status", "r"); char line[256]; out[0] = 0; if (!f) return;
  while (fgets(line, sizeof line, f)) if (!strncmp(line, key, strlen(key))) { char *v = line + strlen(key) + 1;
    while (*v == ' ' || *v == '\t') { v++; }
    v[strcspn(v, "\n")] = 0; snprintf(out, n, "%s", v); }
  fclose(f);
}
static int count_lines(const char *path, int skip) {
  FILE *f = fopen(path, "r"); if (!f) return -1; int c = 0; char line[1024];
  while (fgets(line, sizeof line, f)) { c++; }
  fclose(f); return c - skip;
}

// Everything the process can observe about its surroundings, one "key: value" per line.
static void view(int step, const char *title) {
  char b[2048], h[256];
  printf("### S%d %s\n", step, title);
  printf("pid: %d\nppid: %d\nuid: %d\n", getpid(), getppid(), getuid());
  gethostname(h, sizeof h); printf("hostname: %s\n", h);
  const char *ns[] = {"cgroup", "ipc", "mnt", "net", "pid", "time", "user", "uts"};
  for (int i = 0; i < 8; i++) { char p[64], t[128]; snprintf(p, 64, "/proc/self/ns/%s", ns[i]);
    ssize_t r = readlink(p, t, sizeof t - 1); t[r > 0 ? r : 0] = 0; char *o = strchr(t, '[');
    printf("ns_%s: %s\n", ns[i], o ? strndup(o + 1, strlen(o) - 2) : "?"); }
  int procs = 0; DIR *d = opendir("/proc"); struct dirent *e;
  if (d) { while ((e = readdir(d))) if (e->d_name[0] >= '0' && e->d_name[0] <= '9') procs++; closedir(d); }
  printf("procs_visible: %d\n", procs);
  char ents[1024] = ""; d = opendir("/"); int k = 0;
  if (d) { while ((e = readdir(d))) if (e->d_name[0] != '.') { if (k++) strcat(ents, " "); if (strlen(ents) < 900) strcat(ents, e->d_name); } closedir(d); }
  printf("root_entries: %d\n", k);
  printf("mounts: %d\n", count_lines("/proc/self/mounts", 0));
  FILE *m = fopen("/proc/self/mounts", "r"); char line[1024], fs[64] = "?";
  if (m) { while (fgets(line, sizeof line, m)) { char dev[256], mp[256], ty[64]; if (sscanf(line, "%255s %255s %63s", dev, mp, ty) == 3 && !strcmp(mp, "/")) snprintf(fs, 64, "%s", ty); } fclose(m); }
  printf("root_fs: %s\n", fs);
  char ifs[256] = ""; FILE *nd = fopen("/proc/net/dev", "r"); int ln = 0;
  if (nd) { while (fgets(line, sizeof line, nd)) if (ln++ >= 2) { char nm[64]; sscanf(line, " %63[^:]", nm); if (*ifs) strcat(ifs, ","); strcat(ifs, nm); } fclose(nd); }
  printf("net_ifaces: %s\n", ifs);
  printf("sysv_shm_segments: %d\n", count_lines("/proc/sysvipc/shm", 1));
  slurp("/proc/self/cgroup", b, sizeof b); printf("cgroup: %s\n", b);
  slurp("/sys/fs/cgroup/memory.max", b, sizeof b); printf("memory_max_visible: %s\n", b);
  slurp("/sys/fs/cgroup/pids.max", b, sizeof b); printf("pids_max_visible: %s\n", b);
  status_field("CapEff:", b, sizeof b); printf("CapEff: %s\n", b);
  status_field("NoNewPrivs:", b, sizeof b); printf("NoNewPrivs: %s\n", b);
  status_field("Seccomp:", b, sizeof b); printf("Seccomp: %s\n", b);
  fflush(stdout);
}
static void wr(const char *path, const char *s) { int fd = open(path, O_WRONLY); if (fd < 0 || write(fd, s, strlen(s)) < 0) die(path); close(fd); }
static void probe(const char *what, int r) { printf("try %s: %s\n", what, r == 0 ? "ok" : strerror(errno)); fflush(stdout); }

int main(int argc, char **argv) {
  const char *base = argc > 1 ? argv[1] : "/ctr";  // holds lower/ upper/ work/ merged/
  char p[256], opts[1024];
  setvbuf(stdout, NULL, _IOLBF, 0);
  shmget(IPC_PRIVATE, 4096, IPC_CREAT | 0600);  // one System V shared memory segment, visible until step 6
  view(0, "an ordinary process in the outer container");

  if (unshare(CLONE_NEWUTS)) die("unshare UTS");
  if (sethostname("trainer-0", 9)) die("sethostname");
  view(1, "unshare(CLONE_NEWUTS), sethostname(\"trainer-0\")");

  if (unshare(CLONE_NEWPID)) die("unshare PID");
  pid_t c = fork();
  if (c < 0) die("fork");
  if (c > 0) { int st; waitpid(c, &st, 0);
    printf("### outer: child exited, status %d%s\n", WIFEXITED(st) ? WEXITSTATUS(st) : 128 + WTERMSIG(st), WIFSIGNALED(st) ? " (signal)" : ""); return 0; }
  view(2, "unshare(CLONE_NEWPID), fork(): the child is PID 1 of the new namespace");

  snprintf(p, sizeof p, "/sys/fs/cgroup/ctr/cgroup.procs"); wr(p, "0");
  if (unshare(CLONE_NEWCGROUP)) die("unshare CGROUP");
  view(3, "join cgroup /ctr (memory.max 64 MiB, pids.max 16), unshare(CLONE_NEWCGROUP)");

  if (unshare(CLONE_NEWNS)) die("unshare NS");
  if (mount(NULL, "/", NULL, MS_REC | MS_PRIVATE, NULL)) die("make / private");
  snprintf(opts, sizeof opts, "lowerdir=%s/lower,upperdir=%s/upper,workdir=%s/work", base, base, base);
  snprintf(p, sizeof p, "%s/merged", base);
  if (mount("overlay", p, "overlay", 0, opts)) die("mount overlay");
  char q[300]; snprintf(q, sizeof q, "%s/dev", p);
  if (mount("/dev", q, NULL, MS_BIND | MS_REC, NULL)) die("bind /dev");
  snprintf(q, sizeof q, "%s/oldroot", p); mkdir(q, 0700);
  if (syscall(SYS_pivot_root, p, q)) die("pivot_root");
  if (chdir("/")) die("chdir");
  if (mount("proc", "/proc", "proc", MS_NOSUID | MS_NODEV | MS_NOEXEC, NULL)) die("mount proc");
  if (mount("cgroup2", "/sys/fs/cgroup", "cgroup2", MS_NOSUID | MS_NODEV | MS_NOEXEC, NULL)) die("mount cgroup2");
  if (mount("tmpfs", "/tmp", "tmpfs", 0, "size=16m")) die("mount tmpfs");
  if (umount2("/oldroot", MNT_DETACH)) die("umount oldroot");
  rmdir("/oldroot");
  view(4, "unshare(CLONE_NEWNS), overlay root, pivot_root, fresh /proc and /sys/fs/cgroup");

  if (unshare(CLONE_NEWNET)) die("unshare NET");
  view(5, "unshare(CLONE_NEWNET)");

  if (unshare(CLONE_NEWIPC)) die("unshare IPC");
  view(6, "unshare(CLONE_NEWIPC)");

  // Keep Docker's 14 default capabilities; drop the rest from the bounding set and the effective set.
  const int keep[] = {0, 1, 3, 4, 5, 6, 7, 8, 10, 13, 18, 27, 29, 31};
  unsigned long long mask = 0; for (unsigned i = 0; i < sizeof keep / sizeof *keep; i++) mask |= 1ULL << keep[i];
  for (int cap = 0; cap <= 40; cap++) if (!(mask >> cap & 1)) prctl(PR_CAPBSET_DROP, cap, 0, 0, 0);
  struct __user_cap_header_struct hdr = {_LINUX_CAPABILITY_VERSION_3, 0};
  struct __user_cap_data_struct data[2] = {{(unsigned)mask, (unsigned)mask, 0}, {(unsigned)(mask >> 32), (unsigned)(mask >> 32), 0}};
  if (syscall(SYS_capset, &hdr, data)) die("capset");
  view(7, "drop to Docker's 14 default capabilities (bounding, permitted, effective)");
  probe("sethostname(\"x\") without CAP_SYS_ADMIN", sethostname("x", 1));
  probe("mount tmpfs without CAP_SYS_ADMIN", mount("tmpfs", "/tmp", "tmpfs", 0, NULL));
  probe("chown /tmp/f to 1234 (CAP_CHOWN kept)", (close(open("/tmp/f", O_CREAT | O_WRONLY, 0600)), chown("/tmp/f", 1234, 1234)));

  // A seccomp filter: the classic BPF program checks the architecture, then the system call number.
  struct sock_filter f[] = {
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch)),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, MY_ARCH, 1, 0),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_mkdirat, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_unshare, 0, 1),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
  };
  struct sock_fprog prog = {sizeof f / sizeof *f, f};
  if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) die("no_new_privs");
  if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog)) die("seccomp");
  view(8, "prctl(PR_SET_NO_NEW_PRIVS), then a 9-instruction seccomp filter (mkdirat and unshare get EPERM)");
  probe("mkdir(\"/tmp/d\") under the filter", mkdir("/tmp/d", 0700));
  probe("unshare(CLONE_NEWUTS) under the filter", unshare(CLONE_NEWUTS));
  probe("getpid() under the filter", getpid() > 0 ? 0 : -1);

  printf("### S9 execve(\"/bin/sh\", \"/job.sh\"): the workload runs inside\n"); fflush(stdout);
  execl("/bin/sh", "sh", "/job.sh", (char *)NULL);
  die("execl");
}
