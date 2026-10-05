/* (a) What does crossing into the kernel cost? Nanoseconds per call, median of 7 repeats.
   - a plain function call that the compiler cannot inline (stays in user mode)
   - clock_gettime(CLOCK_MONOTONIC): served by the vDSO, in user mode, no kernel entry
   - getppid(): the cheapest real system call (enter the kernel, read one field, return)
   - read(fd, buf, 1) from /dev/zero: a real read() through the file layer
   - read(fd, buf, 4096) from a page-cache file (the same file re-read with pread)
   Build: gcc -O2 -o syscall_cost syscall_cost.c */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/syscall.h>

static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
__attribute__((noinline)) static long f(long x){__asm__ volatile("":"+r"(x));return x+1;}
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
static char buf[4096];
static int fz, ff;
typedef void (*fn)(long);
static volatile long sink;
static void k_func(long n){long s=0;for(long i=0;i<n;i++)s=f(s);sink=s;}
static void k_vdso(long n){struct timespec t;for(long i=0;i<n;i++)clock_gettime(CLOCK_MONOTONIC,&t);sink=t.tv_nsec;}
static void k_getppid(long n){long s=0;for(long i=0;i<n;i++)s+=syscall(SYS_getppid);sink=s;}
static void k_read1(long n){long s=0;for(long i=0;i<n;i++)s+=read(fz,buf,1);sink=s;}
static void k_pread4k(long n){long s=0;for(long i=0;i<n;i++)s+=pread(ff,buf,4096,0);sink=s;}
static double med(fn k,long n){double r[7];k(n/10);for(int j=0;j<7;j++){double t=now();k(n);r[j]=(now()-t)/n;}qsort(r,7,sizeof r[0],cmp);return r[3];}
int main(void){
  fz=open("/dev/zero",O_RDONLY); ff=open("/proc/self/exe",O_RDONLY);
  if(fz<0||ff<0){perror("open");return 1;}
  printf("function_call_ns %.2f\n",med(k_func,20000000));
  printf("clock_gettime_vdso_ns %.2f\n",med(k_vdso,5000000));
  printf("getppid_syscall_ns %.1f\n",med(k_getppid,2000000));
  printf("read_1B_devzero_ns %.1f\n",med(k_read1,2000000));
  printf("pread_4KiB_pagecache_ns %.1f\n",med(k_pread4k,1000000));
  return 0;
}
