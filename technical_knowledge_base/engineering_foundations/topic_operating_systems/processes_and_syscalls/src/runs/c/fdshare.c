/* E4. After fork, parent and child share the open file description, so they share one file offset.
   Case 1: open once, then fork; parent writes "PARENT\n" 3 times, child writes "child\n" 3 times.
   Case 2: parent and child each open() the same path themselves (separate descriptions, separate offsets).
   Then the stdio trap: printf without a newline, fork, both exit(): the buffered text is written twice.
   Build: gcc -O2 -o fdshare fdshare.c   Run: ./fdshare /tmp/x  (stdout redirected to a file) */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/wait.h>
static void dump(const char*path,const char*title){char b[512];int fd=open(path,O_RDONLY);int n=read(fd,b,sizeof b-1);b[n<0?0:n]=0;close(fd);
  fprintf(stderr,"--- %s (%d bytes)\n%s",title,n,b);}
static void wr(int fd,const char*s){for(int i=0;i<3;i++){write(fd,s,strlen(s));usleep(20000);}}
int main(int c,char**v){
  const char*p=c>1?v[1]:"/tmp/fdshare.txt";
  int fd=open(p,O_WRONLY|O_CREAT|O_TRUNC,0644);
  pid_t k=fork(); if(k==0){usleep(10000);wr(fd,"child\n");_exit(0);} wr(fd,"PARENT\n"); waitpid(k,0,0); close(fd);
  dump(p,"case 1: one open(), then fork: shared offset");
  fd=open(p,O_WRONLY|O_CREAT|O_TRUNC,0644); close(fd);
  k=fork(); if(k==0){int f=open(p,O_WRONLY);usleep(10000);wr(f,"child\n");_exit(0);} 
  fd=open(p,O_WRONLY); wr(fd,"PARENT\n"); waitpid(k,0,0); close(fd);
  dump(p,"case 2: each process calls open(): two offsets, overwrites");
  /* stdio: */
  printf("buffered line from pid %d ",(int)getpid());   /* no newline, not flushed */
  k=fork();
  if(k==0){ printf("(child)\n"); exit(0); }               /* exit() flushes the child's copy */
  waitpid(k,0,0); printf("(parent)\n"); return 0;            /* return from main flushes the parent's copy */
}
