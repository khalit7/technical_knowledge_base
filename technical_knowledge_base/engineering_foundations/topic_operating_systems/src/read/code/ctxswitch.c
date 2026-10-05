/* (section 3) Cost of a context switch, measured the classic way (lmbench lat_ctx, OSTEP ch. 6 homework):
   two processes bounce one byte over two pipes. Each round trip is two switches when both are pinned to
   one CPU; on two CPUs each side wakes the other across cores instead.
   Also the cost of fork()+exit+wait() for a parent with 0 MiB and 512 MiB of touched memory
   (fork copies page tables, not pages: copy-on-write).
   Build: gcc -O2 -o ctxswitch ctxswitch.c */
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/mman.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
static void pin(int c){cpu_set_t s;CPU_ZERO(&s);CPU_SET(c,&s);sched_setaffinity(0,sizeof s,&s);}
static int cmp(const void*a,const void*b){double x=*(double*)a,y=*(double*)b;return x<y?-1:x>y;}
static double pingpong(int cpu_a,int cpu_b,int n){
  int p1[2],p2[2];char c='x';if(pipe(p1)||pipe(p2))exit(1);
  pid_t k=fork();
  if(k==0){pin(cpu_b);for(int i=0;i<n;i++){if(read(p1[0],&c,1)!=1)_exit(1);if(write(p2[1],&c,1)!=1)_exit(1);}_exit(0);}
  pin(cpu_a);
  for(int i=0;i<1000;i++){write(p1[1],&c,1);read(p2[0],&c,1);} /* warm up */
  double t=now();
  for(int i=0;i<n-1000;i++){write(p1[1],&c,1);read(p2[0],&c,1);}
  double dt=now()-t; waitpid(k,0,0);
  close(p1[0]);close(p1[1]);close(p2[0]);close(p2[1]);
  return dt/(n-1000);
}
static double forkcost(size_t mib){
  char*m=0;if(mib){m=mmap(0,mib<<20,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);memset(m,1,mib<<20);}
  double r[9];
  for(int j=0;j<9;j++){double t=now();pid_t k=fork();if(k==0)_exit(0);waitpid(k,0,0);r[j]=now()-t;}
  qsort(r,9,sizeof r[0],cmp);if(m)munmap(m,mib<<20);return r[4];
}
int main(void){
  double a[5],b[5];
  for(int j=0;j<5;j++){a[j]=pingpong(0,0,200000);b[j]=pingpong(0,1,200000);}
  qsort(a,5,sizeof a[0],cmp);qsort(b,5,sizeof b[0],cmp);
  printf("pipe_roundtrip_same_cpu_ns %.0f\n",a[2]);
  printf("context_switch_same_cpu_ns %.0f\n",a[2]/2);
  printf("pipe_roundtrip_two_cpus_ns %.0f\n",b[2]);
  printf("fork_exit_wait_0MiB_us %.1f\n",forkcost(0)/1e3);
  printf("fork_exit_wait_512MiB_us %.1f\n",forkcost(512)/1e3);
  return 0;
}
