/* Cost of one malloc + free, by size and allocator. Pattern A: malloc, touch one byte, free, repeated
   (the allocator's fast path: glibc's tcache, jemalloc's and mimalloc's thread caches). Pattern B: 1,000
   mallocs then 1,000 frees (beyond glibc's 7-entry tcache bins). Prints nanoseconds per malloc+free pair,
   best of 5 runs.  Usage: ./bench [threads] */
#include <pthread.h>
#include <stdlib.h>
#include "common.h"
static size_t SZ;static int PAT;static long IT;
static void*work(void*a){(void)a;static __thread char*v[1000];
  if(PAT==0){for(long i=0;i<IT;i++){char*p=malloc(SZ);p[0]=1;__asm__ volatile(""::"r"(p):"memory");free(p);}}
  else{for(long r=0;r<IT/1000;r++){for(int i=0;i<1000;i++){v[i]=malloc(SZ);v[i][0]=1;}for(int i=0;i<1000;i++)free(v[i]);}}
  return 0;}
int main(int argc,char**argv){int T=argc>1?atoi(argv[1]):1;const char*who=getenv("LD_PRELOAD");
  size_t sizes[]={16,256,4096,65536,1<<20};
  for(PAT=0;PAT<2;PAT++)for(unsigned k=0;k<5;k++){SZ=sizes[k];IT=SZ>=65536?200000:2000000;double best=1e9;
    for(int rep=0;rep<5;rep++){pthread_t th[16];double t0=now();for(int i=0;i<T;i++)pthread_create(&th[i],0,work,0);for(int i=0;i<T;i++)pthread_join(th[i],0);
      double ns=(now()-t0)*1e9/IT;if(ns<best)best=ns;}
    printf("allocator=%s threads=%d pattern=%s size=%zu ns_per_pair=%.1f\n",who&&*who?who:"glibc",T,PAT?"batch1000":"pairs",SZ,best);fflush(stdout);}
  return 0;}
