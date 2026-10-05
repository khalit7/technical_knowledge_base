// Context-switch cost, the lmbench lat_ctx way (OSTEP ch. 6 homework).
// Two processes pass one byte back and forth over two pipes. When both are pinned
// to the same CPU, every hand-off is a context switch. A single process writing and
// reading its own pipe gives the system-call cost without any switch, to subtract.
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <sys/wait.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
static void pin(int cpu){cpu_set_t s;CPU_ZERO(&s);CPU_SET(cpu,&s);if(sched_setaffinity(0,sizeof s,&s)){perror("affinity");exit(1);}}
int main(int argc,char**argv){
  int n=argc>1?atoi(argv[1]):200000, cpuA=argc>2?atoi(argv[2]):0, cpuB=argc>3?atoi(argv[3]):0;
  char c='x'; int p[2]; pin(cpuA);
  // 1. one process, its own pipe: write 1 byte then read it back (2 system calls, no switch)
  if(pipe(p))return 1; double t0=now();
  for(int i=0;i<n;i++){if(write(p[1],&c,1)!=1||read(p[0],&c,1)!=1)return 1;}
  double self=(now()-t0)/n; close(p[0]);close(p[1]);
  // 2. two processes ping-pong
  int a[2],b[2]; if(pipe(a)||pipe(b))return 1;
  pid_t k=fork();
  if(k==0){pin(cpuB);for(int i=0;i<n;i++){if(read(a[0],&c,1)!=1||write(b[1],&c,1)!=1)_exit(1);}_exit(0);}
  usleep(20000); t0=now();
  for(int i=0;i<n;i++){if(write(a[1],&c,1)!=1||read(b[0],&c,1)!=1)return 1;}
  double rt=(now()-t0)/n; waitpid(k,0,0);
  // a round trip is 2 writes + 2 reads (= 2 x 'self') plus 2 hand-offs between processes
  printf("cpus %d,%d round_trip_us %.3f self_pipe_us %.3f per_switch_us %.3f\n",cpuA,cpuB,rt*1e6,self*1e6,(rt-2*self)/2*1e6);
  return 0;}
