// The OSTEP chapter 19 homework measurement: touch one integer on each of NPAGES pages, many times,
// and time each access. While the pages fit in the TLB an access is cheap; beyond, it costs more.
// Page i is touched at a different 64-byte line (i mod 64), so the touched lines spread over all L1 cache
// sets; touching offset 0 of every page instead fills a handful of sets and measures cache conflicts, not the TLB.
// The cache footprint still grows with the page count (64 bytes per page), so the same loop is run twice:
// on 4 KiB pages (MADV_NOHUGEPAGE) and on 2 MiB transparent huge pages (MADV_HUGEPAGE), where 512 of the
// 4 KiB pages share one TLB entry. Same addresses, same cache lines: the difference is translation.
// Then the row-major against column-major walk of one 2-D array, the access trace the simulator uses.
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <sys/mman.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
int main(int argc,char**argv){
  cpu_set_t s;CPU_ZERO(&s);CPU_SET(0,&s);sched_setaffinity(0,sizeof s,&s);
  long PG=4096; int maxp=argc>1?atoi(argv[1]):16384;
  int huge=argc>2&&argv[2][0]=='h'; size_t len=(size_t)maxp*PG, al=2u<<20;
  char*raw=mmap(0,len+al,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);
  int*a=(int*)(((unsigned long)raw+al-1)&~(al-1));   // 2 MiB aligned so huge pages can back it
  madvise(a,len,huge?MADV_HUGEPAGE:MADV_NOHUGEPAGE); memset(a,1,len);
  {FILE*f=fopen("/proc/self/smaps_rollup","r");char l[256];while(f&&fgets(l,sizeof l,f))if(!strncmp(l,"AnonHugePages",13))printf("%s pages, %s",huge?"huge":"4k",l);if(f)fclose(f);}
  int jump=PG/sizeof(int);
  for(int np=1;np<=maxp;np*=2){
    long trials=(1L<<26)/np; if(trials<20)trials=20; double best=1e9;
    for(int r=0;r<3;r++){double t0=now();for(long t=0;t<trials;t++)for(int i=0;i<np;i++)a[(long)i*jump+(i&63)*16]+=1;double dt=(now()-t0)/((double)trials*np);if(dt<best)best=dt;}
    printf("%s pages %6d ns_per_access %.3f\n",huge?"huge":"4k",np,best*1e9);
  }
  if(huge)return 0;
  // 2-D walk: N x N int32 (N=4096: 64 MiB, one row = 16 KiB = 4 pages)
  int N=4096; int*m=malloc((size_t)N*N*4); for(long i=0;i<(long)N*N;i++)m[i]=i&7;
  double best[2]={1e9,1e9};volatile long sum=0;
  for(int r=0;r<3;r++)for(int mode=0;mode<2;mode++){double t0=now();long sm=0;
    if(mode==0){for(int i=0;i<N;i++)for(int j=0;j<N;j++)sm+=m[(long)i*N+j];}
    else{for(int j=0;j<N;j++)for(int i=0;i<N;i++)sm+=m[(long)i*N+j];}
    double dt=(now()-t0)/((double)N*N);if(dt<best[mode])best[mode]=dt;sum+=sm;}
  printf("walk N %d row_major_ns %.3f col_major_ns %.3f ratio %.1f\n",N,best[0]*1e9,best[1]*1e9,best[1]/best[0]);
  return (int)(sum&1)*0;}
