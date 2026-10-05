/* (section 6) Two threads each add 1 to a shared counter 10,000,000 times.
   none:   plain count++ (a load, an add, a store: updates are lost when the threads interleave)
   mutex:  pthread_mutex_lock around it (a futex underneath: the kernel is entered only when contended)
   atomic: __atomic_fetch_add (one indivisible hardware instruction, no kernel)
   Prints the final count (expected 20,000,000) and ns per increment. Build: gcc -O2 -pthread -o counter counter.c */
#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#define N 10000000L
static volatile long c; static long ca; static pthread_mutex_t mu=PTHREAD_MUTEX_INITIALIZER; static int mode;
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
static void*w(void*a){(void)a;for(long i=0;i<N;i++){
  if(mode==0)c=c+1; else if(mode==1){pthread_mutex_lock(&mu);c=c+1;pthread_mutex_unlock(&mu);} else __atomic_fetch_add(&ca,1,__ATOMIC_SEQ_CST);}
  return 0;}
int main(int argc,char**argv){
  const char*names[]={"none","mutex","atomic"};
  for(mode=0;mode<3;mode++){
    if(argc>1&&strcmp(argv[1],names[mode]))continue;
    c=0;ca=0;pthread_t a,b;double t=now();
    pthread_create(&a,0,w,0);pthread_create(&b,0,w,0);pthread_join(a,0);pthread_join(b,0);
    double dt=now()-t;
    printf("%s final=%ld expected=%ld ns_per_increment=%.1f\n",names[mode],mode==2?ca:c,2*N,dt/(2*N));
  }
  return 0;
}
