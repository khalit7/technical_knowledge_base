/* Section 2: Peterson's algorithm (OSTEP 28.6), a lock built from plain loads and stores, on a real arm64 CPU.
   Build: gcc -O2 -pthread -o peterson peterson.c      Usage: ./peterson <plain|seqcst> <N>
   plain:  flag[] and turn are volatile ints (the compiler keeps every access, the CPU may still reorder them)
   seqcst: the same accesses as sequentially consistent atomics (the compiler emits the ordering instructions)
   Each thread enters the critical section N times. Inside it checks that nobody else is inside
   and does a non-atomic count = count + 1. Prints how often mutual exclusion failed. */
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static volatile int flag[2], turn, inside; static volatile long count; static long N; static int sc; static long overlap;
static void lock(int me){int other=1-me;
  if(sc){ __atomic_store_n(&flag[me],1,__ATOMIC_SEQ_CST); __atomic_store_n(&turn,other,__ATOMIC_SEQ_CST);
          while(__atomic_load_n(&flag[other],__ATOMIC_SEQ_CST)&&__atomic_load_n(&turn,__ATOMIC_SEQ_CST)==other) ; }
  else  { flag[me]=1; turn=other; while(flag[other]&&turn==other) ; }}
static void unlock(int me){ if(sc) __atomic_store_n(&flag[me],0,__ATOMIC_SEQ_CST); else flag[me]=0; }
static void *run(void *x){int me=(int)(long)x;
  for(long i=0;i<N;i++){ lock(me);
    if(inside) __atomic_fetch_add(&overlap,1,__ATOMIC_RELAXED);   /* someone else is in here too */
    inside=1; count=count+1; inside=0;
    unlock(me);}
  return 0;}
int main(int argc,char**argv){sc=!strcmp(argv[1],"seqcst");N=atol(argv[2]);
  pthread_t a,b;pthread_create(&a,0,run,(void*)0);pthread_create(&b,0,run,(void*)1);pthread_join(a,0);pthread_join(b,0);
  printf("mode %s N %ld expected %ld got %ld lost %ld overlaps_seen %ld\n",argv[1],N,2*N,count,2*N-count,overlap);
  return 0;}
