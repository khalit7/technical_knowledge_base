/* E9. A system call's cost, plain and under strace (ptrace stops the tracee at every entry and exit).
   Loops N getppid() calls through glibc's syscall() and prints ns per call (median of 5).
   Build: gcc -O2 -o sysc sysc.c   Run: ./sysc 200000 ; strace -f -o /dev/null ./sysc 20000 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <sys/syscall.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
int main(int c,char**v){long n=c>1?atol(v[1]):200000;double r[5];volatile long s=0;
  for(int j=0;j<5;j++){double t=now();for(long i=0;i<n;i++)s+=syscall(SYS_getppid);r[j]=(now()-t)/n;}
  qsort(r,5,sizeof r[0],cmp);printf("getppid_ns_per_call %.1f (n=%ld, median of 5)\n",r[2],n);return 0;}
