// The CUDA driver API, loaded by hand the way the runtime does it: dlopen("libcuda.so.1"), then cuInit.
#define _GNU_SOURCE
#include <stdio.h>
#include <dlfcn.h>
typedef int (*f_init)(unsigned); typedef int (*f_ver)(int*); typedef int (*f_cnt)(int*);
typedef int (*f_str)(int, const char**);
int main(void) {
  void* h = dlopen("libcuda.so.1", RTLD_NOW);
  if (!h) { printf("dlopen(libcuda.so.1) failed: %s\n", dlerror()); return 0; }
  Dl_info info; void* sym = dlsym(h, "cuInit");
  if (dladdr(sym, &info)) printf("libcuda loaded from %s\n", info.dli_fname);
  f_init cuInit = (f_init)sym; f_ver cuDriverGetVersion = (f_ver)dlsym(h, "cuDriverGetVersion");
  f_cnt cuDeviceGetCount = (f_cnt)dlsym(h, "cuDeviceGetCount");
  f_str name = (f_str)dlsym(h, "cuGetErrorName"), str = (f_str)dlsym(h, "cuGetErrorString");
  const char *a = "?", *b = "?"; int v = -1, n = -1, r;
  r = cuDriverGetVersion(&v); name(r, &a); printf("cuDriverGetVersion -> %d %s, version %d\n", r, a, v);
  r = cuInit(0); name(r, &a); str(r, &b); printf("cuInit(0)          -> %d %s: %s\n", r, a, b);
  r = cuDeviceGetCount(&n); name(r, &a); printf("cuDeviceGetCount   -> %d %s, count %d\n", r, a, n);
  return 0;
}
