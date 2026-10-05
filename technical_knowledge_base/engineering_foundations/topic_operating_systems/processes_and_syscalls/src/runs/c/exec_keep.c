/* E14. What survives execve? Before exec: fd 5 open without O_CLOEXEC, fd 6 with O_CLOEXEC,
   SIGUSR1 caught by a handler, SIGUSR2 ignored, SIGHUP blocked. After exec, the new program (showself.c, which
   changes nothing) prints its own signal masks and open descriptors. (A first version exec'd /bin/sh, but dash
   clears the signal mask and installs its own handlers at startup, which hid what exec itself keeps.) PID is printed before and after.
   Build: gcc -O2 -o exec_keep exec_keep.c */
#define _GNU_SOURCE
#include <stdio.h>
#include <fcntl.h>
#include <signal.h>
#include <unistd.h>
static void h(int s){(void)s;}
int main(int c,char**v){
  int a=open("/etc/hostname",O_RDONLY); dup2(a,5); close(a);
  int b=open("/etc/hostname",O_RDONLY|O_CLOEXEC); dup3(b,6,O_CLOEXEC); close(b);
  signal(SIGUSR1,h); signal(SIGUSR2,SIG_IGN);
  sigset_t m; sigemptyset(&m); sigaddset(&m,SIGHUP); sigprocmask(SIG_BLOCK,&m,NULL);
  printf("before exec: pid %d; fd 5 (no CLOEXEC), fd 6 (CLOEXEC); SIGUSR1 handled, SIGUSR2 ignored, SIGHUP blocked\n",getpid());
  fflush(stdout);
  execl(c>1?v[1]:"./showself","showself",(char*)NULL);
  return 1;
}
