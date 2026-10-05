/* Section 4: how long does it take one thread to wake another? Two threads pass a turn back and forth N times.
   Build: gcc -O2 -pthread -o pingpong pingpong.c      Usage: ./pingpong <futex|condvar|spin> <N>
   futex:   wait with FUTEX_WAIT until it is my turn, FUTEX_WAKE the other thread (both sleep in the kernel)
   condvar: pthread_mutex_t + pthread_cond_t, the textbook way
   spin:    busy-wait on an atomic load (never enters the kernel; needs a CPU per thread)
   Prints the round-trip time (two hand-offs) and the context switches. */
#define _GNU_SOURCE
#include <linux/futex.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <time.h>
#include <unistd.h>
static int mode; static long N; static int turn;      /* whose turn: 0 or 1 */
static pthread_mutex_t m=PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t c=PTHREAD_COND_INITIALIZER;
static long fx(int *a,int op,int v){return syscall(SYS_futex,a,op|FUTEX_PRIVATE_FLAG,v,0,0,0);}
static void *player(void *x){int me=(int)(long)x;
  for(long i=0;i<N;i++){
    if(mode==0){ int t; while((t=__atomic_load_n(&turn,__ATOMIC_ACQUIRE))!=me) fx(&turn,FUTEX_WAIT,t);
                 __atomic_store_n(&turn,1-me,__ATOMIC_RELEASE); fx(&turn,FUTEX_WAKE,1); }
    else if(mode==1){ pthread_mutex_lock(&m); while(turn!=me) pthread_cond_wait(&c,&m); turn=1-me; pthread_cond_signal(&c); pthread_mutex_unlock(&m); }
    else { while(__atomic_load_n(&turn,__ATOMIC_ACQUIRE)!=me) ; __atomic_store_n(&turn,1-me,__ATOMIC_RELEASE); }
  }
  return 0;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
int main(int argc,char**argv){
  const char*nm[]={"futex","condvar","spin"};
  for(mode=0;mode<3&&strcmp(argv[1],nm[mode]);mode++){}
  N=atol(argv[2]);
  pthread_t a,b;double t=now();
  pthread_create(&a,0,player,(void*)0);pthread_create(&b,0,player,(void*)1);pthread_join(a,0);pthread_join(b,0);
  double dt=now()-t;struct rusage ru;getrusage(RUSAGE_SELF,&ru);
  printf("mode %s N %ld round_trip_us %.2f vcsw %ld ivcsw %ld\n",nm[mode],N,dt/N/1e3,ru.ru_nvcsw,ru.ru_nivcsw);
  return 0;}
