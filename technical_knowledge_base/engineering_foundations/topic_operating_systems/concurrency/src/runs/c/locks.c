/* Sections 3 and 4: seven ways to protect one shared counter, measured.
   Build: gcc -O2 -pthread -o locks locks.c
   Usage: ./locks <impl> <threads> <acquisitions per thread> <work inside> <work outside>
   impl: spin     test-and-test-and-set spinlock on an atomic exchange (never sleeps)
         yield    the same, but sched_yield() after each failed attempt (OSTEP 28.13)
         sysc     a lock that does not track waiters, so every unlock makes a FUTEX_WAKE system call
         futex    glibc's own protocol rebuilt by hand: 0 free, 1 locked, 2 locked with waiters (counts its system calls)
         mutex    pthread_mutex_t, default type (the futex protocol above, inside glibc)
         adaptive pthread_mutex_t, PTHREAD_MUTEX_ADAPTIVE_NP (spins a while before sleeping)
         atomic   no lock: one atomic fetch-and-add per update
   "work" is a loop of empty iterations (a compiler barrier each), about 0.3 ns per iteration here.
   Prints wall time per acquisition, CPU time per acquisition (user+sys of all threads), context switches,
   and for futex and sysc the exact number of futex system calls made. */
#define _GNU_SOURCE
#include <linux/futex.h>
#include <pthread.h>
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/syscall.h>
#include <time.h>
#include <unistd.h>
static int impl, T; static long K, WI, WO;
static volatile long counter; static long acounter;
static int word;                        /* the lock word for spin, yield, sysc, futex */
static long n_wait, n_wake;             /* futex system calls made (futex, sysc) */
static pthread_mutex_t mu, amu;
static long fx(int *a,int op,int v){return syscall(SYS_futex,a,op|FUTEX_PRIVATE_FLAG,v,0,0,0);}
static inline void work(long n){for(long i=0;i<n;i++)__asm__ volatile("":::"memory");}
static inline int xchg(int *a,int v){return __atomic_exchange_n(a,v,__ATOMIC_ACQUIRE);}
static void lock(void){
  switch(impl){
  case 0: for(;;){ if(!xchg(&word,1)) return; while(__atomic_load_n(&word,__ATOMIC_RELAXED)) ; } /* spin */
  case 1: while(xchg(&word,1)) sched_yield(); return;                                          /* yield */
  case 2: while(xchg(&word,1)){ __atomic_fetch_add(&n_wait,1,__ATOMIC_RELAXED); fx(&word,FUTEX_WAIT,1);} return; /* sysc */
  case 3: { int z=0; if(__atomic_compare_exchange_n(&word,&z,1,0,__ATOMIC_ACQUIRE,__ATOMIC_RELAXED)) return; /* futex: fast path */
      if(__atomic_load_n(&word,__ATOMIC_RELAXED)==2) goto wait;              /* glibc __lll_lock_wait */
      while(xchg(&word,2)!=0){ wait: __atomic_fetch_add(&n_wait,1,__ATOMIC_RELAXED); fx(&word,FUTEX_WAIT,2);} return; }
  case 4: pthread_mutex_lock(&mu); return;
  case 5: pthread_mutex_lock(&amu); return;
  }}
static void unlock(void){
  switch(impl){
  case 0: case 1: __atomic_store_n(&word,0,__ATOMIC_RELEASE); return;
  case 2: __atomic_store_n(&word,0,__ATOMIC_RELEASE); __atomic_fetch_add(&n_wake,1,__ATOMIC_RELAXED); fx(&word,FUTEX_WAKE,1); return;
  case 3: if(__atomic_exchange_n(&word,0,__ATOMIC_RELEASE)>1){ __atomic_fetch_add(&n_wake,1,__ATOMIC_RELAXED); fx(&word,FUTEX_WAKE,1);} return; /* glibc __lll_unlock */
  case 4: pthread_mutex_unlock(&mu); return;
  case 5: pthread_mutex_unlock(&amu); return;
  }}
static void *run(void *x){(void)x;
  for(long i=0;i<K;i++){
    if(impl==6){ work(WI); __atomic_fetch_add(&acounter,1,__ATOMIC_SEQ_CST); }
    else { lock(); counter=counter+1; work(WI); unlock(); }
    work(WO);}
  return 0;}
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
int main(int argc,char**argv){
  const char*names[]={"spin","yield","sysc","futex","mutex","adaptive","atomic"};
  if(argc<6){fprintf(stderr,"usage\n");return 2;}
  for(impl=0;impl<7&&strcmp(argv[1],names[impl]);impl++);
  if(impl==7){fprintf(stderr,"bad impl\n");return 2;}
  T=atoi(argv[2]);K=atol(argv[3]);WI=atol(argv[4]);WO=atol(argv[5]);
  pthread_mutex_init(&mu,0);
  pthread_mutexattr_t a;pthread_mutexattr_init(&a);pthread_mutexattr_settype(&a,PTHREAD_MUTEX_ADAPTIVE_NP);pthread_mutex_init(&amu,&a);
  pthread_t th[64];double t0=now();
  for(int i=0;i<T;i++)pthread_create(&th[i],0,run,0);
  for(int i=0;i<T;i++)pthread_join(th[i],0);
  double dt=now()-t0; struct rusage ru;getrusage(RUSAGE_SELF,&ru);
  double cpu=(ru.ru_utime.tv_sec+ru.ru_stime.tv_sec)*1e9+(ru.ru_utime.tv_usec+ru.ru_stime.tv_usec)*1e3;
  double sys=ru.ru_stime.tv_sec*1e9+ru.ru_stime.tv_usec*1e3;
  long got=impl==6?acounter:counter, n=(long)T*K;
  printf("impl %s threads %d acq %ld correct %s wall_ns_per_acq %.1f cpu_ns_per_acq %.1f sys_share %.2f vcsw %ld ivcsw %ld futex_wait %ld futex_wake %ld\n",
    names[impl],T,n,got==n?"yes":"NO",dt/n,cpu/n,cpu>0?sys/cpu:0,ru.ru_nvcsw,ru.ru_nivcsw,n_wait,n_wake);
  return 0;}
