/* Fragmentation, measured. 400,000 blocks of 256 bytes are allocated and touched (about 100 MiB), then all but
   every 64th are freed: 1.6 MB stays live, scattered through the whole heap. Resident memory (RSS) is printed
   after each phase; under glibc, mallinfo2() says how much the allocator holds as free, then malloc_trim(0)
   hands the free pages in the middle back with madvise(MADV_DONTNEED) (malloc.c mtrim, lines 5035 to 5089).
   Usage: ./frag [keep_every]   (default 64). Run with LD_PRELOAD=<other allocator> to compare. */
#include <stdlib.h>
#include <string.h>
#include <malloc.h>
#include <dlfcn.h>
#include "common.h"
#define N 400000
#define SZ 256
static char*p[N];
static void report(const char*phase,long live){
  printf("%-34s rss_kib=%7ld live_kib=%6ld",phase,rss_kib(),live/1024);
  struct mallinfo2 mi=mallinfo2();
  if(mi.arena) printf(" glibc_heap_kib=%7zu in_use_kib=%7zu free_kib=%7zu",mi.arena/1024,mi.uordblks/1024,mi.fordblks/1024);
  printf("\n");fflush(stdout);
}
int main(int argc,char**argv){
  int keep=argc>1?atoi(argv[1]):64;
  const char*who=getenv("LD_PRELOAD");printf("allocator=%s keep_every=%d\n",who&&*who?who:"glibc",keep);
  report("start",0);
  for(int i=0;i<N;i++){p[i]=malloc(SZ);memset(p[i],i,SZ);}
  report("allocated 400,000 x 256 B",(long)N*SZ);
  long live=0;for(int i=0;i<N;i++){if(i%keep){free(p[i]);p[i]=0;}else live+=SZ;}
  report("freed all but every 64th",live);
  struct timespec ts={12,0};nanosleep(&ts,0);
  void*q=malloc(64);free(q);  /* one call after 12 s lets time-based purging (jemalloc decay) run */
  report("12 s later, after one malloc/free",live);
  int r=malloc_trim(0);
  char b[64];snprintf(b,sizeof b,"malloc_trim(0) returned %d",r);report(b,live);
  for(int i=0;i<N;i++)if(p[i]){free(p[i]);p[i]=0;}
  report("freed everything",0);
  struct timespec t3={3,0};nanosleep(&t3,0);q=malloc(64);free(q);
  report("3 s later, after one malloc/free",0);
  return 0;
}
