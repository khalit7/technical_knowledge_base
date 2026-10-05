/* E5. The leaked-descriptor hang. The parent makes a pipe, starts a reader child that reads to EOF,
   then starts an unrelated long-lived helper ("sleep 2") with fork+exec, then closes its own write end.
   EOF needs EVERY write end closed. Without O_CLOEXEC the helper inherited a write end, so the reader
   waits until the helper exits. With pipe2(O_CLOEXEC) the write end vanishes at the helper's execve.
   Build: gcc -O2 -o cloexec cloexec.c   Run: ./cloexec 0 ; ./cloexec 1 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <time.h>
#include <unistd.h>
#include <sys/wait.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec/1e9;}
int main(int c,char**v){
  int ce=c>1&&atoi(v[1]); int p[2]; if(ce)pipe2(p,O_CLOEXEC); else pipe(p);
  double t0=now();
  pid_t r=fork();
  if(r==0){ close(p[1]); char b[64]; long tot=0; ssize_t n; while((n=read(p[0],b,sizeof b))>0)tot+=n;
    printf("reader: got %ld bytes then EOF after %.3f s\n",tot,now()-t0); fflush(stdout); _exit(0);} 
  /* the reader closes its own copy of the write end; the reader's copy of p[1] is closed above */
  pid_t hpid=fork();
  if(hpid==0){ close(p[0]); if(ce){} /* nothing: with O_CLOEXEC the exec closes p[1] for us */
    execlp("sleep","sleep","2",(char*)NULL); _exit(127);} 
  close(p[0]); write(p[1],"hello\n",6); close(p[1]);
  printf("parent (%s): wrote 6 bytes, closed its write end at %.3f s\n",ce?"pipe2 O_CLOEXEC":"pipe, no CLOEXEC",now()-t0); fflush(stdout);
  waitpid(r,0,0); waitpid(hpid,0,0); return 0;
}
