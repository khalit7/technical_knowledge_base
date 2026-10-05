/* E2. Standard signals coalesce, real-time signals queue.
   The process blocks SIGUSR1 and SIGRTMIN, sends itself N of each with kill(), then reads what is
   pending. Part A unblocks and counts handler runs. Part B reads the same thing through a signalfd.
   Build: gcc -O2 -o sigqueue sigqueue.c   Run: ./sigqueue 1000 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <unistd.h>
#include <sys/signalfd.h>
#include <sys/resource.h>
static volatile sig_atomic_t n_usr1=0,n_rt=0;
static void h(int s){ if(s==SIGUSR1)n_usr1++; else n_rt++; }  /* async-signal-safe: only touches sig_atomic_t */
int main(int c,char**v){
  int N=c>1?atoi(v[1]):1000; struct rlimit rl; getrlimit(RLIMIT_SIGPENDING,&rl);
  printf("RLIMIT_SIGPENDING soft %ld\n",(long)rl.rlim_cur);
  struct sigaction sa={0}; sa.sa_handler=h; sigemptyset(&sa.sa_mask);
  sigaction(SIGUSR1,&sa,NULL); sigaction(SIGRTMIN,&sa,NULL);
  sigset_t b; sigemptyset(&b); sigaddset(&b,SIGUSR1); sigaddset(&b,SIGRTMIN);
  sigprocmask(SIG_BLOCK,&b,NULL);
  for(int i=0;i<N;i++){kill(getpid(),SIGUSR1);kill(getpid(),SIGRTMIN);}
  sigprocmask(SIG_UNBLOCK,&b,NULL);           /* pending signals are delivered here */
  printf("A handler: sent %d SIGUSR1, handler ran %d times; sent %d SIGRTMIN, handler ran %d times\n",N,(int)n_usr1,N,(int)n_rt);
  /* Part B: same, but consume them synchronously through a signalfd (no handler runs) */
  sigprocmask(SIG_BLOCK,&b,NULL);
  int fd=signalfd(-1,&b,SFD_NONBLOCK|SFD_CLOEXEC);
  for(int i=0;i<N;i++){kill(getpid(),SIGUSR1);kill(getpid(),SIGRTMIN);}
  struct signalfd_siginfo si; int u=0,r=0;
  while(read(fd,&si,sizeof si)==sizeof si){ if(si.ssi_signo==SIGUSR1)u++; else if((int)si.ssi_signo==SIGRTMIN)r++; }
  printf("B signalfd: read %d SIGUSR1 records and %d SIGRTMIN records (sender pid field = own pid: %s)\n",u,r,si.ssi_pid==(unsigned)getpid()?"yes":"no");
  return 0;
}
