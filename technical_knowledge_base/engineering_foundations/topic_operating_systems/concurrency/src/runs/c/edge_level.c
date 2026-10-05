/* Section 9: level-triggered against edge-triggered epoll, on one pipe.
   Build: gcc -O2 -o edge_level edge_level.c        Usage: ./edge_level
   The same script runs twice, once per mode: write 10 bytes; wait; read only 4; wait again; write 1 more byte; wait;
   then drain the pipe to EAGAIN (the rule for edge-triggered mode) and wait once more. */
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/epoll.h>
#include <unistd.h>
static int ep, p[2];
static void wait_(const char *what){struct epoll_event e[4]; int n=epoll_wait(ep,e,4,0);   /* timeout 0: just ask */
  printf("  %-34s epoll_wait -> %d ready\n",what,n);}
static void run(int et){
  pipe(p); fcntl(p[0],F_SETFL,O_NONBLOCK);
  ep=epoll_create1(0); struct epoll_event e={.events=EPOLLIN|(et?EPOLLET:0),.data.fd=p[0]};
  epoll_ctl(ep,EPOLL_CTL_ADD,p[0],&e);
  printf("%s\n",et?"edge-triggered (EPOLLIN|EPOLLET)":"level-triggered (EPOLLIN)");
  char buf[64];
  write(p[1],"0123456789",10);           wait_("wrote 10 bytes");
  read(p[0],buf,4);                      wait_("read 4 (6 still waiting)");
                                         wait_("asked again, nothing changed");
  write(p[1],"x",1);                     wait_("wrote 1 more byte (7 waiting)");
  int total=0,r; while((r=read(p[0],buf,sizeof buf))>0) total+=r;
  printf("  %-34s read %d bytes, then read() = -1 %s\n","drain until EAGAIN",total,errno==EAGAIN?"EAGAIN":strerror(errno));
                                         wait_("after draining");
  close(ep); close(p[0]); close(p[1]);}
int main(void){run(0); run(1); return 0;}
