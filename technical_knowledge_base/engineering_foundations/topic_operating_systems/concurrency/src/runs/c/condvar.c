/* Section 5: OSTEP chapter 30's producer/consumer on a one-slot buffer, 1 producer and 2 consumers, N items.
   Build: gcc -O2 -pthread -o condvar condvar.c      Usage: ./condvar <if|while|onecond> <N>
   if:      consumers test the condition with if (wrong under Mesa semantics: woken is not "condition true")
   while:   the textbook fix: re-test in a while loop after every wake-up; two condition variables
   onecond: while loops but ONE condition variable for both "empty" and "full" (OSTEP's second bug)
   The program never crashes on purpose: it counts consumers that woke to an empty buffer ("would have
   read garbage"), counts re-checks, and reports a hang if nothing moves for 2 s. */
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
static int full; static long N, consumed, empty_reads, rechecks, produced; static int mode; static volatile int finished;
static pthread_mutex_t m=PTHREAD_MUTEX_INITIALIZER; static pthread_cond_t fill=PTHREAD_COND_INITIALIZER, emptyc=PTHREAD_COND_INITIALIZER;
#define FILLC (&fill)                    /* consumers wait here, producer signals it */
#define EMPTYC (mode==2?&fill:&emptyc)  /* onecond: the producer waits on the same variable */
static void *producer(void *x){(void)x;
  for(long i=0;i<N;i++){ pthread_mutex_lock(&m);
    while(full){ pthread_cond_wait(EMPTYC,&m); }
    full=1; produced++; pthread_cond_signal(FILLC); pthread_mutex_unlock(&m);}
  return 0;}
static void *consumer(void *x){(void)x;
  for(;;){ pthread_mutex_lock(&m);
    if(mode==0){ if(!full && consumed<N) pthread_cond_wait(FILLC,&m); }
    else { while(!full && consumed<N){ pthread_cond_wait(FILLC,&m); if(!full && consumed<N) rechecks++; } }
    if(consumed>=N){ pthread_cond_broadcast(FILLC); pthread_mutex_unlock(&m); return 0; }
    if(!full){ empty_reads++; pthread_mutex_unlock(&m); continue; }   /* with if: woke up, slot empty */
    full=0; consumed++;
    if(consumed>=N) pthread_cond_broadcast(FILLC);
    pthread_cond_signal(EMPTYC); pthread_mutex_unlock(&m);}
}
int main(int argc,char**argv){
  mode=!strcmp(argv[1],"while")?1:!strcmp(argv[1],"onecond")?2:0; N=atol(argv[2]);
  pthread_t p,c1,c2; pthread_create(&p,0,producer,0); pthread_create(&c1,0,consumer,0); pthread_create(&c2,0,consumer,0);
  long last=-1; int still=0;
  for(;;){ usleep(100000); pthread_mutex_lock(&m); long cur=consumed+produced; pthread_mutex_unlock(&m);
    if(consumed>=N) break;
    if(cur!=last){ still=0; last=cur; continue; }
    if(++still>=20){ printf("mode %s N %ld HANG: no progress for 2 s, all threads asleep, produced %ld consumed %ld\n",argv[1],N,produced,consumed); fflush(stdout); _exit(0); } }
  pthread_join(p,0); pthread_join(c1,0); pthread_join(c2,0);
  printf("mode %s N %ld consumed %ld woke_to_empty_slot %ld rechecks %ld\n",argv[1],N,consumed,empty_reads,rechecks);
  return 0;}
