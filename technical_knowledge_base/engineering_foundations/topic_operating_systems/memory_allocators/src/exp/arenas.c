/* Arenas under a producer/consumer load like a data pipeline: 8 producer threads allocate buffers of random
   size (64 B to 64 KiB, fixed seeds), touch them and hand them to one consumer thread, which frees them.
   At most 4,096 buffers are in flight. Prints the time, peak RSS, RSS at the end (everything freed) and,
   under glibc, how many arenas malloc_stats() reports.  Usage: ./arenas [items_per_producer] */
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <malloc.h>
#include "common.h"
#define P 8
#define Q 4096
static void*qbuf[Q];static int qh,qt,qn,done;static pthread_mutex_t m=PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t ne=PTHREAD_COND_INITIALIZER,nf=PTHREAD_COND_INITIALIZER;static long per;
static void*prod(void*a){unsigned s=(unsigned)(long)a*2654435761u+1;
  for(long i=0;i<per;i++){s=s*1103515245u+12345u;size_t sz=64+((s>>8)%65473);char*b=malloc(sz);memset(b,1,sz);
    pthread_mutex_lock(&m);while(qn==Q)pthread_cond_wait(&nf,&m);qbuf[qt]=b;qt=(qt+1)%Q;qn++;pthread_cond_signal(&ne);pthread_mutex_unlock(&m);}
  return 0;}
static void*cons(void*a){long got=0,tot=per*P;(void)a;
  while(got<tot){pthread_mutex_lock(&m);while(qn==0)pthread_cond_wait(&ne,&m);void*b=qbuf[qh];qh=(qh+1)%Q;qn--;pthread_cond_signal(&nf);pthread_mutex_unlock(&m);free(b);got++;}
  return 0;}
int main(int argc,char**argv){per=argc>1?atol(argv[1]):250000;
  const char*who=getenv("LD_PRELOAD");const char*am=getenv("MALLOC_ARENA_MAX");
  double t0=now();pthread_t th[P+1];for(long i=0;i<P;i++)pthread_create(&th[i],0,prod,(void*)i);pthread_create(&th[P],0,cons,0);
  for(int i=0;i<=P;i++)pthread_join(th[i],0);double t=now()-t0;
  printf("allocator=%s arena_max=%s seconds=%.2f peak_rss_mib=%.1f end_rss_mib=%.1f\n",who&&*who?who:"glibc",am?am:"default",t,hwm_kib()/1024.0,rss_kib()/1024.0);
  fflush(stdout);if(!(who&&*who))malloc_stats();
  return 0;}
