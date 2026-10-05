/* Section 9: what one "which of my file descriptors are ready?" question costs, as the number watched grows.
   Build: gcc -O2 -o evloop evloop.c        Usage: ./evloop
   N pipes are open and watched for reading; exactly one has a byte waiting (never read, so it stays ready).
   select and poll pass the whole list into the kernel on every call and the kernel checks every entry;
   epoll keeps the list in the kernel (epoll_ctl once) and epoll_wait only looks at its ready list.
   Prints ns per call (best of 3 batches) for each N. select cannot watch a descriptor numbered 1024 or more. */
#define _GNU_SOURCE
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/epoll.h>
#include <sys/resource.h>
#include <sys/select.h>
#include <time.h>
#include <unistd.h>
static double now(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e9+t.tv_nsec;}
int main(void){
  struct rlimit rl={40000,40000}; setrlimit(RLIMIT_NOFILE,&rl);
  int Ns[]={1,10,100,300,500,1000,3000,10000}; int nN=sizeof Ns/sizeof*Ns;
  printf("FD_SETSIZE %d\n",FD_SETSIZE);
  for(int k=0;k<nN;k++){int N=Ns[k];
    int *rd=malloc(N*sizeof(int)),*wr=malloc(N*sizeof(int)); int maxfd=0;
    for(int i=0;i<N;i++){int p[2]; if(pipe(p)){perror("pipe");return 1;} rd[i]=p[0]; wr[i]=p[1]; if(p[0]>maxfd)maxfd=p[0]; if(i==N-1) write(p[1],"x",1);}
    int reps=N>=3000?2000:20000; double bs=-1,bp=1e18,be=1e18;
    /* select */
    if(maxfd<FD_SETSIZE){ bs=1e18; for(int r=0;r<3;r++){double t=now();
      for(int j=0;j<reps;j++){fd_set s;FD_ZERO(&s);for(int i=0;i<N;i++)FD_SET(rd[i],&s);struct timeval tv={0,0};
        if(select(maxfd+1,&s,0,0,&tv)!=1){fprintf(stderr,"select?\n");return 1;}}
      double d=(now()-t)/reps; if(d<bs)bs=d;} }
    /* poll */
    struct pollfd *pf=malloc(N*sizeof *pf); for(int i=0;i<N;i++){pf[i].fd=rd[i];pf[i].events=POLLIN;}
    for(int r=0;r<3;r++){double t=now();
      for(int j=0;j<reps;j++){ if(poll(pf,N,0)!=1){fprintf(stderr,"poll?\n");return 1;} }
      double d=(now()-t)/reps; if(d<bp)bp=d;}
    /* epoll */
    int ep=epoll_create1(0); for(int i=0;i<N;i++){struct epoll_event e={.events=EPOLLIN,.data.fd=rd[i]}; epoll_ctl(ep,EPOLL_CTL_ADD,rd[i],&e);}
    struct epoll_event out[16];
    for(int r=0;r<3;r++){double t=now();
      for(int j=0;j<reps;j++){ if(epoll_wait(ep,out,16,0)!=1){fprintf(stderr,"epoll?\n");return 1;} }
      double d=(now()-t)/reps; if(d<be)be=d;}
    if(bs<0) printf("N %d maxfd %d select_ns impossible poll_ns %.0f epoll_ns %.0f\n",N,maxfd,bp,be);
    else printf("N %d maxfd %d select_ns %.0f poll_ns %.0f epoll_ns %.0f\n",N,maxfd,bs,bp,be);
    close(ep); for(int i=0;i<N;i++){ close(rd[i]); close(wr[i]); } free(rd); free(wr); free(pf);
  }
  return 0;}
