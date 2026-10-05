// OSTEP chapter 26's counter: two threads each add 1 to a shared counter N times.
// none: count = count + 1 (a load, an add, a store; volatile so the compiler keeps all three)
// mutex: the same inside pthread_mutex_lock/unlock
// atomic: __atomic_fetch_add (one indivisible read-modify-write instruction)
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
static volatile long count; static long N; static int mode; static pthread_mutex_t mu=PTHREAD_MUTEX_INITIALIZER;
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
static void*worker(void*x){(void)x;
  if(mode==0)for(long i=0;i<N;i++)count=count+1;
  else if(mode==1)for(long i=0;i<N;i++){pthread_mutex_lock(&mu);count=count+1;pthread_mutex_unlock(&mu);}
  else for(long i=0;i<N;i++)__atomic_fetch_add(&count,1,__ATOMIC_SEQ_CST);
  return 0;}
int main(int argc,char**argv){
  N=argc>2?atol(argv[2]):10000000; const char*m=argc>1?argv[1]:"none";
  mode=!strcmp(m,"mutex")?1:!strcmp(m,"atomic")?2:0;
  pthread_t t[2];count=0;double t0=now();
  for(int i=0;i<2;i++)pthread_create(&t[i],0,worker,0);
  for(int i=0;i<2;i++)pthread_join(t[i],0);
  double dt=now()-t0;
  printf("mode %s N %ld expected %ld got %ld lost %ld ms %.1f\n",m,N,2*N,count,2*N-count,dt*1e3);
  return 0;}
