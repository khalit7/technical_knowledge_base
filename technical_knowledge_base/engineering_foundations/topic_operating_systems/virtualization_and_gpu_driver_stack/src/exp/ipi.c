// Cross-CPU wake-ups and inter-processor interrupts (IPIs) inside the VM.
// Modes (CPU numbers are the VM's):
//   pipe  N A B          two processes, ping-pong one byte through two pipes; A==B means same CPU
//   spin  N A B          two threads, hand a token through one shared cache line, never sleeping
//   membar N A [B...]    membarrier(PRIVATE_EXPEDITED) from CPU A, with a spinning thread of this
//                        process on each CPU B (none: no IPI is needed); the kernel IPIs every CPU
//                        running this process and waits for each to answer
//   hog                  a busy loop (run under nice 19 to keep a CPU awake)
// After each test it prints the IPI0 (reschedule) and IPI1 (function call) counts that the test
// added on every CPU, read from /proc/interrupts.
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>
#include <sys/wait.h>
#include <sys/syscall.h>
#include <linux/membarrier.h>
#include <stdatomic.h>

static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
static void pin(int c){cpu_set_t s;CPU_ZERO(&s);CPU_SET(c,&s);if(sched_setaffinity(0,sizeof s,&s)){perror("affinity");exit(1);}}
#define MAXC 16
static long ipi[2][MAXC];int ncpu;
static void readipi(long out[2][MAXC]){FILE*f=fopen("/proc/interrupts","r");char l[1024];ncpu=0;
  while(fgets(l,sizeof l,f)){char*p=l;while(*p==' ')p++;
    if(!strncmp(p,"CPU0",4)){for(char*q=p;*q;q++)if(q[0]=='C'&&q[1]=='P'&&q[2]=='U')ncpu++;}
    int k=-1;if(!strncmp(p,"IPI0:",5))k=0;else if(!strncmp(p,"IPI1:",5))k=1;if(k<0)continue;
    p+=5;for(int c=0;c<ncpu&&c<MAXC;c++)out[k][c]=strtol(p,&p,10);}fclose(f);}
static long b4[2][MAXC];
static void ipi_start(void){readipi(b4);}
static void ipi_report(long ops){long a[2][MAXC];readipi(a);
  for(int k=0;k<2;k++){printf("  %s per op:",k?"IPI1 function-call":"IPI0 reschedule");
    for(int c=0;c<ncpu;c++)printf(" cpu%d=%.2f",c,(double)(a[k][c]-b4[k][c])/ops);printf("\n");}}

static void pipe_pp(long n,int A,int B){int p1[2],p2[2];char b=0;pipe(p1);pipe(p2);
  pid_t pid=fork();if(!pid){pin(B);for(long i=0;i<n;i++){read(p1[0],&b,1);write(p2[1],&b,1);}_exit(0);}
  pin(A);for(int i=0;i<1000;i++){write(p1[1],&b,1);read(p2[0],&b,1);} // warm up
  ipi_start();double t=now();for(long i=1000;i<n;i++){write(p1[1],&b,1);read(p2[0],&b,1);}t=now()-t;
  long m=n-1000;printf("pipe n %ld cpus %d,%d round_trip_us %.3f one_way_us %.3f\n",m,A,B,t/m/1e3,t/m/2e3);
  ipi_report(m);waitpid(pid,0,0);}

static _Atomic long tok;static long sn;static int sB;
static void*spin_peer(void*x){pin(sB);for(long i=0;i<sn;i++){while(atomic_load(&tok)!=2*i+1);atomic_store(&tok,2*i+2);}return 0;}
static void spin_pp(long n,int A,int B){pthread_t th;sn=n;sB=B;atomic_store(&tok,0);pthread_create(&th,0,spin_peer,0);pin(A);
  ipi_start();double t=now();for(long i=0;i<n;i++){atomic_store(&tok,2*i+1);while(atomic_load(&tok)!=2*i+2);}t=now()-t;
  printf("spin n %ld cpus %d,%d round_trip_us %.3f one_way_us %.3f\n",n,A,B,t/n/1e3,t/n/2e3);ipi_report(n);pthread_join(th,0);}

static _Atomic int stop;
static void*spinner(void*x){pin((int)(long)x);while(!atomic_load(&stop));return 0;}
static int membarrier(int cmd,unsigned f){return syscall(__NR_membarrier,cmd,f,0);}
static void membar(long n,int A,int nb,int*B){
  if(membarrier(MEMBARRIER_CMD_REGISTER_PRIVATE_EXPEDITED,0)){perror("register");exit(1);}
  pthread_t th[MAXC];atomic_store(&stop,0);for(int i=0;i<nb;i++)pthread_create(&th[i],0,spinner,(void*)(long)B[i]);
  pin(A);usleep(200000);
  for(int i=0;i<1000;i++)membarrier(MEMBARRIER_CMD_PRIVATE_EXPEDITED,0);
  ipi_start();double t=now();for(long i=0;i<n;i++)if(membarrier(MEMBARRIER_CMD_PRIVATE_EXPEDITED,0)){perror("membarrier");exit(1);}t=now()-t;
  printf("membar n %ld from_cpu %d spinning_peers %d us_per_call %.3f\n",n,A,nb,t/n/1e3);ipi_report(n);
  atomic_store(&stop,1);for(int i=0;i<nb;i++)pthread_join(th[i],0);}

int main(int c,char**v){
  if(!strcmp(v[1],"hog")){for(volatile unsigned long x=0;;x++);}
  long n=atol(v[2]);int A=atoi(v[3]);
  if(!strcmp(v[1],"pipe"))pipe_pp(n,A,atoi(v[4]));
  else if(!strcmp(v[1],"spin"))spin_pp(n,A,atoi(v[4]));
  else if(!strcmp(v[1],"membar")){int B[MAXC],nb=0;for(int i=4;i<c;i++)B[nb++]=atoi(v[i]);membar(n,A,nb,B);}
  return 0;}
