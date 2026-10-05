// Pages and mmap. Part 1: fresh memory costs a page fault the first time each 16 KB page is touched.
// Part 2: open a 512 MB "model file" two ways: read() it all into a buffer, or mmap it and touch a little.
// Usage: mmap_demo <file>   (the file is made by run_all.sh in the scratch folder, never in the repo)
#include "bench.h"
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cstdint>
#include <cstdlib>
#include <vector>
#include <algorithm>
#include <cstring>

static long minflt() { rusage u; getrusage(RUSAGE_SELF, &u); return u.ru_minflt; }
static long majflt() { rusage u; getrusage(RUSAGE_SELF, &u); return u.ru_majflt; }
static long maxrss_mb() { rusage u; getrusage(RUSAGE_SELF, &u); return u.ru_maxrss >> 20; }   // macOS reports bytes

int main(int argc, char** argv) {
  prefer_pcore();
  long page = sysconf(_SC_PAGESIZE);
  std::printf("page size: %ld bytes\n", page);
  // Part 1: fill 256 MB of fresh memory twice; only the first fill pays one page fault per 16 KB page
  size_t n = size_t(256) << 20;
  std::vector<double> firsts, seconds; long faults = 0;
  for (int rep = 0; rep < 5; ++rep) {
    char* p = (char*)mmap(nullptr, n, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANON, -1, 0);
    long f0 = minflt(); double t0 = now_s();
    std::memset(p, 1, n);
    firsts.push_back(now_s() - t0); faults = minflt() - f0;
    t0 = now_s();
    std::memset(p, 2, n);
    seconds.push_back(now_s() - t0);
    keep(p[n / 2]);
    munmap(p, n);
  }
  std::sort(firsts.begin(), firsts.end()); std::sort(seconds.begin(), seconds.end());
  std::printf("fill fresh 256 MB (median of 5): first time %.1f ms (%ld page faults), second time %.1f ms; the faults cost about %.2f us each\n",
              firsts[2] * 1e3, faults, seconds[2] * 1e3, (firsts[2] - seconds[2]) / faults * 1e6);
  if (argc < 2) return 0;
  // Part 2: the file
  int fd = open(argv[1], O_RDONLY); struct stat st; fstat(fd, &st); size_t sz = st.st_size;
  double t0 = now_s(); long f0 = minflt(), j0 = majflt();
  void* m = mmap(nullptr, sz, PROT_READ, MAP_PRIVATE, fd, 0);
  double map_t = now_s() - t0;
  const uint8_t* b = (const uint8_t*)m; uint64_t s = 0;
  t0 = now_s();
  for (size_t i = 0; i < sz; i += sz / 8) s += b[i];             // touch 8 bytes spread over the file: 8 pages
  double touch8 = now_s() - t0; long f8 = minflt() - f0;
  std::printf("mmap %zu MB: mmap() call %.3f ms; touching 8 spread-out bytes %.3f ms (page faults so far: %ld minor, %ld major)\n",
              sz >> 20, map_t * 1e3, touch8 * 1e3, f8, majflt() - j0);
  t0 = now_s();
  for (size_t i = 0; i < sz; i += page) s += b[i];                // now touch every page
  double touchall = now_s() - t0;
  std::printf("  touching every page: %.1f ms (page faults in total: %ld minor = already in the page cache, %ld major = read from the SSD)\n",
              touchall * 1e3, minflt() - f0, majflt() - j0);
  munmap(m, sz);
  std::vector<uint8_t> buf(sz);
  t0 = now_s();
  size_t got = 0; while (got < sz) { ssize_t r = pread(fd, buf.data() + got, sz - got, got); if (r <= 0) break; got += r; }
  double read_t = now_s() - t0;
  s += buf[sz / 2];
  std::printf("read() %zu MB into a std::vector: %.1f ms before the first byte can be used; peak resident memory now %ld MB\n",
              got >> 20, read_t * 1e3, maxrss_mb());
  keep(s); close(fd);
}
