/* Section 1: what a thread is. Build: gcc -O2 -pthread -o threads threads.c
   ./threads one   : create one thread (run under strace to see clone3/clone, the stack mmap and the guard page)
   ./threads       : thread-local storage addresses, default stack and guard size, and the cost of create+join */
#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/syscall.h>
static __thread int tls_var;          /* one copy per thread */
static int shared_var;                /* one copy per process */
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
static void *show(void *a){
  tls_var=(int)(long)a;
  printf("thread %ld: pid %d tid %ld  &tls_var %p  &shared_var %p  stack near %p\n",(long)a,getpid(),(long)syscall(SYS_gettid),(void*)&tls_var,(void*)&shared_var,(void*)&a);
  return 0;}
static void *nothing(void *a){return a;}
static double cost(size_t stack,int n){
  pthread_attr_t at;pthread_attr_init(&at);if(stack)pthread_attr_setstacksize(&at,stack);
  double best=1e18;
  for(int r=0;r<5;r++){double t=now();
    for(int i=0;i<n;i++){pthread_t th;pthread_create(&th,&at,nothing,0);pthread_join(th,0);}
    double d=(now()-t)/n;if(d<best)best=d;}
  return best;}
int main(int argc,char**argv){
  if(argc>1&&!strcmp(argv[1],"one")){pthread_t t;pthread_create(&t,0,nothing,0);pthread_join(t,0);return 0;}
  show((void*)0);
  pthread_t t[2];for(long i=1;i<=2;i++){pthread_create(&t[i-1],0,show,(void*)i);pthread_join(t[i-1],0);}
  pthread_attr_t at;pthread_attr_init(&at);size_t ss,gs;
  pthread_getattr_default_np(&at);pthread_attr_getstacksize(&at,&ss);pthread_attr_getguardsize(&at,&gs);
  printf("default stack %zu KiB, guard %zu bytes\n",ss/1024,gs);
  printf("create+join, default stack: %.1f us (best of 5 x 2000)\n",cost(0,2000)/1e3);
  printf("create+join, 64 KiB stack:  %.1f us (best of 5 x 2000)\n",cost(64*1024,2000)/1e3);
  return 0;}
