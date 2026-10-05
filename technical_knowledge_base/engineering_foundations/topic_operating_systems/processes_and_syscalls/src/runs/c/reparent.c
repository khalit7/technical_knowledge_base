/* E6b. Who adopts whom: a chain me -> b -> c -> d; b exits. Linux reparents only b's direct child (c)
   to the reaper (PID 1 of the namespace, or the nearest ancestor that set PR_SET_CHILD_SUBREAPER);
   d stays c's child. (OSTEP's fork.py, by default, moves every descendant to the root.)
   Build: gcc -O2 -o reparent reparent.c */
#define _GNU_SOURCE
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
int main(void){
  int p[2]; pipe(p); pid_t me=getpid();
  pid_t b=fork();
  if(b==0){ pid_t c=fork();
    if(c==0){ pid_t d=fork();
      if(d==0){ usleep(400000); int x[2]={getpid(),getppid()}; write(p[1],x,sizeof x); sleep(1); _exit(0);} 
      usleep(400000); int x[2]={getpid(),getppid()}; write(p[1],x,sizeof x); waitpid(d,0,0); _exit(0);} 
    usleep(100000); _exit(0);}                   /* b exits early, while c and d are alive */
  close(p[1]); waitpid(b,0,0);
  printf("me %d forked b %d; b forked c, c forked d; b exited\n",me,b);
  int x[2]; while(read(p[0],x,sizeof x)==sizeof x) printf("  pid %d now has parent %d\n",x[0],x[1]);
  sleep(2); return 0;
}
